"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, ChevronRight, RefreshCw, Download } from "lucide-react";
import {
  BUDGET_STATUS_LABELS, BUDGET_STATUS_COLORS, budgetTotals, budgetsCSV,
  type DepartmentBudget,
} from "@/lib/budgets";
import { getDepartmentBudgets, type DepartmentBudgetRow } from "@/actions/budgets";

type AY = { id: string; label: string; is_current: boolean };

function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function BudgetsOverview({
  institutionId, instSlug, academicYears, initialAyId, initialRows,
}: {
  institutionId: string;
  instSlug: string;
  academicYears: AY[];
  initialAyId: string;
  initialRows: DepartmentBudgetRow[];
}) {
  const [ayId, setAyId] = useState(initialAyId);
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAyChange(newAyId: string) {
    setAyId(newAyId);
    setLoading(true);
    setError(null);
    const res = await getDepartmentBudgets(institutionId, newAyId);
    setLoading(false);
    if (!res.success) { setError(res.error); return; }
    setRows(res.data);
  }

  function exportCSV() {
    const budgets = rows.map((r) => r.budget).filter((b): b is DepartmentBudget => b !== null);
    const blob = new Blob([budgetsCSV(budgets)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `department-budgets-${ayId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet size={22} className="text-purple-600" /> Department Budgets
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Plan, submit, and approve annual department budgets (NAAC 6.4).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={ayId} onChange={(e) => handleAyChange(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
            {academicYears.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? " (current)" : ""}</option>)}
          </select>
          <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw size={18} className="animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          No departments found for this institution.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(({ department, budget }) => {
            const totals = budget ? budgetTotals(budget.line_items ?? []) : null;
            return (
              <Link
                key={department.id}
                href={`/institutions/${instSlug}/finance/budgets/${department.id}?ay=${ayId}`}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white">{department.name}</h3>
                  <ChevronRight size={15} className="text-slate-400" />
                </div>

                {budget ? (
                  <>
                    <span className={`inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${BUDGET_STATUS_COLORS[budget.status]}`}>
                      {BUDGET_STATUS_LABELS[budget.status]}
                    </span>
                    <div className="mt-3 space-y-1 text-[12px] text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between"><span>Allocated</span><span className="font-medium text-slate-900 dark:text-white">{formatINR(budget.total_allocated)}</span></div>
                      <div className="flex justify-between"><span>Spent</span><span className="font-medium text-slate-900 dark:text-white">{formatINR(totals!.totalActual)}</span></div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${totals!.utilisationPct > 100 ? "bg-rose-500" : "bg-purple-500"}`}
                        style={{ width: `${Math.min(totals!.utilisationPct, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{totals!.utilisationPct}% utilised</p>
                  </>
                ) : (
                  <p className="mt-3 text-[12px] text-slate-400">No budget started yet</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
