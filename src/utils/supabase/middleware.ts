import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Forward pathname so server layouts can read it via headers()
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-pathname", pathname);
  let supabaseResponse = NextResponse.next({ request: { headers: forwardedHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://nsaheksysxinemtjcako.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_0QZApyONjzPE8uplpbaOlA_9gdWwQZ0",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ── Slug → UUID rewrite for institution routes ─────────────────────────────
  // Browser URL has the slug (e.g. /institutions/bishop-heber-college/results).
  // Pages still receive the UUID in params.id — no page code needs to change.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const segs    = pathname.split("/");
  const instIdx = segs.indexOf("institutions");
  if (user && instIdx >= 0 && segs[instIdx + 1] && !UUID_RE.test(segs[instIdx + 1])) {
    const { data: inst } = await supabase
      .from("institutions")
      .select("id")
      .eq("slug", segs[instIdx + 1])
      .maybeSingle();
    if (inst?.id) {
      const url = request.nextUrl.clone();
      url.pathname = [...segs.slice(0, instIdx + 1), inst.id, ...segs.slice(instIdx + 2)].join("/");
      const rewriteRes = NextResponse.rewrite(url, { request: { headers: forwardedHeaders } });
      supabaseResponse.cookies.getAll().forEach(({ name, value }) =>
        rewriteRes.cookies.set(name, value)
      );
      return rewriteRes;
    }
  }

  const isLoginPage      = pathname === "/login";
  // /staff-portal/view/* is the admin's read-only window into a staff member's portal.
  // Admins are allowed there; only /staff-portal (no /view) is staff-only.
  const isAdminViewStaff    = pathname.startsWith("/staff-portal/view");
  const isStaffPortal       = pathname.startsWith("/staff-portal") && !isAdminViewStaff;
  const isAdminViewStudent  = pathname.startsWith("/student-portal/view");
  const isStudentPortal     = pathname.startsWith("/student-portal") && !isAdminViewStudent;

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!user) {
    if (isLoginPage) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    res.cookies.delete("aura-role");
    return res;
  }

  // ── Authenticated: determine role ─────────────────────────────────────────
  // Read the cached cookie set at login (avoids a DB query on every request)
  let role = request.cookies.get("aura-role")?.value as "staff" | "admin" | "student" | "hod" | undefined;

  if (!role) {
    // Cookie missing — query once and cache it
    const { data: memberRow } = await supabase
      .from("institution_members")
      .select("role")
      .eq("profile_id", user.id)
      .maybeSingle();

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

    if (!role) {
      const { data: staffRow } = await supabase
        .from("staff")
        .select("id")
        .eq("email", user.email ?? "")
        .eq("is_active", true)
        .maybeSingle();

      if (staffRow) {
        role = "staff";
      } else {
        const { data: studentRow } = await supabase
          .from("students")
          .select("id")
          .eq("email", user.email ?? "")
          .maybeSingle();
        role = studentRow ? "student" : "admin";
      }
    }

    supabaseResponse.cookies.set("aura-role", role, {
      path:     "/",
      httpOnly: true,
      maxAge:   60 * 60 * 24 * 7,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
    });
  }

  // Logged-in user lands on /login → send to their home
  if (isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = role === "staff" ? "/staff-portal" : role === "student" ? "/student-portal" : "/";
    return NextResponse.redirect(url);
  }

  // Staff must stay inside /staff-portal
  if (role === "staff" && !isStaffPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/staff-portal";
    return NextResponse.redirect(url);
  }

  // Students must stay inside /student-portal (they cannot use admin view routes)
  if (role === "student" && (!isStudentPortal || isAdminViewStudent)) {
    const url = request.nextUrl.clone();
    url.pathname = "/student-portal";
    return NextResponse.redirect(url);
  }

  // Admins & HODs cannot enter the staff self-service area, but CAN use /staff-portal/view/*
  if ((role === "admin" || role === "hod") && isStaffPortal && !isAdminViewStaff) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Non-students cannot access the student self-service area, but CAN use /student-portal/view/*
  if (role !== "student" && isStudentPortal) {
    const url = request.nextUrl.clone();
    url.pathname = role === "staff" ? "/staff-portal" : "/";
    return NextResponse.redirect(url);
  }

  // Staff cannot access admin student-view routes
  if (role === "staff" && isAdminViewStudent) {
    const url = request.nextUrl.clone();
    url.pathname = "/staff-portal";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
