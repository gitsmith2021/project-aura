"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck, Plus, X, BarChart2, Download, ChevronRight, Award,
} from "lucide-react";
import {
  APPRAISAL_STATUS_LABELS, APPRAISAL_STATUS_COLORS, appraisalStats, cycleCompletion,
  appraisalCSV, scoreGrade, type StaffAppraisal,
} from "@/lib/appraisals";
import { createAppraisalCycle } from "@/actions/appraisals";

type AY = { id: string; label: string; is_current: boolean };

export function AppraisalsOverview({
  institutionId,
  instSlug,
  academicYears,
  initial,
}: {
  institutionId: string;
  instSlug: string;
  academicYears: AY[];
  initial: StaffAppraisal[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("");
  const [ayId, setAyId] = useState(academicYears.find((y) => y.is_current)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Group appraisals by period (most recent first, preserving server order).
  const periods = useMemo(() => {
    const map = new Map<string, StaffAppraisal[]>();
    for (const a of initial) {
      const arr = map.get(a.appraisal_period) ?? [];
      arr.push(a);
      map.set(a.appraisal_period, arr);
    }
    return [...map.entries()];
  }, [initial]);

  async function handleCreate() {
    if (!period.trim()) { setError("Enter an appraisal period, e.g. \"2025-2026 Annual\"."); return; }
    setBusy(true); setError(null); setMsg(null);
    const res = await createAppraisalCycle({ institutionId, period, academicYearId: ayId || null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setMsg(res.data.created === 0 ? "All active staff already have an appraisal for this period." : `Created ${res.data.created} appraisal${res.data.created === 1 ? "" : "s"}.`);
    setPeriod("");
    router.refresh();
  }

  function exportCSV(rows: StaffAppraisal[], period: string) {
    const blob = new Blob([appraisalCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appraisals-${period.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck size={22} className="text-purple-600" /> Staff Appraisals
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Annual self-appraisal &amp; review cycles with NAAC faculty performance export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/institutions/${instSlug}/appraisals/workload`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <BarChart2 size={15} /> Workload Report
          </Link>
          <button onClick={() => { setOpen(true); setMsg(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
            <Plus size={15} /> New Cycle
          </button>
        </div>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          No appraisal cycles yet. Start one to generate self-appraisals for all active staff.
        </div>
      ) : (
        periods.map(([periodName, rows]) => {
          const stats = appraisalStats(rows);
          const completion = cycleCompletion(rows);
          return (
            <div key={periodName} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{periodName}</h2>
                  <p className="text-[12px] text-slate-500">
                    {stats.total} staff · {completion}% reviewed
                    {stats.avgOverall !== null && <> · avg score {stats.avgOverall}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {(["pending", "submitted", "reviewed", "completed"] as const).map((st) => (
                      <span key={st} className={`px-2 py-0.5 rounded-full ${APPRAISAL_STATUS_COLORS[st]}`}>
                        {stats[st]} {APPRAISAL_STATUS_LABELS[st]}
                      </span>
                    ))}
                  </div>
                  <button onClick={() => exportCSV(rows, periodName)} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <Download size={13} /> NAAC CSV
                  </button>
                </div>
              </div>

              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Staff</th>
                    <th className="text-left font-medium px-4 py-2">Department</th>
                    <th className="text-center font-medium px-4 py-2">Overall</th>
                    <th className="text-center font-medium px-4 py-2">Grade</th>
                    <th className="text-left font-medium px-4 py-2">Status</th>
                    <th className="text-right font-medium px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">
                        {a.staff?.full_name ?? "—"}
                        {a.staff?.designation && <div className="text-[11px] text-slate-400 font-normal">{a.staff.designation}</div>}
                      </td>
                      <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{a.staff?.departments?.name || "—"}</td>
                      <td className="px-4 py-2 text-center font-semibold text-slate-900 dark:text-white">{a.overall_score ?? "—"}</td>
                      <td className="px-4 py-2 text-center text-slate-600 dark:text-slate-300">
                        {a.overall_score !== null && <span className="inline-flex items-center gap-1"><Award size={12} className="text-amber-500" />{scoreGrade(a.overall_score)}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${APPRAISAL_STATUS_COLORS[a.status]}`}>
                          {APPRAISAL_STATUS_LABELS[a.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/institutions/${instSlug}/appraisals/${a.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
                          Review <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}

      {/* New cycle drawer */}
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-purple-500" />
                <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">New Appraisal Cycle</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              <p className="text-[13px] text-slate-600 dark:text-slate-300">
                Creates a <span className="font-medium">pending</span> self-appraisal for every active staff member. Staff fill it in from their portal; HODs/Principal then review and score.
              </p>
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              {msg && <p className="text-[12px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg">{msg}</p>}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Appraisal Period</label>
                <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2025-2026 Annual"
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Academic Year (optional)</label>
                <select value={ayId} onChange={(e) => setAyId(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Not linked</option>
                  {academicYears.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? " (current)" : ""}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Close</button>
              <button onClick={handleCreate} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {busy ? "Creating…" : "Create Cycle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
