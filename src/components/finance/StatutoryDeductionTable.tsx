"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, Download } from "lucide-react";
import { runMonthlyStatutoryDeductions } from "@/actions/statutoryPayroll";
import type { MonthlyStatutoryDeduction, StatutorySummary } from "@/types/finance";

type Props = {
  institutionId: string;
  month:         string;
  rows:          MonthlyStatutoryDeduction[];
  summary:       StatutorySummary;
};

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function StatutoryDeductionTable({ institutionId, month, rows, summary }: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [runMsg,  setRunMsg]  = useState<string | null>(null);
  const [runErr,  setRunErr]  = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true); setRunMsg(null); setRunErr(null);
    const res = await runMonthlyStatutoryDeductions(institutionId, month);
    setRunning(false);
    if (!res.success) { setRunErr(res.error); return; }
    const { computed, skipped, alreadyRun } = res.data;
    setRunMsg(`Computed ${computed} records. ${alreadyRun} already ran. ${skipped} daily-wage skipped.`);
    router.refresh();
  };

  const handleCsvExport = () => {
    const header = "Staff,Employee ID,Department,Regime,Gross,Basic,PF (Emp),PF (Employer),ESI (Emp),ESI (Employer),TDS,Net\n";
    const body = rows.map(r => [
      r.staff?.full_name ?? "",
      r.staff?.employee_id ?? "",
      r.staff?.departments?.name ?? "",
      r.tax_regime,
      r.gross_salary,
      r.basic_salary,
      r.pf_employee,
      r.pf_employer,
      r.esi_employee,
      r.esi_employer,
      r.tds_deducted,
      r.net_salary,
    ].join(",")).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `statutory_deductions_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        {[
          { label: "TDS Payable",       val: summary.totalTds,         color: "rose"    },
          { label: "PF (Employee)",     val: summary.totalPfEmployee,  color: "violet"  },
          { label: "PF (Employer)",     val: summary.totalPfEmployer,  color: "purple"  },
          { label: "ESI (Employee)",    val: summary.totalEsiEmployee, color: "blue"    },
          { label: "ESI (Employer)",    val: summary.totalEsiEmployer, color: "indigo"  },
        ].map(({ label, val, color }) => (
          <div key={label} className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-${color}-200/60 dark:border-${color}-800/40 backdrop-blur-sm shadow-sm`}>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-black text-${color}-700 dark:text-${color}-400 tabular-nums`}>{fmtINR(val)}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{monthLabel(month)}</span>
        <span className="text-xs text-slate-400">{summary.staffProcessed} processed · {summary.staffPending} pending</span>
        <div className="flex-1" />
        {rows.length > 0 && (
          <button
            type="button"
            onClick={handleCsvExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 rounded-lg hover:bg-violet-100"
          >
            <Download size={12} /> Export CSV
          </button>
        )}
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg transition-colors"
        >
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Run deductions
        </button>
      </div>

      {runErr && <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 rounded-lg px-3 py-2">{runErr}</p>}
      {runMsg && <p className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg px-3 py-2">{runMsg}</p>}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          No deductions computed for this month yet. Click &ldquo;Run deductions&rdquo; to generate.
        </div>
      ) : (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-900/30">
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">Staff</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">Regime</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">Gross</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">PF (E)</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">PF (Er)</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">ESI (E)</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">ESI (Er)</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">TDS</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{r.staff?.full_name ?? "—"}</p>
                    <p className="text-[10px] text-slate-400">{r.staff?.departments?.name ?? ""}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${r.tax_regime === "new" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      {r.tax_regime.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">{fmtINR(r.gross_salary)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtINR(r.pf_employee)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{fmtINR(r.pf_employer)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtINR(r.esi_employee)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{fmtINR(r.esi_employer)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtINR(r.tds_deducted)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(r.net_salary)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 1 && (
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30">
                <tr>
                  <td colSpan={2} className="px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Total ({rows.length} staff)</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-200">{fmtINR(rows.reduce((s,r)=>s+Number(r.gross_salary),0))}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-600">{fmtINR(summary.totalPfEmployee)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-500">{fmtINR(summary.totalPfEmployer)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-600">{fmtINR(summary.totalEsiEmployee)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-500">{fmtINR(summary.totalEsiEmployer)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-rose-600">{fmtINR(summary.totalTds)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-emerald-700">{fmtINR(rows.reduce((s,r)=>s+Number(r.net_salary),0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
