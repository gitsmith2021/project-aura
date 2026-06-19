import { getStudentAssignments } from "@/actions/lmsAssignments";
import { StudentAssignments } from "@/components/lms/StudentAssignments";

export const metadata = { title: "AURA — Assignments" };

export default async function StudentLmsAssignmentsPage() {
  const res = await getStudentAssignments();
  return <StudentAssignments rows={res.success ? res.data : []} />;
}
