import React from "react";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getStaffProfile } from "@/actions/staffPortal";
import { getCalendarEvents } from "@/actions/academicCalendar";
import { AcademicCalendar } from "@/components/calendar/AcademicCalendar";

export const metadata = {
  title: "AURA — Staff Calendar",
};

export default async function StaffCalendarPage() {
  const profileRes = await getStaffProfile();
  if (!profileRes.success || !profileRes.data) {
    redirect("/login");
  }
  const staff = profileRes.data;

  // Staff members can see both public and internal events
  const eventsRes = await getCalendarEvents(staff.institution_id);

  const events = eventsRes.success && eventsRes.data ? eventsRes.data : [];

  return (
    <div className="px-6 pt-4 pb-6 h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        
        {/* Header */}
        <div className="mb-4 shrink-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <CalendarDays size={22} className="text-purple-600" />
            Academic Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View all public and internal events, exams, and holidays for {staff.institutions?.name || "your institution"}.
          </p>
        </div>

        {/* Read-Only Calendar */}
        <div className="flex-1 min-h-0 flex flex-col">
          <AcademicCalendar events={events} isAdmin={false} />
        </div>
      </div>
    </div>
  );
}
