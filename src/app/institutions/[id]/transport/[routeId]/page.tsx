import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getRouteDetail } from "@/actions/transport";
import { RouteDetailManager } from "@/components/transport/RouteDetailManager";

type PageProps = { params: Promise<{ id: string; routeId: string }> };

export default async function RouteDetailPage({ params }: PageProps) {
  const { id, routeId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [routeRes, studentsRes, yearsRes] = await Promise.all([
    getRouteDetail(id, routeId),
    supabase.from("students").select("id, full_name, roll_no").eq("institution_id", id).eq("is_active", true).order("full_name"),
    supabase.from("academic_years").select("id, label, is_current").eq("institution_id", id).order("start_date", { ascending: false }),
  ]);
  if (!routeRes.success) notFound();

  const students = (studentsRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string, roll_no: (s.roll_no as string | null) ?? null }));
  const years = (yearsRes.data ?? []).map((y) => ({ id: y.id as string, label: y.label as string, is_current: !!y.is_current }));

  return (
    <DashboardLayout>
      <RouteDetailManager institutionId={id} route={routeRes.data} students={students} years={years} />
    </DashboardLayout>
  );
}
