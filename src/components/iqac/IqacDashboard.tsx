import Link from "next/link";
import { ClipboardCheck, CalendarDays, FileSpreadsheet, ListChecks, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { IqacOverview } from "@/actions/iqac";
import { NAAC_MIN_MEETINGS_PER_YEAR } from "@/lib/iqac";
import { CriterionDataCard } from "./CriterionDataCard";

export function IqacDashboard({ institutionId, data }: { institutionId: string; data: IqacOverview }) {
  const base = `/institutions/${institutionId}/iqac`;

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardCheck size={22} className="text-violet-600" /> IQAC Dashboard</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">NAAC readiness across all seven criteria, plus IQAC governance (Criterion 6.1).</p>
      </div>

      {/* Top strip */}
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Overall readiness</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">{data.overallCompleteness}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><CalendarDays size={12} /> IQAC meetings</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{data.meetings.total}</p>
          <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${data.meetings.compliant ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            {data.meetings.compliant ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />} {data.meetings.compliant ? "Meets 6.1 minimum" : `Below ${NAAC_MIN_MEETINGS_PER_YEAR}/year`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><ListChecks size={12} /> Action items</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{data.actions.resolvedPct}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{data.actions.completed}/{data.actions.total} resolved</p>
        </div>
        <Link href={`${base}/ssr`} className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-950/20 p-4 flex flex-col justify-between hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
          <p className="text-[12px] font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1"><FileSpreadsheet size={13} /> SSR Builder</p>
          <p className="text-[11px] text-violet-600/80 dark:text-violet-400/80">NAAC criterion exports · NIRF · AISHE <ArrowRight size={11} className="inline" /></p>
        </Link>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link href={`${base}/meetings`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><CalendarDays size={15} /> IQAC Meetings &amp; Actions</Link>
        <Link href={`${base}/aqar`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><ClipboardCheck size={15} /> AQAR Compilation</Link>
        <Link href={`${base}/ssr`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><FileSpreadsheet size={15} /> SSR / NIRF / AISHE</Link>
      </div>

      {/* Criterion grid */}
      <div>
        <p className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">NAAC criterion completeness</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.criteria.map((c) => <CriterionDataCard key={c.number} {...c} />)}
        </div>
      </div>
    </div>
  );
}
