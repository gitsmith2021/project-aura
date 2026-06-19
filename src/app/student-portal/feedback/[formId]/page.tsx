import { notFound } from "next/navigation";
import { getStudentFeedbackForm } from "@/actions/feedback";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export const metadata = { title: "AURA — Give Feedback" };

type PageProps = { params: Promise<{ formId: string }> };

export default async function FillFeedbackPage({ params }: PageProps) {
  const { formId } = await params;
  const res = await getStudentFeedbackForm(formId);
  if (!res.success) notFound();

  return <FeedbackForm form={res.data} />;
}
