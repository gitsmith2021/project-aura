import { getStudentOnlineExams } from "@/actions/onlineExams";
import { StudentOnlineExams } from "@/components/online-exams/StudentOnlineExams";

export const metadata = { title: "AURA — Online Exams" };

export default async function StudentOnlineExamsPage() {
  const res = await getStudentOnlineExams();
  return <StudentOnlineExams rows={res.success ? res.data : []} />;
}
