import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getDrives, getCompanies, getPlacementStats } from "@/actions/placements";
import { PlacementDashboard } from "@/components/placements/PlacementDashboard";

type PageProps = { params: Promise<{ id: string }> };

export default async function PlacementsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [drivesRes, companiesRes, statsRes, deptRes, ayRes, instRes] = await Promise.all([
    getDrives(id),
    getCompanies(id),
    getPlacementStats(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
    supabase.from("academic_years").select("id, label, is_current").eq("institution_id", id).order("start_date", { ascending: false }),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const departments = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));
  const academicYears = (ayRes.data ?? []).map((y) => ({ id: y.id as string, label: y.label as string, is_current: y.is_current as boolean }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <PlacementDashboard
        institutionId={id}
        instSlug={slug}
        drives={drivesRes.success ? drivesRes.data : []}
        companies={companiesRes.success ? companiesRes.data : []}
        departments={departments}
        academicYears={academicYears}
        stats={statsRes.success ? statsRes.data.stats : { registeredStudents: 0, placedStudents: 0, placementRate: 0, offers: 0, avgCTC: null, highestCTC: null }}
      />
    </DashboardLayout>
  );
}
