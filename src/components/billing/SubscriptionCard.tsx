"use client";

import { Building2, Clock, AlertTriangle, Users, Briefcase, RefreshCw, XCircle, Pencil, FileText } from "lucide-react";
import type { SubscriptionRow } from "@/actions/subscriptions";
import { STATUS_LABELS, STATUS_STYLES, daysLeft, formatINR, type SubStatus } from "@/lib/subscriptions";

function countdownLabel(status: SubStatus | "none", expiresAt: string | null): string | null {
  if (status !== "active" && status !== "trial") return null;
  const d = daysLeft(expiresAt);
  if (d === null) return status === "trial" ? "Trial — no end date" : "No renewal date";
  if (d < 0) return "Expired";
  const prefix = status === "trial" ? "Trial ends" : "Renews";
  return d === 0 ? `${prefix} today` : `${prefix} in ${d}d`;
}

export function SubscriptionCard({ row, onAssign, onRenew, onCancel, onInvoice }: {
  row: SubscriptionRow;
  onAssign: () => void; onRenew: () => void; onCancel: () => void; onInvoice: () => void;
}) {
  const subscribed = row.status !== "none";
  const countdown = countdownLabel(row.status, row.expiresAt);
  const soon = (() => { const d = daysLeft(row.expiresAt); return d !== null && d >= 0 && d <= 7; })();

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 truncate"><Building2 size={15} className="text-violet-500 shrink-0" /> {row.institutionName}</p>
          <p className="text-[11px] text-slate-400">{row.planName ? `${row.planName} · ${row.billingCycle}` : "No subscription"}</p>
        </div>
        {subscribed
          ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[row.status as SubStatus]}`}>{STATUS_LABELS[row.status as SubStatus]}</span>
          : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">Unsubscribed</span>}
      </div>

      {countdown && (
        <p className={`mt-2 text-[12px] flex items-center gap-1 ${soon ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
          {soon ? <AlertTriangle size={12} /> : <Clock size={12} />} {countdown}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <div className={`flex items-center gap-1.5 ${row.studentsOver ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
          <Users size={13} className="text-slate-400" /> {row.students}{row.studentsOver && <AlertTriangle size={11} />}
        </div>
        <div className={`flex items-center gap-1.5 ${row.staffOver ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
          <Briefcase size={13} className="text-slate-400" /> {row.staff}{row.staffOver && <AlertTriangle size={11} />}
        </div>
      </div>
      {row.monthlyValue > 0 && <p className="mt-1.5 text-[12px] text-emerald-600 dark:text-emerald-400 font-semibold">{formatINR(row.monthlyValue)}/mo</p>}

      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
        <button onClick={onAssign} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700"><Pencil size={12} /> {subscribed ? "Change" : "Assign"}</button>
        {subscribed && row.status !== "cancelled" && <button onClick={onRenew} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><RefreshCw size={12} /> Renew</button>}
        <button onClick={onInvoice} title="Generate invoice" className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 ml-auto"><FileText size={12} /></button>
        {subscribed && row.status !== "cancelled" && <button onClick={onCancel} title="Cancel" className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><XCircle size={14} /></button>}
      </div>
    </div>
  );
}
