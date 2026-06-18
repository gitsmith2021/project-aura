"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, CalendarOff } from "lucide-react";
import {
  STATUS_LABELS, STATUS_COLORS, type StaffAttendance, type MonthlySummary,
} from "@/lib/staffAttendance";
import { getMyAttendance } from "@/actions/staffAttendance";

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 leading-none">{value}</p>
      <p className="text-[12px] text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export function MyAttendanceView({ initialMonth, initialRecords, initialSummary }: {
  initialMonth: string; initialRecords: StaffAttendance[]; initialSummary: MonthlySummary;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [records, setRecords] = useState<StaffAttendance[]>(initialRecords);
  const [summary, setSummary] = useState<MonthlySummary>(initialSummary);
  const [busy, setBusy] = useState(false);

  async function changeMonth(m: string) {
    setMonth(m); setBusy(true);
    const res = await getMyAttendance(m);
    setBusy(false);
    if (res.success) { setRecords(res.data.records); setSummary(res.data.summary); }
  }

  return (
    <div className="space-y-6">
      <input type="month" value={month} onChange={(e) => changeMonth(e.target.value)} className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Present" value={summary.present + summary.late + summary.onDuty} accent="bg-emerald-100 dark:bg-emerald-950/40" />
        <Stat icon={<XCircle size={18} className="text-rose-600" />} label="Absent" value={summary.absent} accent="bg-rose-100 dark:bg-rose-950/40" />
        <Stat icon={<Clock size={18} className="text-orange-600" />} label="Late" value={summary.late} accent="bg-orange-100 dark:bg-orange-950/40" />
        <Stat icon={<CalendarOff size={18} className="text-violet-600" />} label="On Leave" value={summary.onLeave} accent="bg-violet-100 dark:bg-violet-950/40" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
        <span className="text-[13px] text-slate-600 dark:text-slate-300">Attendance rate this month</span>
        <span className="text-lg font-bold text-slate-900 dark:text-white">{summary.attendancePct}%</span>
      </div>
      {summary.lopDays > 0 && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-2.5 text-[12px] text-rose-700 dark:text-rose-300">
          {summary.lopDays} day(s) may be treated as Loss of Pay (absent without approved leave). Apply for leave to regularise.
        </div>
      )}

      <div>
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-2">Daily log</h2>
        {busy ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-slate-400 text-[13px]">Loading…</div>
        ) : records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-slate-400 text-[13px]">No attendance recorded this month yet.</div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-slate-700 dark:text-slate-300">
                  {new Date(`${r.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                  {r.check_in_time && <span className="text-[11px] text-slate-400 ml-2">in {r.check_in_time.slice(0, 5)}</span>}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>{STATUS_LABELS[r.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
