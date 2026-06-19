import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAssignmentSubmissions } from "@/actions/lmsAssignments";
import { SubmissionsGrader } from "@/components/lms/SubmissionsGrader";

type PageProps = { params: Promise<{ id: string; assignmentId: string }> };

export default async function LmsSubmissionsPage({ params }: PageProps) {
  const { id, assignmentId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getAssignmentSubmissions(assignmentId);
  if (!res.success) notFound();

  return (
    <DashboardLayout>
      <SubmissionsGrader institutionId={id} detail={res.data} backHref={`/institutions/${id}/lms/assignments`} />
    </DashboardLayout>
  );
}
