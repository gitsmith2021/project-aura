"use client";

import { useState } from "react";
import { DoorOpen, Plus, X, MapPin, Clock, AlertTriangle, Check } from "lucide-react";
import { requestOutpass } from "@/actions/gateManagement";
import {
  OUTPASS_STATUS_COLORS, OUTPASS_STATUS_LABELS, liveOutpassStatus, type StudentOutpass,
} from "@/lib/gate";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
// value for datetime-local: local time, trimmed to minutes
const dtLocal = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

export function StudentOutpass({ institutionId, initial }: { institutionId: string | null; initial: StudentOutpass[] }) {
  const [rows, setRows] = useState<StudentOutpass[]>(initial);
  const [open, setOpen] = useState(false);

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <DoorOpen size={18} className="text-indigo-500" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Outpass</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)} disabled={!institutionId} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 border border-indigo-700 disabled:opacity-50">
          <Plus size={14} strokeWidth={2.5} /> Apply
        </button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Request permission to leave campus — your warden reviews each request.</p>

      <div className="max-w-2xl">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
            <DoorOpen size={28} className="opacity-30" />
            <p className="text-xs">No outpass requests yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((o) => {
              const live = liveOutpassStatus(o);
              return (
                <div key={o.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{o.reason}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {o.destination}</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {fmt(o.out_time)} → {fmt(o.expected_return)}</span>
                      </div>
                      {o.actual_return && <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Returned {fmt(o.actual_return)}</p>}
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0 flex items-center gap-1 ${OUTPASS_STATUS_COLORS[live]}`}>
                      {live === "overdue" && <AlertTriangle size={10} />}{OUTPASS_STATUS_LABELS[live]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {open && institutionId && (
        <ApplyDrawer institutionId={institutionId} onClose={() => setOpen(false)} onApplied={(o) => setRows((prev) => [o, ...prev])} />
      )}
    </div>
  );
}

function ApplyDrawer({ institutionId, onClose, onApplied }: { institutionId: string; onClose: () => void; onApplied: (o: StudentOutpass) => void }) {
  const now = new Date();
  const inTwoHours = new Date(now.getTime() + 2 * 3600 * 1000);
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [outTime, setOutTime] = useState(dtLocal(now));
  const [expectedReturn, setExpectedReturn] = useState(dtLocal(inTwoHours));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await requestOutpass({
      institutionId, reason, destination,
      outTime: new Date(outTime).toISOString(),
      expectedReturn: new Date(expectedReturn).toISOString(),
    });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onApplied(res.data); onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Apply for Outpass</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Home visit, Medical, Bank work" /></Field>
          <Field label="Destination"><input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} placeholder="e.g. Trichy town" /></Field>
          <Field label="Out time"><input type="datetime-local" value={outTime} onChange={(e) => setOutTime(e.target.value)} className={inputCls} /></Field>
          <Field label="Expected return"><input type="datetime-local" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} className={inputCls} /></Field>
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !reason.trim() || !destination.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50">{saving ? "Submitting…" : <><Check size={13} /> Submit request</>}</button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
