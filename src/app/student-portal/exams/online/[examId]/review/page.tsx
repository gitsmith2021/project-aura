import { notFound } from "next/navigation";
import { getStudentExamReview } from "@/actions/onlineExams";
import { ExamReviewView } from "@/components/online-exams/ExamReviewView";

export const metadata = { title: "AURA — Exam Result" };

type PageProps = { params: Promise<{ examId: string }> };

export default async function ExamReviewPage({ params }: PageProps) {
  const { examId } = await params;
  const res = await getStudentExamReview(examId);
  if (!res.success || !res.data) notFound();

  return <ExamReviewView review={res.data} />;
}
