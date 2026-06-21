// Phase 8F — parent mobile API client. Calls the Aura web `/api/parent` endpoint
// with the parent's Supabase access token (the web verifies the parent↔child
// link and reads child data with the service role — parents have no RLS path).
import { supabase } from "@/lib/supabase";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

export type ParentChild = {
  studentId: string;
  name: string;
  rollNo: string | null;
  program: string | null;
  year: number | null;
  department: string | null;
  relationship: string;
  isPrimary: boolean;
};
export type ChildAttendanceRow = { subject: string | null; status: string | null };
export type ChildResultRow = {
  semester: number | null;
  final_percentage: number | null;
  status: string | null;
  created_at: string;
};
export type ChildFeeRow = {
  id: string;
  title: string;
  amount_due: number | null;
  concession_amount: number | null;
  net_due: number | null;
  due_date: string | null;
  status: string | null;
};

async function parentGet<T>(params: Record<string, string>): Promise<T> {
  if (!BASE) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set — point it at your Aura web URL.");
  }
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/parent?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string })?.error ?? `Request failed (${res.status})`);
  return json as T;
}

export const parentApi = {
  children: () => parentGet<{ children: ParentChild[] }>({ resource: "children" }).then((r) => r.children),
  attendance: (studentId: string) =>
    parentGet<{ rows: ChildAttendanceRow[] }>({ resource: "attendance", studentId }).then((r) => r.rows),
  results: (studentId: string) =>
    parentGet<{ rows: ChildResultRow[] }>({ resource: "results", studentId }).then((r) => r.rows),
  fees: (studentId: string) =>
    parentGet<{ rows: ChildFeeRow[] }>({ resource: "fees", studentId }).then((r) => r.rows),
};

/** Deep link to the web parent portal fees page (used for the Pay action). */
export function webFeesUrl(): string {
  return `${BASE}/parent-portal/fees`;
}
