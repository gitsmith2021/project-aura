"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { runPipeline } from "@/lib/intelligence/pipeline";
import { resolveCtx } from "@/actions/intelligence";
import type { AuraAnswer, Trace } from "@/lib/intelligence/types";

// CF-3.1 WS4 — Developer Lab backend. Runs the SAME pipeline as askAura but
// returns the full execution TRACE (every stage, timings, confidence). SUPER_ADMIN
// only — traces are an internal debugging tool, never exposed to end users.

type TraceResult = { ok: true; answer: AuraAnswer; trace: Trace } | { ok: false; error: string };

export async function traceAura(institutionId: string, question: string): Promise<TraceResult> {
  try {
    if (!question.trim()) return { ok: false, error: "Enter a question." };
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized." };
    const { data: member } = await supabase
      .from("institution_members").select("role").eq("profile_id", user.id).eq("role", "SUPER_ADMIN").maybeSingle();
    if (!member) return { ok: false, error: "The AI Lab is restricted to SUPER_ADMIN." };

    const c = await resolveCtx(institutionId);
    if (!c) return { ok: false, error: "No access to this institution." };

    const { answer, trace } = await runPipeline(supabase, c, question);
    return { ok: true, answer, trace };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
