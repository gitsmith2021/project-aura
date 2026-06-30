// Phase 8 (Sprint 2) — staff mobile API client. Reads (CIA components, roster,
// existing marks) go straight through supabase-js under RLS; this client is only
// for the marks-entry WRITE, which the Aura web `/api/staff/cia-marks` endpoint
// gates with the CF-1 toggle and records in the audit log.
import { supabase } from "@/lib/supabase";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export type SaveMarksInput = {
  componentId: string;
  subjectId: string | null;
  rows: { student_id: string; marks_scored: number }[];
};

export async function saveCIAMarks(input: SaveMarksInput): Promise<{ count: number }> {
  if (!BASE) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set — point it at your Aura web URL.");
  }
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const res = await fetch(`${BASE}/api/staff/cia-marks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string })?.error ?? `Request failed (${res.status})`);
  return json as { count: number };
}
