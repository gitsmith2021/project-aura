"use client";

import { useCallback, useEffect, useState, use } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getAuditLogs, type AuditLogRow } from "@/actions/auditLogs";
import type { AuditAction } from "@/lib/auditLog";
import { AuditLogTable, tableLabel } from "@/components/audit/AuditLogTable";
import { ScrollText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const ACTIONS: AuditAction[] = ["INSERT", "UPDATE", "DELETE", "PROMOTE", "REVERT"];
const PAGE_SIZE = 25;

export default function AuditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterTable, setFilterTable] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAuditLogs(institutionId, {
      tableName: filterTable || undefined,
      action: (filterAction || undefined) as AuditAction | undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    });
    if (res.success) {
      setRows(res.data);
      setTotal(res.total);
      setTables(res.tables);
      setError("");
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, [institutionId, filterTable, filterAction, filterFrom, filterTo, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever a filter changes
  useEffect(() => { setPage(1); }, [filterTable, filterAction, filterFrom, filterTo]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectCls =
    "px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400";

  return (
    <DashboardLayout>
      <div className="px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <ScrollText size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Audit Log</h1>
            <p className="text-xs text-slate-500">
              Tamper-proof trail of every sensitive change — NAAC / UGC / ISO 27001 evidence
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select value={filterTable} onChange={(e) => setFilterTable(e.target.value)} className={selectCls}>
            <option value="">All Modules</option>
            {tables.map((t) => <option key={t} value={t}>{tableLabel(t)}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className={selectCls}>
            <option value="">All Actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
            className={selectCls} title="From date" />
          <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
            className={selectCls} title="To date" />
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium text-slate-700 dark:text-slate-300">
            {total} entries
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <span>Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-violet-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            No audit entries yet — they appear as marks, fees, salaries, promotions, roles and
            leave decisions are changed.
          </div>
        ) : (
          <AuditLogTable rows={rows} />
        )}
      </div>
    </DashboardLayout>
  );
}
