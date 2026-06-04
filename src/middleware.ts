import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Build a Supabase client that can read/refresh the session ────────────
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isLoginPage    = pathname === "/login";
  const isStaffPortal  = pathname.startsWith("/staff-portal");
  const isPublicAsset  = pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  // Allow static assets unconditionally
  if (isPublicAsset) return response;

  // ── Unauthenticated: send to login ───────────────────────────────────────
  if (!user) {
    if (isLoginPage) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const res = NextResponse.redirect(url);
    // Clear stale role cookie
    res.cookies.delete("aura-role");
    return res;
  }

  // ── Authenticated: determine role ────────────────────────────────────────
  // Read cached role cookie first (set at login) — avoids a DB hit per request
  let role = request.cookies.get("aura-role")?.value as "staff" | "admin" | undefined;

  if (!role) {
    // Cookie missing (e.g. first request after manual cookie clear).
    // Query staff table once and cache the result.
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("email", user.email ?? "")
      .eq("is_active", true)
      .maybeSingle();

    role = staffRow ? "staff" : "admin";
    response.cookies.set("aura-role", role, {
      path:     "/",
      httpOnly: true,
      maxAge:   60 * 60 * 24 * 7,   // 7 days
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
    });
  }

  // Already on login page but authenticated → redirect to home portal
  if (isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = role === "staff" ? "/staff-portal" : "/";
    return NextResponse.redirect(url);
  }

  // ── Staff: only /staff-portal is allowed ─────────────────────────────────
  if (role === "staff" && !isStaffPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/staff-portal";
    return NextResponse.redirect(url);
  }

  // ── Admin: /staff-portal is off-limits ───────────────────────────────────
  if (role === "admin" && isStaffPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - public folder files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
