import { getMyGrievances } from "@/actions/grievances";
import { GrievancePortalView } from "@/components/grievances/GrievancePortalView";

export const metadata = { title: "AURA — Grievance Redressal" };

export default async function StaffGrievancePage() {
  const res = await getMyGrievances();
  return <GrievancePortalView initial={res.success ? res.data : []} />;
}
