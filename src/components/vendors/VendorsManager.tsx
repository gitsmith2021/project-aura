"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, FileText } from "lucide-react";
import { addVendor, updateVendor, type VendorInput } from "@/actions/vendors";
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_LABELS, type Vendor, type VendorCategory } from "@/lib/purchaseOrders";
import { VendorCard } from "./VendorCard";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

const EMPTY = { name: "", category: "lab_equipment" as VendorCategory, gst_number: "", contact_person: "", phone: "", email: "", address: "" };

export function VendorsManager({ institutionId, initial }: { institutionId: string; initial: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initial);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [drawer, setDrawer] = useState<{ mode: "add" } | { mode: "edit"; vendor: Vendor } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vendors.filter((v) => {
      if (categoryFilter && v.category !== categoryFilter) return false;
      if (!q) return true;
      return v.name.toLowerCase().includes(q) || (v.gst_number ?? "").toLowerCase().includes(q) || (v.contact_person ?? "").toLowerCase().includes(q);
    });
  }, [vendors, search, categoryFilter]);

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Vendors &amp; Procurement</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Vendor registry and GST-ready purchase orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/institutions/${institutionId}/vendors/purchase-orders`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <FileText size={14} /> Purchase Orders
          </Link>
          <button type="button" onClick={() => setDrawer({ mode: "add" })} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700">
            <Plus size={14} strokeWidth={2.5} /> Add Vendor
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, GST or contact…" className="h-8 w-full pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-slate-100" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          <option value="">All categories</option>
          {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{VENDOR_CATEGORY_LABELS[c]}</option>)}
        </select>
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {vendors.length}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No vendors found. Add the first one.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => <VendorCard key={v.id} vendor={v} onEdit={(vendor) => setDrawer({ mode: "edit", vendor })} />)}
        </div>
      )}

      {drawer && (
        <VendorDrawer
          institutionId={institutionId}
          vendor={drawer.mode === "edit" ? drawer.vendor : null}
          onClose={() => setDrawer(null)}
          onSaved={(v, mode) => {
            if (mode === "add") setVendors((prev) => [...prev, v].sort((a, b) => a.name.localeCompare(b.name)));
            else setVendors((prev) => prev.map((x) => (x.id === v.id ? v : x)));
          }}
        />
      )}
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

function VendorDrawer({ institutionId, vendor, onClose, onSaved }: {
  institutionId: string;
  vendor: Vendor | null;
  onClose: () => void;
  onSaved: (v: Vendor, mode: "add" | "edit") => void;
}) {
  const isEdit = !!vendor;
  const [f, setF] = useState(vendor ? {
    name: vendor.name, category: vendor.category, gst_number: vendor.gst_number ?? "",
    contact_person: vendor.contact_person ?? "", phone: vendor.phone ?? "", email: vendor.email ?? "", address: vendor.address ?? "",
  } : EMPTY);
  const [isActive, setIsActive] = useState(vendor?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    if (isEdit && vendor) {
      const res = await updateVendor({ id: vendor.id, institutionId, patch: { ...f, gst_number: f.gst_number || null, contact_person: f.contact_person || null, phone: f.phone || null, email: f.email || null, address: f.address || null, is_active: isActive } });
      setSaving(false);
      if (!res.success) { setError(res.error); return; }
      onSaved({ ...vendor, ...f, gst_number: f.gst_number || null, contact_person: f.contact_person || null, phone: f.phone || null, email: f.email || null, address: f.address || null, is_active: isActive }, "edit");
    } else {
      const payload: VendorInput = { institution_id: institutionId, ...f, gst_number: f.gst_number || null, contact_person: f.contact_person || null, phone: f.phone || null, email: f.email || null, address: f.address || null };
      const res = await addVendor(payload);
      setSaving(false);
      if (!res.success) { setError(res.error); return; }
      onSaved(res.data, "add");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{isEdit ? "Edit Vendor" : "Add Vendor"}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          <Field label="Vendor name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as VendorCategory })} className={inputCls}>
                {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{VENDOR_CATEGORY_LABELS[c]}</option>)}
              </select>
            </Field>
            <Field label="GST number"><input value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Contact person"><input value={f.contact_person} onChange={(e) => setF({ ...f, contact_person: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} /></Field>
            <Field label="Email"><input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Address"><textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} rows={2} className={`${inputCls} h-auto py-2`} /></Field>
          {isEdit && (
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300" /> Active vendor
            </label>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
          <button type="button" onClick={submit} disabled={saving || !f.name.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Saving…" : isEdit ? "Save changes" : "Add vendor"}</button>
        </div>
      </aside>
    </div>
  );
}
