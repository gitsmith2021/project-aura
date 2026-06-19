"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Scale, Download, ChevronRight, AlertTriangle, Search } from "lucide-react";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS,
  GRIEVANCE_CATEGORIES, GRIEVANCE_STATUSES,
  filterGrievances, grievanceStats, grievancesCSV, isOverdue,
  type Grievance, type GrievanceCategory, type GrievanceStatus,
} from "@/lib/grievances";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function GrievanceManager({
  institutionId, instSlug, initial,
}: {
  institutionId: string;
  instSlug: string;
  initial: Grievance[];
}) {
  const [category, setCategory] = useState<GrievanceCategory | "all">("all");
  const [status, setStatus] = useState<GrievanceStatus | "all">("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => grievanceStats(initial), [initial]);
  const rows = useMemo(
    () => filterGrievances(initial, { category, status, search }),
    [initial, category, status, search]
  );

  function exportCSV() {
    const blob = new Blob([grievancesCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grievances-naac-6.2.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cards: { label: string; value: string | number; cls: string }[] = [
    { label: "Total", value: stats.total, cls: "text-slate-900 dark:text-white" },
    { label: "Open", value: stats.open, cls: "text-amber-600 dark:text-amber-400" },
    { label: "Overdue", value: stats.overdue, cls: "text-rose-600 dark:text-rose-400" },
    { label: "Resolution rate", value: `${stats.resolutionRate}%`, cls: "text-emerald-600 dark:text-emerald-400" },
    { label: "Within 30d SLA", value: `${stats.withinSlaRate}%`, cls: "text-purple-600 dark:text-purple-400" },
    { label: "Avg days", value: stats.avgDaysToResolve ?? "—", cls: "text-slate-900 dark:text-white" },
  ];

  const selectCls = "px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale size={22} className="text-purple-600" /> Grievance Redressal
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Formal grievance mechanism with SLA tracking and NAAC Criterion 6.2 evidence.
          </p>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Download size={15} /> NAAC 6.2 CSV
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <p className="text-[11px] text-slate-400">{c.label}</p>
            <p className={`text-[18px] font-semibold ${c.cls}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {stats.overdue > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
          <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <p className="text-[12px] text-rose-700 dark:text-rose-300">
            {stats.overdue} grievance{stats.overdue === 1 ? "" : "s"} past the resolution deadline — review and escalate.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject/details…"
            className={`${selectCls} pl-8`} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value as GrievanceCategory | "all")} className={selectCls}>
          <option value="all">All categories</option>
          {GRIEVANCE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as GrievanceStatus | "all")} className={selectCls}>
          <option value="all">All statuses</option>
          {GRIEVANCE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2">Subject</th>
              <th className="text-left font-medium px-4 py-2">Category</th>
              <th className="text-left font-medium px-4 py-2">From</th>
              <th className="text-left font-medium px-4 py-2">Filed</th>
              <th className="text-left font-medium px-4 py-2">Deadline</th>
              <th className="text-left font-medium px-4 py-2">Status</th>
              <th className="text-right font-medium px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No grievances match these filters.</td></tr>
            ) : (
              rows.map((g) => {
                const overdue = isOverdue(g);
                return (
                  <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white max-w-[240px] truncate">{g.subject}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[g.category]}`}>{CATEGORY_LABELS[g.category]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 capitalize">{g.complainant_type === "anonymous" ? "Anonymous" : g.complainant_type}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtDate(g.created_at)}</td>
                    <td className="px-4 py-2.5">
                      {g.deadline
                        ? <span className={overdue ? "text-rose-600 dark:text-rose-400 font-medium" : "text-slate-500"}>{fmtDate(g.deadline)}{overdue ? " · overdue" : ""}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[g.status]}`}>{STATUS_LABELS[g.status]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/institutions/${instSlug}/grievances/${g.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
                        Open <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
