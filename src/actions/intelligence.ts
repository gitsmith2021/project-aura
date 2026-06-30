"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { runPipeline, type PipeCtx } from "@/lib/intelligence/pipeline";
import { intentsForRole } from "@/lib/intelligence/registry";
import type { AuraAnswer, Role } from "@/lib/intelligence/types";

// CF-3 / CF-3.1 — Aura Intelligence server actions. The pipeline lives in
// lib/intelligence/pipeline.ts (instrumented: trace + confidence + clarification);
// these actions handle auth, run it under the user's RLS client, and log.

async function db() { return createClient(await cookies()); }

export async function resolveCtx(institutionId: string): Promise<PipeCtx | null> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase
    .from("institution_members").select("role, institution_id, department_id").eq("profile_id", user.id).maybeSingle();
  if (!member) return null;
  if (member.role !== "SUPER_ADMIN" && member.institution_id !== institutionId) return null;
  return { userId: user.id, role: member.role as Role, institutionId, departmentId: (member.department_id as string | null) ?? null };
}

async function logQuestion(c: PipeCtx, question: string, answer: AuraAnswer) {
  const supabase = await db();
  const responseType = answer.ok ? answer.view.responseType : answer.reason;
  const intentId = answer.ok ? answer.intentId : null;
  await supabase.from("intelligence_queries").insert({
    institution_id: c.institutionId, user_id: c.userId, role: c.role, question, intent_id: intentId, response_type: responseType,
  });
}

/** Ask Aura a question → an executive answer (typed blocks) + summary + follow-ups. */
export async function askAura(institutionId: string, question: string): Promise<AuraAnswer> {
  try {
    if (!question.trim()) return { ok: false, reason: "no_match", message: "Ask a question to begin." };
    const c = await resolveCtx(institutionId);
    if (!c) return { ok: false, reason: "not_authorised", message: "You don't have access to Aura Intelligence for this institution." };
    const supabase = await db();
    const { answer } = await runPipeline(supabase, c, question);
    await logQuestion(c, question, answer);
    return answer;
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
