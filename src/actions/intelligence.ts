"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { runQuery } from "@/actions/dataExplorer";
import { INTENTS, intentsForRole } from "@/lib/intelligence/registry";
import { matchIntent, extractSlots } from "@/lib/intelligence/matcher";
import { composeDashboard, attachDeltas } from "@/lib/intelligence/composer";
import { classifyIntent, refineSummary, llmAvailable } from "@/lib/intelligence/llm";
import { getIntent } from "@/lib/intelligence/registry";
import type { AuraAnswer, NamedQueryModel, Role, Slots } from "@/lib/intelligence/types";
import type { ResultRow } from "@/lib/dataExplorer";

// CF-3 — Aura Intelligence orchestrator. A question → (matched intent + slots) →
// CF-2 Query Models → CF-2 runQuery (RLS, read-only) → Dashboard Composer →
// grounded summary + follow-ups. CF-2 is consumed, never modified. The LLM layer
// (classify + summary refine) is optional/graceful — the deterministic path works
// with $0 Anthropic credit.

type Ctx = { userId: string; role: Role; institutionId: string; departmentId: string | null };

// Entities exposing a `department_id` column — HOD/DEPARTMENT_HEAD questions are
// auto-scoped to the user's own department on these.
const DEPT_SCOPED_ENTITIES = new Set([
  "students", "staff", "student_attendance", "research", "alumni", "budgets", "expenses", "results", "admissions", "departments",
]);
const isHodRole = (r: Role) => r === "HOD" || r === "DEPARTMENT_HEAD";

async function db() {
  return createClient(await cookies());
}

async function resolveCtx(institutionId: string): Promise<Ctx | null> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("institution_members").select("role, institution_id, department_id").eq("profile_id", user.id).maybeSingle();
  if (!member) return null;
  if (member.role !== "SUPER_ADMIN" && member.institution_id !== institutionId) return null;
  return { userId: user.id, role: member.role as Role, institutionId, departmentId: (member.department_id as string | null) ?? null };
}

async function logQuestion(c: Ctx, question: string, intentId: string | null, slots: unknown) {
  const supabase = await db();
  await supabase.from("intelligence_queries").insert({
    institution_id: c.institutionId, user_id: c.userId, role: c.role, question, intent_id: intentId, slots,
  });
}

/** HOD/DEPARTMENT_HEAD: inject a department filter into queries on dept-scoped entities. */
function scopeToDepartment(queries: NamedQueryModel[], c: Ctx): NamedQueryModel[] {
  if (!c.departmentId || !isHodRole(c.role)) return queries;
  const cond = { field: "department_id", operator: "eq" as const, value: c.departmentId };
  return queries.map((q) => {
    if (!DEPT_SCOPED_ENTITIES.has(q.model.entity)) return q;
    const filters = q.model.filters
      ? { op: "and" as const, conditions: [q.model.filters, cond] }
      : { op: "and" as const, conditions: [cond] };
    return { ...q, model: { ...q.model, filters } };
  });
}

/** Shift a slot's time range back one year (for "vs last year" comparison). */
function priorYearSlots(slots: Slots): Slots {
  if (!slots.timeRange) return slots;
  const shift = (d?: string | null): string | undefined => {
    if (!d) return undefined;
    const dt = new Date(d);
    dt.setFullYear(dt.getFullYear() - 1);
    return dt.toISOString().slice(0, 10);
  };
  return { ...slots, timeRange: { from: shift(slots.timeRange.from), to: shift(slots.timeRange.to), label: "last year" } };
}

async function runQueries(institutionId: string, queries: NamedQueryModel[]): Promise<Map<string, ResultRow[]>> {
  const datasets = new Map<string, ResultRow[]>();
  for (const q of queries) {
    const res = await runQuery(institutionId, q.model);
    datasets.set(q.name, res.success ? res.data.rows : []);
  }
  return datasets;
}

/** Ask Aura a question → an executive dashboard + summary + follow-ups. */
export async function askAura(institutionId: string, question: string): Promise<AuraAnswer> {
  try {
    if (!question.trim()) return { ok: false, reason: "no_match", message: "Ask a question to begin." };
    const c = await resolveCtx(institutionId);
    if (!c) return { ok: false, reason: "not_authorised", message: "You don't have access to Aura Intelligence for this institution." };

    const slots = extractSlots(question);

    // 1) Resolve intent — deterministic matcher, then optional LLM fallback.
    let intent = matchIntent(question, INTENTS, c.role)?.intent ?? null;
    if (!intent && llmAvailable()) {
      const permitted = intentsForRole(c.role);
      const id = await classifyIntent(question, permitted.map((i) => ({ id: i.id, title: i.title, sample: i.sample })));
      const candidate = id ? getIntent(id) : null;
      if (candidate && candidate.roles.includes(c.role)) intent = candidate;
    }
    if (!intent) {
      await logQuestion(c, question, null, slots);
      return {
        ok: false, reason: "no_match",
        message: "I can't answer that yet — here are questions I can help with:",
        suggestions: intentsForRole(c.role).slice(0, 6).map((i) => i.sample),
      };
    }

    // 2) Build queries → 3) scope to the user's department (HOD) → 4) run via CF-2.
    const ictx = { role: c.role, institutionId, departmentId: c.departmentId };
    const built = intent.build(slots, ictx);
    const queries = scopeToDepartment(built.queries, c);
    const datasets = await runQueries(institutionId, queries);

    // 5) Compose.
    const dashboard = composeDashboard(built.dashboard, datasets);

    // 6) Comparison ("vs last year") — re-run the prior period + attach KPI deltas.
    if (slots.comparison && slots.timeRange) {
      const priorBuilt = intent.build(priorYearSlots(slots), ictx);
      const priorDatasets = await runQueries(institutionId, scopeToDepartment(priorBuilt.queries, c));
      const prior = composeDashboard(priorBuilt.dashboard, priorDatasets);
      attachDeltas(dashboard.kpis, prior.kpis, "vs last year");
    }

    // 7) Summary — deterministic, optionally refined by the LLM (grounded in KPIs).
    let summary = intent.summarize(dashboard, slots);
    if (llmAvailable()) {
      summary = await refineSummary(summary, intent.title, dashboard.kpis.map((k) => ({ label: k.label, display: k.display })));
    }

    await logQuestion(c, question, intent.id, slots);
    return { ok: true, intentId: intent.id, title: intent.title, domain: intent.domain, dashboard, summary, followups: intent.followups };
  } catch (err) {
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** The launcher payload: the asker's role + role-appropriate sample questions. */
export async function getLauncher(institutionId: string): Promise<{ role: Role | null; samples: string[] }> {
  const c = await resolveCtx(institutionId);
  if (!c) return { role: null, samples: [] };
  return { role: c.role, samples: intentsForRole(c.role).map((i) => i.sample) };
}

/** The asker's most recent distinct questions (for the "Recent Questions" list). */
export async function getRecentQuestions(institutionId: string): Promise<string[]> {
  const c = await resolveCtx(institutionId);
  if (!c) return [];
  const supabase = await db();
  const { data } = await supabase
    .from("intelligence_queries").select("question")
    .eq("user_id", c.userId).eq("institution_id", institutionId)
    .order("created_at", { ascending: false }).limit(25);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data ?? []) {
    const q = r.question as string;
    const key = q.trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(q); }
    if (out.length >= 6) break;
  }
  return out;
}
