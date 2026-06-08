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

  // ── Determine role: staff → student → admin ──────────────────────────────
  const { data: staffRow } = await supabase
    .from("staff")
    .select("id")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  let role: "staff" | "admin" | "student" = staffRow ? "staff" : "admin";

  if (role === "admin") {
    const { data: studentRow } = await supabase
      .from("students")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (studentRow) role = "student";
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
