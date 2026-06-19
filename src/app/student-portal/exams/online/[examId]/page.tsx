import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ExamLauncher } from "@/components/online-exams/ExamLauncher";

export const metadata = { title: "AURA — Take Exam" };

type PageProps = { params: Promise<{ examId: string }> };

export default async function TakeExamPage({ params }: PageProps) {
  const { examId } = await params;
  const supabase = createClient(await cookies());

  // RLS only lets an eligible student read a published exam.
  const { data: exam } = await supabase
    .from("online_exams")
    .select("title, duration_minutes, online_exam_questions(count)")
    .eq("id", examId)
    .maybeSingle();
  if (!exam) notFound();

  const questionCount = (exam.online_exam_questions as unknown as { count: number }[] | null)?.[0]?.count ?? 0;

  return (
    <ExamLauncher
      examId={examId}
      title={exam.title as string}
      durationMinutes={exam.duration_minutes as number}
      questionCount={questionCount}
    />
  );
}
