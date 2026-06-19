import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getMaterials, getSubjectMeta } from "@/actions/studyMaterials";
import { getAssignments } from "@/actions/lmsAssignments";
import { SubjectMaterials } from "@/components/lms/SubjectMaterials";
import { AssignmentsManager } from "@/components/lms/AssignmentsManager";

type PageProps = { params: Promise<{ id: string; subjectId: string }> };

export default async function LmsSubjectPage({ params }: PageProps) {
  const { id, subjectId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [metaRes, materialsRes, assignmentsRes] = await Promise.all([
    getSubjectMeta(subjectId), getMaterials(subjectId), getAssignments(id),
  ]);
  if (!metaRes.success) notFound();
  const meta = metaRes.data;
  const subjectAssignments = (assignmentsRes.success ? assignmentsRes.data : []).filter((a) => a.subjectId === subjectId);

  return (
    <DashboardLayout>
      <SubjectMaterials
        institutionId={id}
        subjectId={subjectId}
        subjectName={meta.name}
        units={meta.units}
        initial={materialsRes.success ? materialsRes.data : []}
        backHref={`/institutions/${id}/lms`}
      />
      <div className="w-full px-6 pb-8">
        <AssignmentsManager
          institutionId={id}
          subjects={[{ id: subjectId, name: meta.name }]}
          initial={subjectAssignments}
          fixedSubjectId={subjectId}
          gradeBase={`/institutions/${id}/lms/assignments`}
          gradeSuffix="/submissions"
        />
      </div>
    </DashboardLayout>
  );
}
