import { redirect } from "next/navigation";
import { getStudentProfile } from "@/actions/studentPortal";
import { isSettingEnabled } from "@/lib/configServer";
import { SectionUnavailable } from "@/components/student-portal/SectionUnavailable";
import ResultsClient from "./ResultsClient";

// CF-1: server gate for student_portal.show_results, then render the client
// marksheet. Split from the client component so the toggle is enforced server-side.
export default async function ResultsPage() {
  const profileResult = await getStudentProfile();
  if (!profileResult.success) redirect("/login");

  if (!(await isSettingEnabled(profileResult.data.institution_id, "student_portal.show_results"))) {
    return <SectionUnavailable title="My Results" />;
  }
  return <ResultsClient />;
}
