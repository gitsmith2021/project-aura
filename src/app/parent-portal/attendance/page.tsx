import { ClipboardCheck } from "lucide-react";
import { getSelectedChild, getChildAttendance } from "@/actions/parentPortal";
import { subjectAttendance, overallAttendancePct, ATTENDANCE_THRESHOLD } from "@/lib/parentPortal";

export default async function ParentAttendancePage() {
  const child = await getSelectedChild();
  if (!child) return <div className="p-6 text-slate-400">No child selected.</div>;

  const res = await getChildAttendance(child.studentId);
  const rows = res.success ? res.data : [];
  const bySubject = subjectAttendance(rows);
  const overall = overallAttendancePct(rows);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardCheck size={22} className="text-amber-600" /> Attendance</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{child.name} · overall <span className={`font-semibold ${overall >= ATTENDANCE_THRESHOLD ? "text-emerald-600" : "text-rose-600"}`}>{overall}%</span></p>
      </div>

      {bySubject.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No attendance recorded yet.</div>
      ) : (
        <div className="space-y-3">
          {bySubject.map((s) => (
            <div key={s.subject} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{s.subject}</span>
                <span className={`text-[13px] font-bold ${s.pct >= ATTENDANCE_THRESHOLD ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>{s.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className={`h-full rounded-full ${s.pct >= ATTENDANCE_THRESHOLD ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${s.pct}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">{s.attended} / {s.total} sessions attended</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
