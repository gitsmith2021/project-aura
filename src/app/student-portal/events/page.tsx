import { MyEventsView } from "@/components/events/MyEventsView";
import { getMyEvents } from "@/actions/campusEvents";

export const metadata = { title: "Campus Events — Aura Student Portal" };

export default async function StudentEventsPage() {
  const res = await getMyEvents();

  const upcoming = res.success ? res.data.upcoming : [];
  const myRegistrations = res.success ? res.data.myRegistrations : [];

  return (
    <div className="w-full">
      <MyEventsView upcoming={upcoming} myRegistrations={myRegistrations} />
    </div>
  );
}
