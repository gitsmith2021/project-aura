"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { summarizeMetrics, type IntelligenceMetrics, type QueryRow } from "@/lib/intelligence/metrics";

// CF-3.1 WS5/WS6 — internal performance + usage dashboard data. SUPER_ADMIN only.
// Aggregates the question log (RLS: SUPER_ADMIN reads all). No result data stored.

type Result = { ok: true; metrics: IntelligenceMetrics } | { ok: false; error: string };

export async function getIntelligenceMetrics(institutionId?: string): Promise<Result> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Unauthorized." };
    const { data: member } = await supabase
      .from("institution_members").select("role").eq("profile_id", user.id).eq("role", "SUPER_ADMIN").maybeSingle();
    if (!member) return { ok: false, error: "Intelligence metrics are restricted to SUPER_ADMIN." };

    let q = supabase
      .from("intelligence_queries")
      .select("question, intent_id, response_type, confidence, latency_ms, path, created_at")
      .order("created_at", { ascending: false }).limit(2000);
    if (institutionId) q = q.eq("institution_id", institutionId);

    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    return { ok: true, metrics: summarizeMetrics((data ?? []) as unknown as QueryRow[]) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
