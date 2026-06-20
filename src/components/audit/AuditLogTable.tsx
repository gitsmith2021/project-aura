"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Bot, User as UserIcon } from "lucide-react";
import type { AuditLogRow } from "@/actions/auditLogs";

const ACTION_BADGES: Record<string, string> = {
  INSERT:  "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  UPDATE:  "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  DELETE:  "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  PROMOTE: "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300",
  REVERT:  "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
};

const TABLE_LABELS: Record<string, string> = {
  exam_results:         "Exam Marks",
  cia_marks:            "CIA Marks",
  fee_payments:         "Fee Payments",
  salary_disbursements: "Salary",
  promotion_logs:       "Promotions",
  fee_concessions:      "Concessions",
  leave_requests:       "Leave",
  institution_members:  "Members & Roles",
  lms_submissions:      "LMS Grading",
  department_budgets:   "Budgets",
};

export const tableLabel = (t: string) =>
  TABLE_LABELS[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

/** Render a before/after pair, highlighting keys whose value changed. */
function DiffView({ before, after }: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (keys.length === 0) return <p className="text-[11px] text-slate-400">No snapshot recorded.</p>;

  const show = (v: unknown) =>
    v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
            <th className="py-1 pr-4 font-semibold">Field</th>
            <th className="py-1 pr-4 font-semibold">Before</th>
            <th className="py-1 font-semibold">After</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const b = before?.[k];
            const a = after?.[k];
            const changed = JSON.stringify(b) !== JSON.stringify(a);
            return (
              <tr key={k} className="border-t border-slate-100 dark:border-slate-800 align-top">
                <td className="py-1.5 pr-4 font-mono text-slate-500">{k}</td>
                <td className={`py-1.5 pr-4 break-all ${changed ? "text-rose-600 dark:text-rose-400 line-through decoration-rose-300" : "text-slate-500"}`}>
                  {show(b)}
                </td>
                <td className={`py-1.5 break-all ${changed ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-slate-500"}`}>
                  {show(a)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AuditLogTable({ rows }: { rows: AuditLogRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-1.5">
      {rows.map((r) => {
        const isOpen = expanded.has(r.id);
        return (
          <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(r.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
            >
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${ACTION_BADGES[r.action] ?? "bg-slate-100 text-slate-600"}`}>
                {r.action}
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-800 dark:text-slate-200">
                {tableLabel(r.table_name)}
              </span>
              <span className="flex items-center gap-1 min-w-0 flex-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {r.performed_by ? (
                  <><UserIcon size={11} className="shrink-0" />{r.performer_name ?? `${r.performed_by.slice(0, 8)}…`}</>
                ) : (
                  <><Bot size={11} className="shrink-0" />System</>
                )}
                {r.notes && <span className="truncate"> · {r.notes}</span>}
              </span>
              <span className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
                {fmtDateTime(r.created_at)}
              </span>
              {isOpen ? <ChevronUp size={14} className="shrink-0 text-slate-400" /> : <ChevronDown size={14} className="shrink-0 text-slate-400" />}
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                <DiffView before={r.before_data} after={r.after_data} />
                <p className="text-[10px] text-slate-400 font-mono">
                  record: {r.record_id}
                  {r.ip_address && <> · ip: {r.ip_address}</>}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
