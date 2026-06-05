import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }    from "@/utils/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const metadata = { title: "AURA — Staff Portal" };

export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  // Auth + staff-role guard (middleware also enforces this, but belt-and-suspenders)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("email", user.email)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) redirect("/institutions");

  // DashboardLayout provides the identical sidebar + topbar + dark-mode UI as the admin panel.
  // The Sidebar detects /staff-portal routes and swaps to the staff nav automatically.
  return <DashboardLayout>{children}</DashboardLayout>;
}
