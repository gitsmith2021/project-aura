"use client";

import { useState } from "react";
import { Plus, X, Wrench } from "lucide-react";
import { raiseMaintenanceRequest } from "@/actions/hostelMaintenance";
import {
  MAINTENANCE_CATEGORIES, CATEGORY_LABEL, MAINTENANCE_PRIORITIES,
  type MaintenanceCategory, type MaintenancePriority, type MaintenanceRequest,
} from "@/lib/messMaintenance";

const STATUS_CLS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};
const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const inputCls = "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function RaiseMaintenance({ hostelId, roomId, initial }: { hostelId: string; roomId: string | null; initial: MaintenanceRequest[] }) {
  const [items, setItems] = useState<MaintenanceRequest[]>(initial);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<MaintenanceCategory>("electrical");
  const [priority, setPriority] = useState<MaintenancePriority>("normal");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await raiseMaintenanceRequest({ hostelId, roomId, category, priority, description });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setItems((p) => [res.data, ...p]);
    setDescription(""); setCategory("electrical"); setPriority("normal"); setOpen(false);
  };

  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><Wrench size={13} /> Maintenance</p>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white text-[11px] font-semibold rounded-md hover:bg-purple-700">
          <Plus size={12} /> Raise
        </button>
      </div>
      {error && <p className="mb-2 text-[11px] text-red-600">{error}</p>}
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">No requests raised.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-700 dark:text-slate-300 truncate">{CATEGORY_LABEL[r.category]} · <span className="text-slate-400">{fmt(r.created_at)}</span></span>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLS[r.status]}`}>{r.status.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Raise Maintenance Request</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value as MaintenanceCategory)} className={inputCls}>
                    {MAINTENANCE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                  </select>
                </div>
                <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)} className={inputCls}>
                    {MAINTENANCE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Describe the issue</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y" /></div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submit} disabled={saving || !description.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Submitting…" : "Submit"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
