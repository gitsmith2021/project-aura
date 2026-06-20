"use client";

import { useState } from "react";
import {  MapPin, User } from "lucide-react";
import { updateMaintenanceRequest, type MaintenanceWithMeta } from "@/actions/hostelMaintenance";
import {
  CATEGORY_LABEL, MAINTENANCE_PRIORITIES, MAINTENANCE_STATUSES, sortMaintenance,
  type MaintenancePriority, type MaintenanceStatus,
} from "@/lib/messMaintenance";

const PRIORITY_CLS: Record<string, string> = {
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  normal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const STATUS_CLS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};
const sel = "h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200";
const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function MaintenanceBoard({ institutionId, hostelId, initial }: { institutionId: string; hostelId: string; initial: MaintenanceWithMeta[] }) {
  const [rows, setRows] = useState<MaintenanceWithMeta[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = async (id: string, p: { status?: MaintenanceStatus; priority?: MaintenancePriority; assigned_to?: string; resolution_notes?: string }) => {
    setBusyId(id); setError(null);
    const res = await updateMaintenanceRequest({ id, hostelId, institutionId, ...p });
    setBusyId(null);
    if (!res.success) { setError(res.error); return; }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } as MaintenanceWithMeta : r)));
  };

  const sorted = sortMaintenance(rows);
  const openCount = rows.filter((r) => r.status === "open" || r.status === "in_progress").length;

  if (sorted.length === 0) return <p className="text-center text-xs text-slate-400 py-16">No maintenance requests. 🎉</p>;

  return (
    <div>
      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">{openCount} open · {rows.length} total</p>
      <div className="space-y-3">
        {sorted.map((r) => (
          <article key={r.id} className={`rounded-xl border bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4 ${r.priority === "urgent" && r.status !== "resolved" && r.status !== "closed" ? "border-rose-300 dark:border-rose-800/60" : "border-slate-200/70 dark:border-slate-700/50"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{CATEGORY_LABEL[r.category]}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_CLS[r.priority]}`}>{r.priority}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLS[r.status]}`}>{r.status.replace("_", " ")}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{fmt(r.created_at)}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">{r.description}</p>
            <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              {r.room_number && <span className="inline-flex items-center gap-1"><MapPin size={11} /> Room {r.room_number}</span>}
              <span className="inline-flex items-center gap-1"><User size={11} /> {r.raiser_name}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <select value={r.status} disabled={busyId === r.id} onChange={(e) => patch(r.id, { status: e.target.value as MaintenanceStatus })} className={sel}>
                {MAINTENANCE_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
              </select>
              <select value={r.priority} disabled={busyId === r.id} onChange={(e) => patch(r.id, { priority: e.target.value as MaintenancePriority })} className={sel}>
                {MAINTENANCE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                defaultValue={r.assigned_to ?? ""}
                placeholder="Assign to…"
                disabled={busyId === r.id}
                onBlur={(e) => { if (e.target.value !== (r.assigned_to ?? "")) patch(r.id, { assigned_to: e.target.value }); }}
                className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 flex-1 min-w-[120px]"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                defaultValue={r.resolution_notes ?? ""}
                placeholder="Resolution notes…"
                disabled={busyId === r.id}
                onBlur={(e) => { if (e.target.value !== (r.resolution_notes ?? "")) patch(r.id, { resolution_notes: e.target.value }); }}
                className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 flex-1"
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
