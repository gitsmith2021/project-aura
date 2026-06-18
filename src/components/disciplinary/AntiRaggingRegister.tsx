"use client";

import Link from "next/link";
import { ShieldX, Download, ChevronRight, FileWarning, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  INCIDENT_STATUS_LABELS, INCIDENT_STATUS_COLORS, disciplinaryStats, incidentsCSV,
  type DisciplinaryIncident,
} from "@/lib/disciplinary";

export function AntiRaggingRegister({ instSlug, incidents }: { instSlug: string; incidents: DisciplinaryIncident[] }) {
  const stats = disciplinaryStats(incidents);

  function exportCSV() {
    const blob = new Blob([incidentsCSV(incidents)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `anti-ragging-register-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ShieldX size={22} className="text-rose-600" /> Anti-Ragging Register</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">UGC anti-ragging committee — all ragging-related incidents and their resolution.</p>
        </div>
        <button onClick={exportCSV} disabled={incidents.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><Download size={15} /> Export Register</button>
      </div>

      <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3 text-[12px] text-rose-700 dark:text-rose-300">
        As per UGC Regulations on Curbing the Menace of Ragging (2009), every reported case must be acted upon and documented. This register provides the committee&apos;s audit trail.
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-rose-100 dark:bg-rose-950/40"><ShieldX size={18} className="text-rose-600" /></div>
          <div><p className="text-[11px] text-slate-500">Total Cases</p><p className="text-lg font-bold text-slate-900 dark:text-white">{stats.total}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 dark:bg-amber-950/40"><FileWarning size={18} className="text-amber-600" /></div>
          <div><p className="text-[11px] text-slate-500">Open</p><p className="text-lg font-bold text-slate-900 dark:text-white">{stats.open}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/40"><CheckCircle2 size={18} className="text-emerald-600" /></div>
          <div><p className="text-[11px] text-slate-500">Resolution Rate</p><p className="text-lg font-bold text-slate-900 dark:text-white">{stats.resolutionRate}%</p></div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Date</th>
              <th className="text-left font-medium px-4 py-2.5">Reported By</th>
              <th className="text-left font-medium px-4 py-2.5">Action Taken</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No ragging incidents reported. <AlertTriangle size={13} className="inline text-emerald-500" /></td></tr>
            ) : incidents.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{new Date(i.incident_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{i.is_anonymous ? <span className="italic text-slate-400">Anonymous</span> : "Identified reporter"}</td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{i.action_taken || <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${INCIDENT_STATUS_COLORS[i.status]}`}>{INCIDENT_STATUS_LABELS[i.status]}</span></td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/institutions/${instSlug}/disciplinary/${i.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">Review <ChevronRight size={13} /></Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
