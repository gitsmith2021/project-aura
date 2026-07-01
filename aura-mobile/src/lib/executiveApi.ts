// Phase 8 (P8.1) — executive mobile API client. Sends a question to the Aura web
// `/api/executive/ask` endpoint (which runs the CF-3 pipeline under the caller's
// RLS) and returns the composed answer for the mobile Executive Insights screen.
import { supabase } from "@/lib/supabase";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

// A trimmed mirror of the web CF-3 answer — only what the mobile screen renders.
export type MKpi = { label: string; display: string; tone?: string; delta?: { pct: number | null; dir: string; label: string } | null };
export type MColumn = { key: string; label: string; format?: string };
export type MBlock = { kind: string; [key: string]: unknown };
export type MView = { title: string; responseType: string; blocks: MBlock[]; empty: boolean };

export type MobileAnswer =
  | { ok: true; view: MView; followups: string[] }
  | { ok: false; reason: "clarify"; message: string; clarify: { prompt: string; options: { label: string; ask: string }[] } }
  | { ok: false; reason: "no_match" | "not_authorised" | "error"; message: string; suggestions?: string[] };

export async function askExecutive(institutionId: string, question: string): Promise<MobileAnswer> {
  if (!BASE) throw new Error("EXPO_PUBLIC_API_BASE_URL is not set — point it at your Aura web URL.");
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const res = await fetch(`${BASE}/api/executive/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ institutionId, question }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string })?.error ?? `Request failed (${res.status})`);
  return (json as { answer: MobileAnswer }).answer;
}
