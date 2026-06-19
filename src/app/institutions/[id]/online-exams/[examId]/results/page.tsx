import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getExamResults } from "@/actions/onlineExams";
import { ExamResultsView } from "@/components/online-exams/ExamResultsView";

type PageProps = { params: Promise<{ id: string; examId: string }> };

export default async function ExamResultsPage({ params }: PageProps) {
  const { id, examId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: exam }, resultsRes] = await Promise.all([
    supabase.from("online_exams").select("title").eq("id", examId).maybeSingle(),
    getExamResults(examId),
  ]);
  if (!exam) notFound();

  return (
    <DashboardLayout>
      <ExamResultsView institutionId={id} examTitle={exam.title as string} rows={resultsRes.success ? resultsRes.data : []} />
    </DashboardLayout>
  );
}
