"use client";

import { useState } from "react";
import { BarChart2, Download, Filter } from "lucide-react";
import { workloadCSV, type WorkloadRow } from "@/lib/appraisals";
import { generateWorkloadReport } from "@/actions/appraisals";

export function WorkloadTable({ institutionId, initial }: { institutionId: string; initial: WorkloadRow[] }) {
  const [rows, setRows] = useState<WorkloadRow[]>(initial);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function applyRange() {
    setBusy(true);
    const res = await generateWorkloadReport({ institutionId, from: from || null, to: to || null });
    setBusy(false);
    if (res.success) setRows(res.data);
  }

  function exportCSV() {
    const blob = new Blob([workloadCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workload-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totalPlanned = rows.reduce((s, r) => s + r.plannedHoursPerWeek, 0);
  const totalActual = rows.reduce((s, r) => s + r.actualHours, 0);
  const inputCls = "px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart2 size={22} className="text-purple-600" /> Faculty Workload Report
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Planned weekly teaching hours (from the timetable) vs. sessions actually conducted (from attendance).
          </p>
        </div>
        <button onClick={exportCSV} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Date range for "actual" attendance window */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
        <Filter size={15} className="text-slate-400 mb-1.5" />
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
        <button onClick={applyRange} disabled={busy} className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
          {busy ? "Loading…" : "Apply"}
        </button>
        <span className="text-[11px] text-slate-400 mb-1.5">Leave blank for all-time attendance.</span>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Staff</th>
              <th className="text-left font-medium px-4 py-2.5">Department</th>
              <th className="text-center font-medium px-4 py-2.5">Weekly Slots</th>
              <th className="text-center font-medium px-4 py-2.5">Planned Hrs/Week</th>
              <th className="text-center font-medium px-4 py-2.5">Sessions Held</th>
              <th className="text-center font-medium px-4 py-2.5">Actual Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No timetabled staff found. Assign staff to the timetable first.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{r.staffName}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{r.department ?? "—"}</td>
                <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.slots}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-900 dark:text-white">{r.plannedHoursPerWeek}</td>
                <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{r.sessionsConducted}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-900 dark:text-white">{r.actualHours}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 font-semibold">
              <tr>
                <td className="px-4 py-2.5" colSpan={3}>Total</td>
                <td className="px-4 py-2.5 text-center">{Math.round(totalPlanned * 100) / 100}</td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-center">{Math.round(totalActual * 100) / 100}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
