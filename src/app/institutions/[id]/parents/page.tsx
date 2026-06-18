import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getParents } from "@/actions/parentPortal";
import { ParentsManager } from "@/components/parents/ParentsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function ParentsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [parentsRes, studentsRes] = await Promise.all([
    getParents(id),
    supabase.from("students").select("id, full_name, roll_no").eq("institution_id", id).eq("is_active", true).order("full_name"),
  ]);
  const students = (studentsRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string, roll_no: (s.roll_no as string | null) ?? null }));

  return (
    <DashboardLayout>
      <ParentsManager institutionId={id} students={students} initial={parentsRes.success ? parentsRes.data : []} />
    </DashboardLayout>
  );
}
