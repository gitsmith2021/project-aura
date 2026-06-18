"use server";

import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { cookies }        from "next/headers";
import { createClient }   from "@/utils/supabase/server";
import { roleLabel }      from "@/lib/roleLabel";

export async function login(formData: FormData) {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Invalid login credentials");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Invalid login credentials");

  // ── Alumni take precedence ───────────────────────────────────────────────
  // A graduated student keeps their student row + STUDENT membership, but an
  // active alumni record (created by Import Graduates) routes them to the
  // alumni portal instead. Checked first so it wins over the student fallback.
  const { data: alumnusRow } = await supabase
    .from("alumni")
    .select("id")
    .eq("profile_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (alumnusRow) {
    const cookieOpts = {
      path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };
    cookieStore.set("aura-role", "alumni", { ...cookieOpts, httpOnly: true });
    cookieStore.set("aura-role-label", "Alumnus", { ...cookieOpts, httpOnly: false });
    revalidatePath("/", "layout");
    redirect("/alumni-portal");
  }

  // ── Parents route to the parent portal ───────────────────────────────────
  const { data: parentRow } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (parentRow) {
    const cookieOpts = {
      path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    };
    cookieStore.set("aura-role", "parent", { ...cookieOpts, httpOnly: true });
    cookieStore.set("aura-role-label", "Parent", { ...cookieOpts, httpOnly: false });
    revalidatePath("/", "layout");
    redirect("/parent-portal");
  }

  // ── Determine role: HOD/Admin → Staff → Student ──────────────────────────
  const { data: memberRow } = await supabase
    .from("institution_members")
    .select("role, institution_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  let role: "staff" | "admin" | "student" | "hod" | null = null;
  let memberRole: string | undefined = memberRow?.role;

  if (memberRow) {
    // PRINCIPAL shares the "admin" access tier (institution-wide); its distinct
    // identity is carried by the aura-role-label cookie set below.
    if (memberRow.role === "SUPER_ADMIN" || memberRow.role === "INST_ADMIN" || memberRow.role === "PRINCIPAL") {
      role = "admin";
    } else if (memberRow.role === "HOD" || memberRow.role === "DEPARTMENT_HEAD") {
      role = "hod";
    } else if (memberRow.role === "STUDENT") {
      role = "student";
    } else if (memberRow.role === "STAFF") {
      role = "staff";
    }
  }

  // Fallback checks (if member mapping is missing or needs lookup)
  if (!role) {
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle();
    if (staffRow) { role = "staff"; memberRole = memberRole ?? "STAFF"; }
  }

  if (!role) {
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (studentRow) { role = "student"; memberRole = memberRole ?? "STUDENT"; }
  }

  // Deny access if no recognised role — prevents unknown users becoming admins
  if (!role) {
    await supabase.auth.signOut();
    redirect("/login?error=Unauthorized access");
  }

  // Cache the role in a cookie so middleware doesn't need a DB call per request
  cookieStore.set("aura-role", role, {
    path:     "/",
    httpOnly: true,
    maxAge:   60 * 60 * 24 * 7,  // 7 days
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
  });

  // JS-readable display label so the UI badge shows the real role
  // (e.g. "Principal") even though access tier collapses to "admin".
  cookieStore.set("aura-role-label", roleLabel(memberRole), {
    path:     "/",
    httpOnly: false,
    maxAge:   60 * 60 * 24 * 7,
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
  });

  // Cache institution ID in a JS-readable cookie so the Sidebar can resolve module
  // links (subjects, exams, results, etc.) synchronously on first render without an
  // async Supabase fetch. Not httpOnly intentionally — it's non-sensitive navigation state.
  if (role === "admin" || role === "hod") {
    let instId: string | null = (memberRow as { institution_id?: string } | null)?.institution_id ?? null;
    let instSlug: string | null = null;
    if (!instId) {
      // SUPER_ADMIN has no institution_id in institution_members — pick the first one
      const { data: firstInst } = await supabase
        .from("institutions")
        .select("id, slug")
        .limit(1)
        .maybeSingle();
      instId   = firstInst?.id   ?? null;
      instSlug = firstInst?.slug ?? null;
    } else {
      const { data: instRow } = await supabase
        .from("institutions")
        .select("slug")
        .eq("id", instId)
        .maybeSingle();
      instSlug = instRow?.slug ?? null;
    }
    if (instSlug) {
      // Non-httpOnly so the Sidebar can read it from document.cookie on first render
      cookieStore.set("aura-inst-slug", instSlug, {
        path:     "/",
        httpOnly: false,
        maxAge:   60 * 60 * 24 * 7,
        sameSite: "lax",
        secure:   process.env.NODE_ENV === "production",
      });
    }
  }

  revalidatePath("/", "layout");
  redirect(role === "staff" ? "/staff-portal" : role === "student" ? "/student-portal" : "/");
}

export async function logout() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  await supabase.auth.signOut();

  // Clear the role cookies so they don't persist after sign-out
  cookieStore.delete("aura-role");
  cookieStore.delete("aura-role-label");

  redirect("/login");
}
