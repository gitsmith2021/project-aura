import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });

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

  const isLoginPage   = pathname === "/login";
  const isStaffPortal = pathname.startsWith("/staff-portal");

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
  let role = request.cookies.get("aura-role")?.value as "staff" | "admin" | undefined;

  if (!role) {
    // Cookie missing — query once and cache it
    const { data: staffRow } = await supabase
      .from("staff")
      .select("id")
      .eq("email", user.email ?? "")
      .eq("is_active", true)
      .maybeSingle();

    role = staffRow ? "staff" : "admin";
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
    url.pathname = role === "staff" ? "/staff-portal" : "/";
    return NextResponse.redirect(url);
  }

  // Staff must stay inside /staff-portal
  if (role === "staff" && !isStaffPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/staff-portal";
    return NextResponse.redirect(url);
  }

  // Admins cannot enter /staff-portal
  if (role === "admin" && isStaffPortal) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
