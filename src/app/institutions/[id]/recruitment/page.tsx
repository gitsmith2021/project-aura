import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getJobPostings } from "@/actions/recruitment";
import { RecruitmentBoard } from "@/components/recruitment/RecruitmentBoard";

type PageProps = { params: Promise<{ id: string }> };

export default async function RecruitmentPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [postingsRes, deptRes] = await Promise.all([
    getJobPostings(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);

  const departments = (deptRes.data ?? []).map(d => ({ id: d.id as string, name: d.name as string }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <DashboardLayout>
      <RecruitmentBoard
        institutionId={id}
        initial={postingsRes.success ? postingsRes.data : []}
        departments={departments}
        today={today}
      />
    </DashboardLayout>
  );
}
