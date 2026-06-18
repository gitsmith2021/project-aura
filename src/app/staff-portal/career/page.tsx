import { getMyCareerTimeline } from "@/actions/staffCareer";
import { MyCareerView } from "@/components/staff/MyCareerView";

export default async function MyCareerPage() {
  const res = await getMyCareerTimeline();
  const data = res.success ? res.data : { events: [], joiningDate: null, designation: null, departmentName: null };

  return (
    <MyCareerView
      joiningDate={data.joiningDate}
      designation={data.designation}
      departmentName={data.departmentName}
      events={data.events}
    />
  );
}
