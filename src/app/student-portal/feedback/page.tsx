import { getStudentFeedbackForms } from "@/actions/feedback";
import { StudentFeedbackList } from "@/components/feedback/StudentFeedbackList";

export const metadata = { title: "AURA — Feedback" };

export default async function StudentFeedbackPage() {
  const res = await getStudentFeedbackForms();
  return <StudentFeedbackList rows={res.success ? res.data : []} />;
}
