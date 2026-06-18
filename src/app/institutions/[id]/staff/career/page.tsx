import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getCareerEvents } from "@/actions/staffCareer";
import { CareerEventsLog } from "@/components/staff/CareerEventsLog";

type PageProps = { params: Promise<{ id: string }> };

export default async function StaffCareerPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [eventsRes, staffRes, deptRes, instRes] = await Promise.all([
    getCareerEvents(id),
    supabase.from("staff").select("id, full_name, designation").eq("institution_id", id).eq("is_active", true).order("full_name", { ascending: true }),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name", { ascending: true }),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const slug = (instRes.data?.slug as string) ?? id;
  const staffOptions = (staffRes.data ?? []).map((s) => ({
    id: s.id as string,
    full_name: s.full_name as string,
    designation: (s.designation as string | null) ?? null,
  }));
  const departmentOptions = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <DashboardLayout>
      <CareerEventsLog
        institutionId={id}
        instSlug={slug}
        staffOptions={staffOptions}
        departmentOptions={departmentOptions}
        initial={eventsRes.success ? eventsRes.data : []}
      />
    </DashboardLayout>
  );
}
