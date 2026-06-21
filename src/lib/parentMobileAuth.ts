// Phase 8F — auth helper for the parent mobile API (src/app/api/parent/*).
//
// The mobile app authenticates with the parent's Supabase JWT (Authorization:
// Bearer <access_token>), not a cookie session. Mirroring the web parent portal
// (Dev Rule 16): parents have no RLS path to their child's academic tables, so
// every read is gated here by a verified parent↔student link and then fetched
// with the service-role client.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

export type ParentCtx = { parentId: string; institutionId: string };

/** Resolve the parent from the request's Bearer token, or null if invalid. */
export async function getParentFromBearer(req: Request): Promise<ParentCtx | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  // Validate the JWT and resolve the user.
  const { data: { user }, error } = await createSupabaseClient(url, anon).auth.getUser(token);
  if (error || !user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("parents")
    .select("id, institution_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ? { parentId: data.id as string, institutionId: data.institution_id as string } : null;
}

/** True only if the parent is linked to this student. */
export async function parentOwnsStudent(parentId: string, studentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("parent_student_links")
    .select("id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();
  return !!data;
}
