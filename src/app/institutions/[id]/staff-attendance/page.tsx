import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getDailyRegister } from "@/actions/staffAttendance";
import { DailyRegister } from "@/components/staff-attendance/DailyRegister";

type PageProps = { params: Promise<{ id: string }> };

export default async function StaffAttendancePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const [regRes, instRes] = await Promise.all([
    getDailyRegister(id, today),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <DailyRegister institutionId={id} instSlug={slug} initialDate={today} initial={regRes.success ? regRes.data : []} />
    </DashboardLayout>
  );
}
