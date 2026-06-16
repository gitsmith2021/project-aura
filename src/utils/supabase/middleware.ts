import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { roleLabel } from "@/lib/roleLabel";

// Server-to-server endpoints with no cookie session. Webhooks authenticate
// their own requests (Razorpay: HMAC signature, NFC: bearer secret); the
// scheduler health probe is public for external uptime monitors and exposes
// only up/down status. None of these may be redirected to /login.
const WEBHOOK_PATHS = ["/api/razorpay-webhook", "/api/attendance/nfc", "/api/scheduler-health"];

// Pages every visitor may read regardless of auth state or role —
// /privacy-policy is legally required to be public (DPDP Act 2023).
const PUBLIC_PATHS = ["/", "/login", "/privacy-policy"];

// Public route prefixes anyone may reach without auth (e.g. the admissions
// application + status pages at /admissions/[slug]). The admin admissions panel
// lives under /institutions/[id]/admissions and is NOT matched by this.
const PUBLIC_PREFIXES = ["/admissions"];
const isPublicPrefix = (p: string) => PUBLIC_PREFIXES.some((pre) => p === pre || p.startsWith(pre + "/"));

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (WEBHOOK_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

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
  const isSuperAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  // /staff-portal/view/* is the admin's read-only window into a staff member's portal.
  // Admins are allowed there; only /staff-portal (no /view) is staff-only.
  const isAdminViewStaff    = pathname.startsWith("/staff-portal/view");
  const isStaffPortal       = pathname.startsWith("/staff-portal") && !isAdminViewStaff;
  const isAdminViewStudent  = pathname.startsWith("/student-portal/view");
  const isStudentPortal     = pathname.startsWith("/student-portal") && !isAdminViewStudent;

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!user) {
    // Allow landing, login, privacy policy and public prefixes (admissions) without auth
    if (PUBLIC_PATHS.includes(pathname) || isPublicPrefix(pathname)) return supabaseResponse;
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

    let memberRole: string | undefined = memberRow?.role;

    if (memberRow) {
      // PRINCIPAL is institution-wide leadership → same "admin" access tier as
      // INST_ADMIN (the DB normalizes it too); its distinct identity is carried
      // by the aura-role-label cookie set below.
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

    if (!role) {
      const { data: staffRow } = await supabase
        .from("staff")
        .select("id")
        .eq("email", user.email ?? "")
        .eq("is_active", true)
        .maybeSingle();

      if (staffRow) {
        role = "staff";
        memberRole = memberRole ?? "STAFF";
      } else {
        const { data: studentRow } = await supabase
          .from("students")
          .select("id")
          .eq("email", user.email ?? "")
          .maybeSingle();
        role = studentRow ? "student" : "admin";
        memberRole = memberRole ?? (studentRow ? "STUDENT" : "INST_ADMIN");
      }
    }

    supabaseResponse.cookies.set("aura-role", role, {
      path:     "/",
      httpOnly: true,
      maxAge:   60 * 60 * 24 * 7,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
    });

    // Display label (JS-readable) — lets the UI badge show the real role
    // (e.g. "Principal") even though the access tier collapses to "admin".
    supabaseResponse.cookies.set("aura-role-label", roleLabel(memberRole), {
      path:     "/",
      httpOnly: false,
      maxAge:   60 * 60 * 24 * 7,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
    });
  }

  // ── Super admin area (/admin) — SUPER_ADMIN only ───────────────────────────
  // The aura-role cookie collapses SUPER_ADMIN and INST_ADMIN into "admin", so
  // the platform-operator area re-checks the actual membership row on every
  // request. This is deliberate: /admin is low-traffic, and a revoked
  // SUPER_ADMIN must lose access immediately rather than when a cookie expires.
  if (isSuperAdminArea) {
    const { data: superRow } = await supabase
      .from("institution_members")
      .select("id")
      .eq("profile_id", user.id)
      .eq("role", "SUPER_ADMIN")
      .limit(1)
      .maybeSingle();
    if (!superRow) {
      const url = request.nextUrl.clone();
      url.pathname = role === "staff" ? "/staff-portal" : role === "student" ? "/student-portal" : "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Logged-in user lands on /login → send to their home
  if (isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = role === "staff" ? "/staff-portal" : role === "student" ? "/student-portal" : "/";
    return NextResponse.redirect(url);
  }

  // Privacy policy stays reachable for every authenticated role —
  // it must be exempt from the portal fences below
  if (pathname === "/privacy-policy") return supabaseResponse;

  // Public admissions pages stay reachable for any signed-in role too
  if (isPublicPrefix(pathname)) return supabaseResponse;

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
