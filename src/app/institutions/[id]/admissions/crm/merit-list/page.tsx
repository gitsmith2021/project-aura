import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getMeritList } from "@/actions/admissionsCRM";
import { MeritListView } from "@/components/admissions/MeritListView";

type PageProps = { params: Promise<{ id: string }> };

export default async function MeritListPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [meritRes, instRes, deptRes] = await Promise.all([
    getMeritList(id),
    supabase.from("institutions").select("name").eq("id", id).maybeSingle(),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);
  const institutionName = (instRes.data?.name as string) ?? "Institution";
  const departments = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <DashboardLayout>
      <MeritListView
        institutionId={id}
        institutionName={institutionName}
        departments={departments}
        applicants={meritRes.success ? meritRes.data : []}
      />
    </DashboardLayout>
  );
}
