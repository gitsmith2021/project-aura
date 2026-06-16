import { cookies }  from "next/headers";
import { headers }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }    from "@/utils/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const metadata = { title: "AURA — Staff Portal" };

export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = cookieStore.get("aura-role")?.value;
  if (role !== "admin") {
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("email", user.email)
      .eq("is_active", true)
      .maybeSingle();

    if (!staff) redirect("/institutions");
  }

  // Force password reset on first login (set when account is created via hire/add).
  // app_metadata is server-verified — cannot be forged by the client.
  const headerList  = await headers();
  const pathname    = headerList.get("x-pathname") ?? "";
  if (
    user.app_metadata?.must_reset_password === true &&
    !pathname.startsWith("/staff-portal/reset-password") &&
    role !== "admin"
  ) {
    redirect("/staff-portal/reset-password");
  }

  // Standalone pages — no DashboardLayout (no sidebar/topbar should render)
  if (
    pathname.startsWith("/staff-portal/view/") ||
    pathname.startsWith("/staff-portal/reset-password")
  ) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
