"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { runQuery } from "@/actions/dataExplorer";
import { INTENTS, intentsForRole } from "@/lib/intelligence/registry";
import { matchIntent, extractSlots } from "@/lib/intelligence/matcher";
import { composeDashboard } from "@/lib/intelligence/composer";
import type { AuraAnswer, Role } from "@/lib/intelligence/types";
import type { ResultRow } from "@/lib/dataExplorer";

// CF-3 — Aura Intelligence orchestrator. A question → (matched intent + slots) →
// CF-2 Query Models → CF-2 runQuery (RLS, read-only) → Dashboard Composer →
// grounded summary + follow-ups. CF-2 is consumed, never modified. The LLM is an
// optional enhancement layer (not required) — this path is fully deterministic,
// so Aura Intelligence works with $0 Anthropic credit (graceful degradation).

type Ctx = { userId: string; role: Role; institutionId: string };

async function db() {
  return createClient(await cookies());
}

async function resolveCtx(institutionId: string): Promise<Ctx | null> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("institution_members").select("role, institution_id").eq("profile_id", user.id).maybeSingle();
  if (!member) return null;
  if (member.role !== "SUPER_ADMIN" && member.institution_id !== institutionId) return null;
  return { userId: user.id, role: member.role as Role, institutionId };
}

async function logQuestion(c: Ctx, question: string, intentId: string | null, slots: unknown) {
  const supabase = await db();
  await supabase.from("intelligence_queries").insert({
    institution_id: c.institutionId, user_id: c.userId, role: c.role,
    question, intent_id: intentId, slots,
  });
}

/** Ask Aura a question → an executive dashboard + summary + follow-ups. */
export async function askAura(institutionId: string, question: string): Promise<AuraAnswer> {
  try {
    if (!question.trim()) return { ok: false, reason: "no_match", message: "Ask a question to begin." };
    const c = await resolveCtx(institutionId);
    if (!c) return { ok: false, reason: "not_authorised", message: "You don't have access to Aura Intelligence for this institution." };

    const slots = extractSlots(question);
    const match = matchIntent(question, INTENTS, c.role);
    if (!match) {
      await logQuestion(c, question, null, slots);
      return {
        ok: false, reason: "no_match",
        message: "I can't answer that yet — here are questions I can help with:",
        suggestions: intentsForRole(c.role).slice(0, 6).map((i) => i.sample),
      };
    }

    const intent = match.intent;
    const { queries, dashboard } = intent.build(slots, { role: c.role, institutionId, departmentId: null });

    // Every dataset comes from CF-2 (RLS-scoped to this user/institution).
    const datasets = new Map<string, ResultRow[]>();
    for (const q of queries) {
      const res = await runQuery(institutionId, q.model);
      datasets.set(q.name, res.success ? res.data.rows : []);
    }

    const computed = composeDashboard(dashboard, datasets);
    const summary = intent.summarize(computed, slots);
    await logQuestion(c, question, intent.id, slots);

    return { ok: true, intentId: intent.id, title: intent.title, domain: intent.domain, dashboard: computed, summary, followups: intent.followups };
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
