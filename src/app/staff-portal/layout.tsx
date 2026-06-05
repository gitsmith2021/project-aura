import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }    from "@/utils/supabase/server";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export const metadata = { title: "AURA — Staff Portal" };

export default async function StaffPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Admins accessing /staff-portal/view/* skip the staff guard.
  // The middleware already ensures admins cannot reach /staff-portal (base).
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

  return <DashboardLayout>{children}</DashboardLayout>;
}
