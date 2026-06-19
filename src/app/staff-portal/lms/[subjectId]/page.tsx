import { notFound } from "next/navigation";
import { getMaterials, getSubjectMeta } from "@/actions/studyMaterials";
import { getAssignments } from "@/actions/lmsAssignments";
import { SubjectMaterials } from "@/components/lms/SubjectMaterials";
import { AssignmentsManager } from "@/components/lms/AssignmentsManager";

type PageProps = { params: Promise<{ subjectId: string }> };

export default async function StaffLmsSubjectPage({ params }: PageProps) {
  const { subjectId } = await params;

  const metaRes = await getSubjectMeta(subjectId);
  if (!metaRes.success) notFound();
  const meta = metaRes.data;

  const [materialsRes, assignmentsRes] = await Promise.all([
    getMaterials(subjectId), getAssignments(meta.institutionId),
  ]);
  const subjectAssignments = (assignmentsRes.success ? assignmentsRes.data : []).filter((a) => a.subjectId === subjectId);

  return (
    <>
      <SubjectMaterials
        institutionId={meta.institutionId}
        subjectId={subjectId}
        subjectName={meta.name}
        units={meta.units}
        initial={materialsRes.success ? materialsRes.data : []}
        backHref="/staff-portal/lms"
      />
      <div className="w-full px-6 pb-8">
        <AssignmentsManager
          institutionId={meta.institutionId}
          subjects={[{ id: subjectId, name: meta.name }]}
          initial={subjectAssignments}
          fixedSubjectId={subjectId}
          gradeBase={`/staff-portal/lms/${subjectId}`}
        />
      </div>
    </>
  );
}
