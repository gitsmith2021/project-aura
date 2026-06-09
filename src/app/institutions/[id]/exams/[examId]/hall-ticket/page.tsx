import { notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HallTicketCard } from "@/components/exams/HallTicketCard";
import { getExamForHallTicket } from "@/actions/examSchedules";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function HallTicketPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id: institutionId, examId } = await params;
  const res = await getExamForHallTicket(examId);

  if (!res.success) notFound();

  const { exam, students } = res.data;

  const breadcrumb = (
    <>
      <span className="text-slate-400">Exam Planner</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Hall Ticket — {exam.subject_name}</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-10 w-full max-w-3xl mx-auto">
        <Link
          href={`/institutions/${institutionId}/exams`}
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-violet-600 mb-5 transition-colors uppercase tracking-wider font-semibold print:hidden"
        >
          <ArrowLeft size={12} /> Back to Exam Planner
        </Link>

        <HallTicketCard exam={exam} students={students} />
      </div>
    </DashboardLayout>
  );
}
