"use client";

import { BarChart3, Download } from "lucide-react";
import { formatLPA, nirfPlacementCSV, type PlacementStats, type DeptPlacement } from "@/lib/placements";
import { PlacementStatsCards } from "./PlacementStatsCard";

export function PlacementStatistics({ stats, deptwise }: { stats: PlacementStats; deptwise: DeptPlacement[] }) {
  function exportNIRF() {
    const blob = new Blob([nirfPlacementCSV(deptwise)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `placements-nirf-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 size={22} className="text-purple-600" /> Placement Statistics</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Institution-wide outcomes and department breakdown (NIRF Criterion 5.2).</p>
        </div>
        <button onClick={exportNIRF} disabled={deptwise.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          <Download size={15} /> NIRF CSV
        </button>
      </div>

      <PlacementStatsCards stats={stats} />

      <div>
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-2">Department-wise breakdown</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Department</th>
                <th className="text-center font-medium px-4 py-2.5">Registered</th>
                <th className="text-center font-medium px-4 py-2.5">Placed</th>
                <th className="text-center font-medium px-4 py-2.5">Placement %</th>
                <th className="text-center font-medium px-4 py-2.5">Avg CTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {deptwise.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No placement data yet.</td></tr>
              ) : deptwise.map((d) => (
                <tr key={d.department} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{d.department}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{d.registered}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{d.placed}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-slate-900 dark:text-white">{d.registered ? Math.round((d.placed / d.registered) * 100) : 0}%</td>
                  <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{formatLPA(d.avgCTC)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
