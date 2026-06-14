"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, X, Building, BedDouble, ChevronRight } from "lucide-react";
import { addHostel } from "@/actions/hostels";
import { HOSTEL_TYPES, HOSTEL_TYPE_LABEL, hostelStats, type Hostel, type HostelType } from "@/lib/hostels";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function HostelsManager({ institutionId, initial }: { institutionId: string; initial: Hostel[] }) {
  const [hostels, setHostels] = useState<Hostel[]>(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<HostelType>("boys");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await addHostel({ institution_id: institutionId, name, hostel_type: type, address: address || null });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    setHostels((p) => [...p, res.data].sort((a, b) => a.name.localeCompare(b.name)));
    setName(""); setAddress(""); setType("boys"); setOpen(false);
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Hostels</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Residences, room occupancy and student allocations.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Add Hostel
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}

      {hostels.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No hostels yet — add the first one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hostels.map((h) => {
            const s = hostelStats(h.hostel_rooms ?? []);
            return (
              <Link key={h.id} href={`/institutions/${institutionId}/hostels/${h.id}`} className="group rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm shadow-sm p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50 flex items-center justify-center shrink-0">
                      <Building size={17} className="text-violet-600 dark:text-violet-400" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{h.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{HOSTEL_TYPE_LABEL[h.hostel_type]} hostel</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 shrink-0" />
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span className="inline-flex items-center gap-1"><BedDouble size={12} /> {s.rooms} rooms</span>
                    <span>{s.occupied}/{s.capacity} beds</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div className={`h-full rounded-full ${s.pct >= 100 ? "bg-rose-500" : s.pct >= 75 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Add Hostel</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. North Block" /></div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value as HostelType)} className={inputCls}>
                  {HOSTEL_TYPES.map((t) => <option key={t} value={t}>{HOSTEL_TYPE_LABEL[t]}</option>)}
                </select>
              </div>
              <div><label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Address (optional)</label><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></div>
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
              <button type="button" onClick={submit} disabled={saving || !name.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add hostel"}</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
