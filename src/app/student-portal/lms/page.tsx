import { getStudentSubjects } from "@/actions/studyMaterials";
import { StudentMaterials } from "@/components/lms/StudentMaterials";

export const metadata = { title: "AURA — Study Materials" };

export default async function StudentLmsPage() {
  const res = await getStudentSubjects();
  return <StudentMaterials subjects={res.success ? res.data : []} />;
}
