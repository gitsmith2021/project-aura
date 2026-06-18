import { GraduationCap, ClipboardCheck, CreditCard, CalendarDays, Users } from "lucide-react";
import { getSelectedChild, getChildAttendance, getChildFees, getChildUpcomingExams } from "@/actions/parentPortal";
import { overallAttendancePct, feesSummary, formatINR, ATTENDANCE_THRESHOLD } from "@/lib/parentPortal";

export default async function ParentDashboardPage() {
  const child = await getSelectedChild();
  if (!child) {
    return (
      <div className="w-full max-w-3xl mx-auto p-6">
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          <Users size={28} className="mx-auto mb-3 text-slate-300" />
          No children are linked to your account yet. Please contact the institution office.
        </div>
      </div>
    );
  }

  const [attRes, feesRes, examsRes] = await Promise.all([
    getChildAttendance(child.studentId),
    getChildFees(child.studentId),
    getChildUpcomingExams(child.studentId),
  ]);
  const attPct = overallAttendancePct(attRes.success ? attRes.data : []);
  const fees = feesSummary(feesRes.success ? feesRes.data : []);
  const exams = examsRes.success ? examsRes.data.slice(0, 4) : [];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white p-6">
        <p className="text-amber-100 text-[13px]">Viewing</p>
        <h1 className="text-2xl font-bold mt-0.5">{child.name}</h1>
        <p className="text-amber-100 text-[13px] mt-1">
          {[child.rollNo, child.department, child.program ? (child.program === "PG" ? "Post Graduate" : "Under Graduate") : null, child.year ? `Year ${child.year}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <ClipboardCheck size={18} className={attPct >= ATTENDANCE_THRESHOLD ? "text-emerald-600" : "text-rose-600"} />
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{attPct}%</p>
          <p className="text-[12px] text-slate-500">Attendance {attPct < ATTENDANCE_THRESHOLD && <span className="text-rose-500 font-medium">· below {ATTENDANCE_THRESHOLD}%</span>}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <CreditCard size={18} className={fees.totalDue > 0 ? "text-rose-600" : "text-emerald-600"} />
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{formatINR(fees.totalDue)}</p>
          <p className="text-[12px] text-slate-500">Fees due {fees.pendingCount > 0 && `· ${fees.pendingCount} pending`}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <CalendarDays size={18} className="text-blue-600" />
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{exams.length}</p>
          <p className="text-[12px] text-slate-500">Upcoming exams</p>
        </div>
      </div>

      <div>
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2"><CalendarDays size={17} className="text-amber-600" /> Upcoming exams</h2>
        {exams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-8 text-center text-slate-400 text-[13px]">No exams scheduled.</div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {exams.map((e, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{e.subject_name}</p>
                  <p className="text-[11px] text-slate-400">{e.exam_type ?? "Exam"}{e.hall_name ? ` · ${e.hall_name}` : ""}</p>
                </div>
                <span className="text-[12px] text-slate-500">{new Date(e.exam_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><GraduationCap size={12} /> This is a read-only view of your child&apos;s academic record.</p>
    </div>
  );
}
