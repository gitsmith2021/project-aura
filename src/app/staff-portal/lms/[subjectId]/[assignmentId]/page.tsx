import { notFound } from "next/navigation";
import { getSubjectMeta } from "@/actions/studyMaterials";
import { getAssignmentSubmissions } from "@/actions/lmsAssignments";
import { SubmissionsGrader } from "@/components/lms/SubmissionsGrader";

type PageProps = { params: Promise<{ subjectId: string; assignmentId: string }> };

export default async function StaffLmsGradePage({ params }: PageProps) {
  const { subjectId, assignmentId } = await params;

  const [metaRes, res] = await Promise.all([getSubjectMeta(subjectId), getAssignmentSubmissions(assignmentId)]);
  if (!res.success || !metaRes.success) notFound();

  return <SubmissionsGrader institutionId={metaRes.data.institutionId} detail={res.data} backHref={`/staff-portal/lms/${subjectId}`} />;
}
