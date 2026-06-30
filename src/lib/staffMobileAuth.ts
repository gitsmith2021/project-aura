// Phase 8 (Sprint 2) — auth helper for the staff mobile API (src/app/api/staff/*).
//
// Mirrors parentMobileAuth: the mobile app sends the staff member's Supabase JWT
// (Authorization: Bearer <access_token>). Unlike parents, staff DO have an RLS
// path to their own data, so writes are performed with a *token-scoped* client —
// RLS (e.g. "cia_marks: staff manage own teaching subjects") is the authorization
// gate, not hand-written ownership checks. The server endpoint exists only to
// enforce the CF-1 toggle and write the audit log (both server-only), not to
// re-implement business logic.
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

export type StaffCtx = { userId: string; staffId: string; institutionId: string; email: string };

function bearer(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/** Resolve the active staff member from the request's Bearer token, or null. */
export async function getStaffFromBearer(req: Request): Promise<StaffCtx | null> {
  const token = bearer(req);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const { data: { user }, error } = await createSupabaseClient(url, anon).auth.getUser(token);
  if (error || !user?.email) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("staff")
    .select("id, institution_id")
    .eq("email", user.email)
    .eq("is_active", true)
    .maybeSingle();

  return data
    ? { userId: user.id, staffId: data.id as string, institutionId: data.institution_id as string, email: user.email }
    : null;
}

/** A Supabase client scoped to the staff member's JWT — reads/writes run under their RLS. */
export function staffTokenClient(req: Request): SupabaseClient | null {
  const token = bearer(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  return createSupabaseClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
