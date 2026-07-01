// Phase 8 (P8.1) — auth helper for the executive mobile API (src/app/api/executive/*).
//
// Mirrors staffMobileAuth: the mobile app sends the user's Supabase JWT
// (Authorization: Bearer <access_token>). We resolve their institution_members
// row to a CF-3 PipeCtx and run the Aura Intelligence pipeline under a
// token-scoped client, so RLS is the authorization gate (an HOD only sees their
// department, an INST_ADMIN only their institution) — exactly like the web.
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PipeCtx } from "@/lib/intelligence/pipeline";
import type { Role } from "@/lib/intelligence/types";

const EXECUTIVE_ROLES = new Set(["SUPER_ADMIN", "INST_ADMIN", "PRINCIPAL", "HOD", "DEPARTMENT_HEAD"]);

function bearer(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

/** A Supabase client scoped to the caller's JWT — reads run under their RLS. */
export function executiveTokenClient(req: Request): SupabaseClient | null {
  const token = bearer(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  return createSupabaseClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Resolve an executive-tier PipeCtx from the Bearer token for one institution, or null. */
export async function getExecutiveFromBearer(req: Request, institutionId: string): Promise<PipeCtx | null> {
  const token = bearer(req);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon || !institutionId) return null;

  const { data: { user }, error } = await createSupabaseClient(url, anon).auth.getUser(token);
  if (error || !user) return null;

  const client = executiveTokenClient(req);
  if (!client) return null;
  const { data: member } = await client
    .from("institution_members").select("role, institution_id, department_id").eq("profile_id", user.id).maybeSingle();
  if (!member || !EXECUTIVE_ROLES.has(member.role as string)) return null;
  if (member.role !== "SUPER_ADMIN" && member.institution_id !== institutionId) return null;

  return { userId: user.id, role: member.role as Role, institutionId, departmentId: (member.department_id as string | null) ?? null };
}
