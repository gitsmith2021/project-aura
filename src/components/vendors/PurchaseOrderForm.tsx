"use client";

import { useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { createPO, type POFormData } from "@/actions/purchaseOrders";
import { poTotal, inr, type PurchaseOrder } from "@/lib/purchaseOrders";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

type Row = { name: string; qty: string; unit: string; unit_price: string };
const emptyRow = (): Row => ({ name: "", qty: "1", unit: "pcs", unit_price: "" });

export function PurchaseOrderForm({ institutionId, form, onClose, onCreated }: {
  institutionId: string;
  form: POFormData;
  onClose: () => void;
  onCreated: (po: PurchaseOrder) => void;
}) {
  const [vendorId, setVendorId] = useState(form.vendors[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState("");
  const [raisedBy, setRaisedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(
    () => poTotal(rows.map((r) => ({ qty: parseFloat(r.qty) || 0, unit_price: parseFloat(r.unit_price) || 0 }))),
    [rows]
  );

  const setRow = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (i: number) => setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const submit = async () => {
    setSaving(true); setError(null);
    const items = rows.map((r) => ({ name: r.name, qty: parseFloat(r.qty) || 0, unit: r.unit, unit_price: parseFloat(r.unit_price) || 0 }));
    const res = await createPO({ institutionId, vendorId, departmentId: departmentId || null, raisedBy: raisedBy || null, items, notes: notes || null });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onCreated(res.data);
    onClose();
  };

  const hasValidLine = rows.some((r) => r.name.trim() && (parseFloat(r.qty) || 0) > 0);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">New Purchase Order</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Vendor</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={inputCls}>
              <option value="">Select vendor…</option>
              {form.vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Department (optional)</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {form.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Raised by (optional)</label>
              <select value={raisedBy} onChange={(e) => setRaisedBy(e.target.value)} className={inputCls}>
                <option value="">None</option>
                {form.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Line items</label>
              <button type="button" onClick={addRow} className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"><Plus size={12} /> Add line</button>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => {
                const lineTotal = (parseFloat(r.qty) || 0) * (parseFloat(r.unit_price) || 0);
                return (
                  <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Item name" className={`${inputCls} flex-1`} />
                      <button type="button" onClick={() => removeRow(i)} disabled={rows.length === 1} className="p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30"><Trash2 size={14} /></button>
                    </div>
                    <div className="grid grid-cols-4 gap-2 items-center">
                      <input type="number" min={0} value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} placeholder="Qty" className={inputCls} />
                      <input value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} placeholder="Unit" className={inputCls} />
                      <input type="number" min={0} value={r.unit_price} onChange={(e) => setRow(i, { unit_price: e.target.value })} placeholder="Unit ₹" className={inputCls} />
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-right pr-1">{inr(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputCls} h-auto py-2`} />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs text-slate-500">Total <span className="font-bold text-slate-800 dark:text-slate-100">{inr(total)}</span></span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
            <button type="button" onClick={submit} disabled={saving || !vendorId || !hasValidLine} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Creating…" : "Create draft PO"}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
