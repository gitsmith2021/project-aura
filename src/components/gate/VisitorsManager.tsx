"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, X, LogOut, UserCheck, Car, Phone, Search } from "lucide-react";
import { logVisitor, checkOutVisitor, type VisitorInput } from "@/actions/gateManagement";
import { ID_PROOF_TYPES, VISITOR_STATUS_LABELS, minutesBetween, durationLabel, type VisitorLog } from "@/lib/gate";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function VisitorsManager({ institutionId, initial }: { institutionId: string; initial: VisitorLog[] }) {
  const [visitors, setVisitors] = useState<VisitorLog[]>(initial);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return visitors;
    return visitors.filter((v) => v.visitor_name.toLowerCase().includes(q) || (v.vehicle_number ?? "").toLowerCase().includes(q) || v.purpose.toLowerCase().includes(q));
  }, [visitors, search]);

  const checkout = async (id: string) => {
    setBusy(id);
    const res = await checkOutVisitor(institutionId, id);
    setBusy(null);
    if (res.success) setVisitors((prev) => prev.map((v) => (v.id === id ? { ...v, status: "checked_out", check_out_time: new Date().toISOString() } : v)));
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <Link href={`/institutions/${institutionId}/gate`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-purple-600 font-medium mb-4">
        <ArrowLeft size={13} /> Gate dashboard
      </Link>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UserCheck size={18} className="text-purple-500" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Visitor Log</h1>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
          <Plus size={14} strokeWidth={2.5} /> Log Visitor
        </button>
      </div>

      <div className="relative max-w-md mb-4">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, vehicle or purpose…" className="h-8 w-full pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-slate-100" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No visitors logged.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Visitor</th>
                <th className="px-3 py-2.5 font-semibold">Purpose</th>
                <th className="px-3 py-2.5 font-semibold">Check-in</th>
                <th className="px-3 py-2.5 font-semibold">Duration</th>
                <th className="px-3 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{v.visitor_name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                      {v.visitor_phone && <span className="flex items-center gap-0.5"><Phone size={9} /> {v.visitor_phone}</span>}
                      {v.vehicle_number && <span className="flex items-center gap-0.5"><Car size={9} /> {v.vehicle_number}</span>}
                      {v.id_proof_type && <span>{v.id_proof_type}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{v.purpose}</td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(v.check_in_time)}</td>
                  <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{durationLabel(minutesBetween(v.check_in_time, v.check_out_time ?? undefined))}</td>
                  <td className="px-3 py-2.5 text-right">
                    {v.status === "checked_in" ? (
                      <button type="button" onClick={() => checkout(v.id)} disabled={busy === v.id} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-50">
                        <LogOut size={11} /> Check out
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{VISITOR_STATUS_LABELS.checked_out}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <LogVisitorDrawer institutionId={institutionId} onClose={() => setOpen(false)} onLogged={(v) => setVisitors((prev) => [v, ...prev])} />}
    </div>
  );
}

function LogVisitorDrawer({ institutionId, onClose, onLogged }: { institutionId: string; onClose: () => void; onLogged: (v: VisitorLog) => void }) {
  const [f, setF] = useState({ visitor_name: "", purpose: "", visitor_phone: "", id_proof_type: "", id_proof_number: "", vehicle_number: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const payload: VisitorInput = { institution_id: institutionId, ...f, visitor_phone: f.visitor_phone || null, id_proof_type: f.id_proof_type || null, id_proof_number: f.id_proof_number || null, vehicle_number: f.vehicle_number || null };
    const res = await logVisitor(payload);
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onLogged(res.data); onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Log Visitor</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <Field label="Visitor name"><input value={f.visitor_name} onChange={(e) => setF({ ...f, visitor_name: e.target.value })} className={inputCls} /></Field>
          <Field label="Purpose"><input value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} className={inputCls} placeholder="e.g. Meeting HOD, Parent visit" /></Field>
          <Field label="Phone (optional)"><input value={f.visitor_phone} onChange={(e) => setF({ ...f, visitor_phone: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ID proof type">
              <select value={f.id_proof_type} onChange={(e) => setF({ ...f, id_proof_type: e.target.value })} className={inputCls}>
                <option value="">None</option>
                {ID_PROOF_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="ID number"><input value={f.id_proof_number} onChange={(e) => setF({ ...f, id_proof_number: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Vehicle number (optional)"><input value={f.vehicle_number} onChange={(e) => setF({ ...f, vehicle_number: e.target.value })} className={inputCls} placeholder="e.g. TN 45 AB 1234" /></Field>
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !f.visitor_name.trim() || !f.purpose.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : "Check in"}</button>
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
