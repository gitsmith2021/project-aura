"use server";

import { revalidatePath } from "next/cache";
import { redirect }       from "next/navigation";
import { cookies }        from "next/headers";
import { createClient }   from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Invalid login credentials");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=Invalid login credentials");

  // ── Determine role: HOD/Admin → Staff → Student ──────────────────────────
  const { data: memberRow } = await supabase
    .from("institution_members")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle();

  let role: "staff" | "admin" | "student" | "hod" | null = null;

  if (memberRow) {
    if (memberRow.role === "SUPER_ADMIN" || memberRow.role === "INST_ADMIN") {
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
    if (staffRow) role = "staff";
  }

  if (!role) {
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (studentRow) role = "student";
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

  revalidatePath("/", "layout");
  redirect(role === "staff" ? "/staff-portal" : role === "student" ? "/student-portal" : "/");
}

export async function logout() {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  await supabase.auth.signOut();

  // Clear the role cookie so it doesn't persist after sign-out
  cookieStore.delete("aura-role");

  redirect("/login");
}
