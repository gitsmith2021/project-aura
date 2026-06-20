"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Loader2, GraduationCap, Users, CalendarDays, ListChecks } from "lucide-react";
import { getAqar, type AqarData } from "@/actions/iqac";

type Year = { id: string; label: string; is_current: boolean };

export function AqarView({ institutionId, institutionName, years, initial }: {
  institutionId: string; institutionName: string; years: Year[]; initial: AqarData;
}) {
  const [yearId, setYearId] = useState(years.find((y) => y.is_current)?.id ?? "");
  const [data, setData] = useState<AqarData>(initial);
  const [busy, setBusy] = useState(false);

  async function changeYear(id: string) {
    setYearId(id); setBusy(true);
    const res = await getAqar(institutionId, id || null);
    setBusy(false);
    if (res.success) setData(res.data);
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="print:hidden">
        <Link href={`/institutions/${institutionId}/iqac`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> IQAC dashboard</Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">AQAR Compilation</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Annual Quality Assurance Report — auto-compiled from all modules.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={yearId} onChange={(e) => changeYear(e.target.value)} className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">All years</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? " (current)" : ""}</option>)}
            </select>
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Printer size={15} /> Print</button>
          </div>
        </div>
      </div>

      {busy ? (
        <div className="py-16 flex justify-center text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 print:border-0 print:shadow-none">
          <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">{institutionName}</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">Annual Quality Assurance Report (AQAR){data.yearLabel ? ` — ${data.yearLabel}` : ""}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Stat icon={<GraduationCap size={14} />} label="Students" value={data.students} />
            <Stat icon={<Users size={14} />} label="Staff" value={data.staff} />
            <Stat icon={<CalendarDays size={14} />} label="IQAC meetings" value={data.meetings.total} sub={data.meetings.compliant ? "6.1 met" : "below min"} />
            <Stat icon={<ListChecks size={14} />} label="Actions resolved" value={`${data.actions.resolvedPct}%`} />
          </div>

          <div className="mt-6">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white mb-2">NAAC criterion readiness — overall {data.overallCompleteness}%</p>
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 font-medium">#</th><th className="py-2 font-medium">Criterion</th><th className="py-2 font-medium">Evidence</th><th className="py-2 font-medium text-right">Completeness</th>
              </tr></thead>
              <tbody>
                {data.criteria.map((c) => (
                  <tr key={c.number} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="py-2 text-slate-400">{c.number}</td>
                    <td className="py-2 text-slate-800 dark:text-slate-200">{c.title}</td>
                    <td className="py-2 text-slate-500">{c.liveWithData}/{c.total}</td>
                    <td className="py-2 text-right font-semibold text-slate-900 dark:text-white">{c.completeness}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-[10px] text-slate-400 text-center">Auto-compiled by AURA from live module data on {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}. For the full criterion-wise SSR export, use the SSR Builder.</p>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3">
      <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1">{icon} {label}</p>
      <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}
