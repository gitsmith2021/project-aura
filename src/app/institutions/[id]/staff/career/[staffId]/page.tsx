import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getCareerTimeline } from "@/actions/staffCareer";
import { serviceYears } from "@/lib/staffCareer";
import { StaffCareerDetail } from "@/components/staff/StaffCareerDetail";

type PageProps = { params: Promise<{ id: string; staffId: string }> };

export default async function StaffCareerDetailPage({ params }: PageProps) {
  const { id, staffId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [timelineRes, staffRes, deptRes, instRes] = await Promise.all([
    getCareerTimeline(staffId),
    supabase
      .from("staff")
      .select("full_name, designation, is_active, joining_date, departments!department_id(name)")
      .eq("id", staffId)
      .maybeSingle(),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name", { ascending: true }),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  if (!staffRes.data) notFound();

  const slug = (instRes.data?.slug as string) ?? id;
  const departmentOptions = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));
  const staff = staffRes.data as unknown as {
    full_name: string; designation: string | null; is_active: boolean;
    joining_date: string | null; departments: { name: string } | null;
  };

  return (
    <DashboardLayout>
      <StaffCareerDetail
        institutionId={id}
        instSlug={slug}
        staffId={staffId}
        staffName={staff.full_name}
        designation={staff.designation}
        departmentName={staff.departments?.name ?? null}
        isActive={staff.is_active}
        serviceYears={serviceYears(staff.joining_date)}
        departmentOptions={departmentOptions}
        initial={timelineRes.success ? timelineRes.data : []}
      />
    </DashboardLayout>
  );
}
