"use client";

import { useMemo, useState } from "react";
import { BarChart2, Download, Users, TrendingUp, CalendarOff } from "lucide-react";
import { avgAttendance, monthlyReportCSV, type ReportRow } from "@/lib/staffAttendance";
import { getMonthlyReport } from "@/actions/staffAttendance";

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function MonthlyReport({ institutionId, initialMonth, initial }: { institutionId: string; initialMonth: string; initial: ReportRow[] }) {
  const [month, setMonth] = useState(initialMonth);
  const [rows, setRows] = useState<ReportRow[]>(initial);
  const [busy, setBusy] = useState(false);

  async function changeMonth(m: string) {
    setMonth(m); setBusy(true);
    const res = await getMonthlyReport(institutionId, m);
    setBusy(false);
    if (res.success) setRows(res.data);
  }

  const avg = useMemo(() => avgAttendance(rows.map((r) => r.summary)), [rows]);
  const totalLOP = useMemo(() => Math.round(rows.reduce((a, r) => a + r.summary.lopDays, 0) * 100) / 100, [rows]);
  const withLOP = useMemo(() => rows.filter((r) => r.summary.lopDays > 0).length, [rows]);

  function exportCSV() {
    const blob = new Blob([monthlyReportCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `staff-attendance-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart2 size={22} className="text-purple-600" /> Monthly Attendance Report</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Present / absent / LOP / leave per staff — feeds payroll &amp; NAAC 2.4.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => changeMonth(e.target.value)} className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><Download size={15} /> CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<TrendingUp size={18} className="text-emerald-600" />} label="Avg Attendance (NAAC 2.4)" value={`${avg}%`} accent="bg-emerald-100 dark:bg-emerald-950/40" />
        <StatCard icon={<CalendarOff size={18} className="text-rose-600" />} label="Total LOP Days" value={totalLOP} accent="bg-rose-100 dark:bg-rose-950/40" />
        <StatCard icon={<Users size={18} className="text-amber-600" />} label="Staff with LOP" value={withLOP} accent="bg-amber-100 dark:bg-amber-950/40" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-[13px] min-w-[680px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Staff</th>
              <th className="text-center font-medium px-3 py-2.5">Present</th>
              <th className="text-center font-medium px-3 py-2.5">Absent</th>
              <th className="text-center font-medium px-3 py-2.5">Half</th>
              <th className="text-center font-medium px-3 py-2.5">Late</th>
              <th className="text-center font-medium px-3 py-2.5">Leave</th>
              <th className="text-center font-medium px-3 py-2.5">LOP</th>
              <th className="text-center font-medium px-3 py-2.5">Att %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {busy ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No data for this month.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.name} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-2.5">
                  <div className="font-medium text-slate-900 dark:text-white">{r.name}</div>
                  {r.department && <div className="text-[11px] text-slate-400">{r.department}</div>}
                </td>
                <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.summary.present}</td>
                <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.summary.absent}</td>
                <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.summary.halfDay}</td>
                <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.summary.late}</td>
                <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.summary.onLeave}</td>
                <td className={`px-3 py-2.5 text-center font-semibold ${r.summary.lopDays > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>{r.summary.lopDays}</td>
                <td className="px-3 py-2.5 text-center font-semibold text-slate-900 dark:text-white">{r.summary.attendancePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
