import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getExamQuestions } from "@/actions/onlineExams";
import { QuestionBankEditor } from "@/components/online-exams/QuestionBankEditor";

type PageProps = { params: Promise<{ id: string; examId: string }> };

export default async function QuestionBankPage({ params }: PageProps) {
  const { id, examId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: exam }, questionsRes] = await Promise.all([
    supabase.from("online_exams").select("title").eq("id", examId).maybeSingle(),
    getExamQuestions(examId),
  ]);
  if (!exam) notFound();

  return (
    <DashboardLayout>
      <QuestionBankEditor institutionId={id} examId={examId} examTitle={exam.title as string} initial={questionsRes.success ? questionsRes.data : []} />
    </DashboardLayout>
  );
}
