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

  // View routes (/staff-portal/view/*) have their own StaffViewShell layout.
  // Skip DashboardLayout here to avoid a double topbar/sidebar.
  const headerList  = await headers();
  const pathname    = headerList.get("x-pathname") ?? "";
  if (pathname.startsWith("/staff-portal/view/")) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
