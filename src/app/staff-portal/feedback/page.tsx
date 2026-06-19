import { getStaffFeedbackOverview } from "@/actions/feedback";
import { StaffFeedbackView } from "@/components/feedback/StaffFeedbackView";

export default async function StaffFeedbackPage() {
  const res = await getStaffFeedbackOverview();
  return <StaffFeedbackView rows={res.success ? res.data : []} />;
}
