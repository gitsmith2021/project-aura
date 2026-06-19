import { notFound } from "next/navigation";
import { getFeedbackReport } from "@/actions/feedback";
import { FeedbackReportView } from "@/components/feedback/FeedbackReportView";

export default async function StaffFeedbackReportPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const res = await getFeedbackReport(formId);
  if (!res.success) notFound();

  return (
    <div className="w-full max-w-3xl mx-auto">
      <FeedbackReportView report={res.data} backHref="/staff-portal/feedback" />
    </div>
  );
}
