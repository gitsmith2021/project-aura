import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getApplication } from "@/actions/admissions";
import { ApplicationDetail } from "@/components/admissions/ApplicationDetail";

type PageProps = { params: Promise<{ id: string; applicationId: string }> };

export default async function AdmissionDetailPage({ params }: PageProps) {
  const { id, applicationId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getApplication(applicationId);
  if (!res.success) notFound();

  return (
    <DashboardLayout>
      <ApplicationDetail institutionId={id} application={res.data} />
    </DashboardLayout>
  );
}
