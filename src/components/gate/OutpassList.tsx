"use client";

import { useState } from "react";
import { Check, X, LogIn, MapPin, Clock, GraduationCap, AlertTriangle } from "lucide-react";
import { approveOutpass, rejectOutpass, markOutpassReturned } from "@/actions/gateManagement";
import {
  OUTPASS_STATUS_COLORS, OUTPASS_STATUS_LABELS, liveOutpassStatus, type StudentOutpass,
} from "@/lib/gate";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Shared outpass list with approve/reject (pending) and mark-returned (out).
 * Used by the admin gate page and the warden staff-portal page.
 */
export function OutpassList({ initial, emptyLabel = "No outpasses." }: { initial: StudentOutpass[]; emptyLabel?: string }) {
  const [rows, setRows] = useState<StudentOutpass[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = (id: string, p: Partial<StudentOutpass>) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const act = async (o: StudentOutpass, fn: () => Promise<{ success: boolean; error?: string }>, p: Partial<StudentOutpass>) => {
    setBusy(o.id); setError(null);
    const res = await fn();
    setBusy(null);
    if (!res.success) { setError(res.error ?? "Failed."); return; }
    patch(o.id, p);
  };

  if (rows.length === 0) {
    return <p className="text-center text-xs text-slate-400 py-12">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
      {rows.map((o) => {
        const live = liveOutpassStatus(o);
        return (
          <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <GraduationCap size={15} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {o.students?.full_name ?? "Student"}
                    {o.students?.roll_no && <span className="ml-1.5 text-[11px] font-normal text-slate-400">{o.students.roll_no}</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{o.reason}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {o.destination}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {fmt(o.out_time)} → {fmt(o.expected_return)}</span>
                    {o.hostels?.name && <span>{o.hostels.name}</span>}
                  </div>
                </div>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 flex items-center gap-1 ${OUTPASS_STATUS_COLORS[live]}`}>
                {live === "overdue" && <AlertTriangle size={10} />}{OUTPASS_STATUS_LABELS[live]}
              </span>
            </div>

            {(o.status === "pending" || ((o.status === "approved" || o.status === "overdue") && !o.actual_return)) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {o.status === "pending" ? (
                  <>
                    <button type="button" onClick={() => act(o, () => approveOutpass(o.institution_id, o.id), { status: "approved" })} disabled={busy === o.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-50">
                      <Check size={12} /> Approve
                    </button>
                    <button type="button" onClick={() => act(o, () => rejectOutpass(o.institution_id, o.id), { status: "rejected" })} disabled={busy === o.id} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50">
                      <X size={12} /> Reject
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => act(o, () => markOutpassReturned(o.institution_id, o.id), { status: "returned", actual_return: new Date().toISOString() })} disabled={busy === o.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">
                    <LogIn size={12} /> Mark returned
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
