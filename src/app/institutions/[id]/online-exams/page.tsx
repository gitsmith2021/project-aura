import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getOnlineExams } from "@/actions/onlineExams";
import { OnlineExamsManager } from "@/components/online-exams/OnlineExamsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function OnlineExamsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [examsRes, deptRes] = await Promise.all([
    getOnlineExams(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);
  const departments = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));

  return (
    <DashboardLayout>
      <OnlineExamsManager institutionId={id} initial={examsRes.success ? examsRes.data : []} departments={departments} />
    </DashboardLayout>
  );
}
