"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { executeQueryModel } from "@/actions/dataExplorer";
import { INTENTS, intentsForRole, getIntent } from "@/lib/intelligence/registry";
import { matchIntent, extractSlots } from "@/lib/intelligence/matcher";
import { extractQuery } from "@/lib/intelligence/slotExtractor";
import { planQueries } from "@/lib/intelligence/queryPlanner";
import { composeView } from "@/lib/intelligence/composerV2";
import { buildSummary } from "@/lib/intelligence/summary";
import { buildFollowups } from "@/lib/intelligence/followups";
import { resolveValue } from "@/lib/intelligence/semantic";
import { composeDashboard, attachDeltas, formatValue } from "@/lib/intelligence/composer";
import { classifyIntent, refineSummary, extractQueryLLM, llmAvailable } from "@/lib/intelligence/llm";
import type {
  AuraAnswer, Block, ComposedView, ComputedKpi, ExtractedQuery, NamedQueryModel, Role, Slots,
} from "@/lib/intelligence/types";
import type { EntityDef, ResultRow, QueryModel } from "@/lib/dataExplorer";

// CF-3 v2 — Aura Intelligence orchestrator (general executive engine).
//
// Question → slot extraction (LLM or deterministic) → semantic value resolution
// → CF-2 Query Models → shared CF-2 executor (RLS) → Response Strategy →
// Visualization Composer (typed blocks) → grounded summary + follow-ups.
// Broad/executive questions fall back to the curated intent templates, adapted
// into the same block model. CF-2 is consumed, never modified. No generated SQL.

type Ctx = { userId: string; role: Role; institutionId: string; departmentId: string | null };

const DEPT_SCOPED_ENTITIES = new Set([
  "students", "staff", "staff_salary", "student_attendance", "research", "alumni", "budgets", "expenses", "results", "admissions", "departments",
]);
const isHodRole = (r: Role) => r === "HOD" || r === "DEPARTMENT_HEAD";

async function db() { return createClient(await cookies()); }

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

const mapEntity = (r: Record<string, unknown>): EntityDef => ({
  key: r.key as string, label: r.label as string, category: r.category as string, source: r.source as string,
  columns: (r.columns as EntityDef["columns"]) ?? [], defaultDateField: (r.default_date_field as string | null) ?? null, sortOrder: (r.sort_order as number) ?? 0,
});

async function loadCatalog(): Promise<EntityDef[]> {
  const supabase = await db();
  const { data } = await supabase
    .from("data_explorer_entities").select("key, label, category, source, columns, default_date_field, sort_order").eq("is_active", true).order("sort_order");
  return (data ?? []).map(mapEntity);
}

async function logQuestion(c: Ctx, question: string, intentId: string | null, slots: unknown, responseType: string | null, models: unknown) {
  const supabase = await db();
  await supabase.from("intelligence_queries").insert({
    institution_id: c.institutionId, user_id: c.userId, role: c.role, question, intent_id: intentId, slots, response_type: responseType, query_models: models,
  });
}

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

async function execModels(supabase: Awaited<ReturnType<typeof db>>, institutionId: string, queries: NamedQueryModel[]): Promise<Map<string, ResultRow[]>> {
  const datasets = new Map<string, ResultRow[]>();
  for (const q of queries) {
    const res = await executeQueryModel(supabase, institutionId, q.model);
    datasets.set(q.name, res.success ? res.data.rows : []);
  }
  return datasets;
}

/** Replace department_id UUIDs with department names in display rows. */
async function enrichDepartments(supabase: Awaited<ReturnType<typeof db>>, institutionId: string, rows: ResultRow[]): Promise<ResultRow[]> {
  if (!rows.some((r) => "department_id" in r)) return rows;
  const { data } = await supabase.from("departments").select("id, name").eq("institution_id", institutionId);
  const map = new Map<string, string>((data ?? []).map((d: { id: string; name: string }) => [d.id, d.name]));
  return rows.map((r) => ("department_id" in r ? { ...r, department_id: map.get(String(r.department_id)) ?? r.department_id } : r));
}

// ── Time range: reuse the tested matcher slots + a months helper ─────────────────
function monthsBack(now: Date, n: number) {
  const from = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10), label: `last ${n} months` };
}

/** Attach a date range to the extracted query from the question's time words. */
function applyTimeRange(ex: ExtractedQuery, question: string, entity: EntityDef): ExtractedQuery {
  const slots = extractSlots(question);
  const dateField = entity.defaultDateField ?? entity.columns.find((c) => c.type === "date")?.key ?? null;
  let range = slots.timeRange ? { from: slots.timeRange.from, to: slots.timeRange.to, label: slots.timeRange.label } : null;
  const m = question.toLowerCase().match(/last\s+(\d{1,2})\s+months/);
  if (m) range = monthsBack(new Date(), Number(m[1]));
  if (ex.responseHint === "TREND" && !range) range = monthsBack(new Date(), 12);
  return { ...ex, comparison: ex.comparison || slots.comparison, dateRange: range && dateField ? { field: dateField, ...range } : null };
}

/** Resolve filter values that need DB lookups (e.g. department NAME → id). */
async function resolveFilters(supabase: Awaited<ReturnType<typeof db>>, institutionId: string, ex: ExtractedQuery): Promise<ExtractedQuery> {
  const filters = [];
  for (const f of ex.filters) {
    if (f.resolve && f.rawValue) {
      const hit = await resolveValue(supabase, institutionId, ex.entity, f.column, f.rawValue);
      if (hit) filters.push({ ...f, value: hit.resolved, resolve: false });
      // unresolved → drop the filter (can't compare a name to a UUID column)
    } else {
      filters.push(f);
    }
  }
  return { ...ex, filters };
}

const kpi = (label: string, value: number | null, format: "number" | "currency" = "number"): ComputedKpi =>
  ({ label, value, display: formatValue(value, format), tone: "default" });

/** Adapt a legacy intent dashboard into the unified block model (for EXECUTIVE/broad). */
function dashboardToView(title: string, responseType: ComposedView["responseType"], datasetsSpec: ReturnType<typeof composeDashboard>): ComposedView {
  const blocks: Block[] = [];
  if (datasetsSpec.kpis.length) blocks.push({ kind: "kpiStrip", kpis: datasetsSpec.kpis });
  for (const w of datasetsSpec.widgets) blocks.push({ kind: "chart", widget: w });
  return { title, responseType, blocks, empty: datasetsSpec.empty };
}

function priorYearSlots(slots: Slots): Slots {
  if (!slots.timeRange) return slots;
  const shift = (d?: string | null) => { if (!d) return undefined; const dt = new Date(d); dt.setFullYear(dt.getFullYear() - 1); return dt.toISOString().slice(0, 10); };
  return { ...slots, timeRange: { from: shift(slots.timeRange.from), to: shift(slots.timeRange.to), label: "last year" } };
}

/** Ask Aura a question → an executive answer (typed blocks) + summary + follow-ups. */
export async function askAura(institutionId: string, question: string): Promise<AuraAnswer> {
  try {
    if (!question.trim()) return { ok: false, reason: "no_match", message: "Ask a question to begin." };
    const c = await resolveCtx(institutionId);
    if (!c) return { ok: false, reason: "not_authorised", message: "You don't have access to Aura Intelligence for this institution." };
    const supabase = await db();
    const catalog = await loadCatalog();

    // 1) Extract — LLM (catalog-constrained) then deterministic fallback.
    let ex = (llmAvailable() ? await extractQueryLLM(question, catalog) : null) ?? extractQuery(question, catalog);

    // 2) General path — a specific analytical question over one entity.
    if (ex && ex.responseHint !== "EXECUTIVE") {
      const entity = catalog.find((e) => e.key === ex!.entity)!;
      ex = applyTimeRange(ex, question, entity);
      ex = await resolveFilters(supabase, institutionId, ex);
      const plan = planQueries(ex, entity);
      if (plan) {
        const scoped = scopeToDepartment(plan.models, c);
        const datasets = await execModels(supabase, institutionId, scoped);
        if (datasets.has("list")) datasets.set("list", await enrichDepartments(supabase, institutionId, datasets.get("list")!));
        const view = composeView(plan, datasets, entity);

        // Comparison ("vs last year") — re-run stats for the prior period + deltas.
        if (ex.comparison && ex.dateRange && datasets.has("stats")) {
          const prior = { ...ex, dateRange: { ...ex.dateRange, from: shiftYear(ex.dateRange.from), to: shiftYear(ex.dateRange.to) } };
          const priorPlan = planQueries(prior, entity);
          if (priorPlan) {
            const priorDs = await execModels(supabase, institutionId, scopeToDepartment(priorPlan.models, c));
            const cur = (view.blocks.find((b) => b.kind === "kpiStrip") as Extract<Block, { kind: "kpiStrip" }> | undefined)?.kpis ?? [];
            const priorRow = (priorDs.get("stats") ?? [])[0] ?? {};
            const priorKpis: ComputedKpi[] = cur.map((k) => k.label.startsWith("Total") ? kpi(k.label, priorRow.n != null ? Number(priorRow.n) : null) : kpi(k.label, null));
            attachDeltas(cur, priorKpis, "vs last year");
          }
        }

        const summary = await maybeRefine(buildSummary(view), view, plan.title);
        const followups = buildFollowups(plan.responseType, entity, plan.numericMetric);
        await logQuestion(c, question, null, ex, plan.responseType, plan.models.map((m) => m.model));
        if (!view.empty) {
          view.blocks.push({ kind: "summary", text: summary });
          return { ok: true, intentId: null, domain: null, view, followups };
        }
      }
    }

    // 3) Intent-template path — broad/executive questions ("how is finance doing?").
    let intent = matchIntent(question, INTENTS, c.role)?.intent ?? null;
    if (!intent && llmAvailable()) {
      const permitted = intentsForRole(c.role);
      const id = await classifyIntent(question, permitted.map((i) => ({ id: i.id, title: i.title, sample: i.sample })));
      const candidate = id ? getIntent(id) : null;
      if (candidate && candidate.roles.includes(c.role)) intent = candidate;
    }
    if (intent) {
      const slots = extractSlots(question);
      const ictx = { role: c.role, institutionId, departmentId: c.departmentId };
      const built = intent.build(slots, ictx);
      const queries = scopeToDepartment(built.queries, c);
      const datasets = await execModels(supabase, institutionId, queries);
      const dash = composeDashboard(built.dashboard, datasets);
      if (slots.comparison && slots.timeRange) {
        const priorBuilt = intent.build(priorYearSlots(slots), ictx);
        const priorDs = await execModels(supabase, institutionId, scopeToDepartment(priorBuilt.queries, c));
        attachDeltas(dash.kpis, composeDashboard(priorBuilt.dashboard, priorDs).kpis, "vs last year");
      }
      const view = dashboardToView(intent.title, "EXECUTIVE", dash);
      const summary = await maybeRefine(intent.summarize(dash, slots), view, intent.title);
      view.blocks.push({ kind: "summary", text: summary });
      await logQuestion(c, question, intent.id, slots, "EXECUTIVE", built.queries.map((q) => q.model));
      return { ok: true, intentId: intent.id, domain: intent.domain, view, followups: intent.followups };
    }

    await logQuestion(c, question, null, ex, null, null);
    return {
      ok: false, reason: "no_match",
      message: "I can't answer that yet — here are questions I can help with:",
      suggestions: intentsForRole(c.role).slice(0, 6).map((i) => i.sample),
    };
  } catch (err) {
    return { ok: false, reason: "error", message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

const shiftYear = (d?: string | null) => { if (!d) return d ?? undefined; const dt = new Date(d); dt.setFullYear(dt.getFullYear() - 1); return dt.toISOString().slice(0, 10); };

/** Polish the grounded summary with the LLM (still bound to the displayed KPIs). */
async function maybeRefine(base: string, view: ComposedView, title: string): Promise<string> {
  if (!llmAvailable()) return base;
  const strip = view.blocks.find((b) => b.kind === "kpiStrip");
  const kpis = strip && strip.kind === "kpiStrip" ? strip.kpis.map((k) => ({ label: k.label, display: k.display })) : [];
  return refineSummary(base, title, kpis);
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

// Keep referenced for type-completeness of QueryModel import.
export type { QueryModel };
