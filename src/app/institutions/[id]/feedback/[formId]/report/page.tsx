import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getFeedbackReport } from "@/actions/feedback";
import { FeedbackReportView } from "@/components/feedback/FeedbackReportView";

type PageProps = { params: Promise<{ id: string; formId: string }> };

export default async function FeedbackReportPage({ params }: PageProps) {
  const { id, formId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getFeedbackReport(formId);
  if (!res.success) notFound();

  return (
    <DashboardLayout>
      <FeedbackReportView report={res.data} backHref={`/institutions/${id}/feedback`} />
    </DashboardLayout>
  );
}
