import { CalendarCheck } from "lucide-react";
import { getMyAttendance } from "@/actions/staffAttendance";
import { MyAttendanceView } from "@/components/staff-attendance/MyAttendanceView";

export default async function MyAttendancePage() {
  const month = new Date().toISOString().slice(0, 7);
  const res = await getMyAttendance(month);
  const data = res.success ? res.data : { records: [], summary: { present: 0, absent: 0, halfDay: 0, late: 0, onDuty: 0, onLeave: 0, holiday: 0, lopDays: 0, workingDays: 0, attendancePct: 0 } };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarCheck size={22} className="text-purple-600" /> My Attendance
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Your monthly campus attendance — present days, absences, late marks and approved leave.
        </p>
      </div>
      <MyAttendanceView initialMonth={month} initialRecords={data.records} initialSummary={data.summary} />
    </div>
  );
}
