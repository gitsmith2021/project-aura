"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, X, Package, ArrowRightLeft, Wrench, Boxes } from "lucide-react";
import { addAsset, addCategory, type AssetInput } from "@/actions/assets";
import {
  ASSET_STATUS_COLORS, ASSET_STATUS_LABELS, effectiveStatus, isLowStock, inr,
  type Asset, type AssetCategory,
} from "@/lib/assets";
import { AssetStockAlert } from "./AssetStockAlert";
import { AllocationModal } from "./AllocationModal";

const inputCls =
  "w-full h-9 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500";

export function AssetsManager({
  institutionId, initialAssets, initialCategories,
}: {
  institutionId: string;
  initialAssets: Asset[];
  initialCategories: AssetCategory[];
}) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [categories, setCategories] = useState<AssetCategory[]>(initialCategories);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [allocFor, setAllocFor] = useState<Asset | null>(null);

  const lowStock = useMemo(() => assets.filter((a) => a.status !== "disposed" && isLowStock(a)), [assets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return assets.filter((a) => {
      if (categoryId && a.category_id !== categoryId) return false;
      if (statusFilter && effectiveStatus(a) !== statusFilter) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || (a.brand_model ?? "").toLowerCase().includes(q) || (a.serial_number ?? "").toLowerCase().includes(q);
    });
  }, [assets, search, categoryId, statusFilter]);

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Assets &amp; Inventory</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Equipment, consumables, stock levels, allocations and maintenance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/institutions/${institutionId}/assets/allocations`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <ArrowRightLeft size={14} /> Allocations
          </Link>
          <Link href={`/institutions/${institutionId}/assets/maintenance`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
            <Wrench size={14} /> Maintenance
          </Link>
          <button type="button" onClick={() => setCatOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Boxes size={14} /> Category
          </button>
          <button type="button" onClick={() => setAddOpen(true)} disabled={categories.length === 0} title={categories.length === 0 ? "Add a category first" : ""} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 border border-purple-700 disabled:opacity-50">
            <Plus size={14} strokeWidth={2.5} /> Add Asset
          </button>
        </div>
      </div>

      <AssetStockAlert items={lowStock} />

      {categories.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2 mb-4">
          Create an asset category first (e.g. &ldquo;Lab Equipment&rdquo; fixed, or &ldquo;Chemicals&rdquo; consumable).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, brand or serial…" className="h-8 w-full pl-8 pr-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 dark:text-slate-100" />
        </div>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200">
          <option value="">All statuses</option>
          {(["active", "low_stock", "maintenance", "disposed"] as const).map((s) => <option key={s} value={s}>{ASSET_STATUS_LABELS[s]}</option>)}
        </select>
        <span className="text-[11px] text-slate-400 ml-auto">{filtered.length} of {assets.length}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-16">No assets found.</p>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-semibold">Asset</th>
                <th className="px-3 py-2.5 font-semibold">Category</th>
                <th className="px-3 py-2.5 font-semibold">Stock</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 font-semibold">Value</th>
                <th className="px-3 py-2.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((a) => {
                const st = effectiveStatus(a);
                const low = isLowStock(a);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{a.name}</p>
                          {(a.brand_model || a.location_details) && (
                            <p className="text-[10px] text-slate-400 truncate">{[a.brand_model, a.location_details].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      {a.asset_categories?.name ?? "—"}
                      {a.asset_categories?.is_consumable && <span className="ml-1 text-[9px] uppercase text-teal-500">consum.</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={low ? "font-bold text-rose-600 dark:text-rose-400" : "font-semibold text-slate-700 dark:text-slate-200"}>
                        {a.current_stock} {a.unit}
                      </span>
                      {a.reorder_level != null && <span className="text-[10px] text-slate-400"> / {a.reorder_level}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${ASSET_STATUS_COLORS[st]}`}>{ASSET_STATUS_LABELS[st]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{a.purchase_cost != null ? inr(a.purchase_cost) : "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setAllocFor(a)}
                        disabled={a.current_stock <= 0 || a.status === "disposed"}
                        className="px-2 py-1 text-[11px] font-semibold rounded-md border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-40"
                      >
                        Allocate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {allocFor && (
        <AllocationModal
          institutionId={institutionId}
          asset={allocFor}
          onClose={() => setAllocFor(null)}
          onAllocated={(qty) => setAssets((prev) => prev.map((a) => {
            if (a.id !== allocFor.id) return a;
            const next = a.current_stock - qty;
            const status = a.reorder_level != null && next <= a.reorder_level ? "low_stock" as const : "active" as const;
            return { ...a, current_stock: next, status };
          }))}
        />
      )}

      {catOpen && (
        <CategoryDrawer
          institutionId={institutionId}
          onClose={() => setCatOpen(false)}
          onAdded={(c) => setCategories((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}

      {addOpen && (
        <AddAssetDrawer
          institutionId={institutionId}
          categories={categories}
          onClose={() => setAddOpen(false)}
          onAdded={(a) => setAssets((prev) => [a, ...prev])}
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

function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">{children}</div>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex justify-end gap-2 shrink-0">{footer}</div>
      </aside>
    </div>
  );
}

function CategoryDrawer({ institutionId, onClose, onAdded }: {
  institutionId: string; onClose: () => void; onAdded: (c: AssetCategory) => void;
}) {
  const [name, setName] = useState("");
  const [isConsumable, setIsConsumable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const res = await addCategory({ institution_id: institutionId, name, is_consumable: isConsumable });
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onAdded(res.data); onClose();
  };

  return (
    <Drawer title="Add Category" onClose={onClose} footer={
      <>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
        <button type="button" onClick={submit} disabled={saving || !name.trim()} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add category"}</button>
      </>
    }>
      <Field label="Category name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Lab Equipment / Chemicals" /></Field>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={isConsumable} onChange={(e) => setIsConsumable(e.target.checked)} className="rounded border-slate-300" />
        Consumable (chemicals, glassware — depleted when allocated)
      </label>
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
    </Drawer>
  );
}

function AddAssetDrawer({ institutionId, categories, onClose, onAdded }: {
  institutionId: string; categories: AssetCategory[]; onClose: () => void; onAdded: (a: Asset) => void;
}) {
  const [f, setF] = useState({
    category_id: categories[0]?.id ?? "", name: "", brand_model: "", serial_number: "",
    purchase_date: "", purchase_cost: "", location_details: "", current_stock: "1", unit: "pcs", reorder_level: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    const payload: AssetInput = {
      institution_id: institutionId,
      category_id: f.category_id,
      name: f.name,
      brand_model: f.brand_model || null,
      serial_number: f.serial_number || null,
      purchase_date: f.purchase_date || null,
      purchase_cost: f.purchase_cost ? parseFloat(f.purchase_cost) : null,
      location_details: f.location_details || null,
      current_stock: parseInt(f.current_stock, 10) || 0,
      unit: f.unit || "pcs",
      reorder_level: f.reorder_level ? parseInt(f.reorder_level, 10) : null,
    };
    const res = await addAsset(payload);
    setSaving(false);
    if (!res.success) { setError(res.error); return; }
    onAdded(res.data); onClose();
  };

  return (
    <Drawer title="Add Asset" onClose={onClose} footer={
      <>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">Cancel</button>
        <button type="button" onClick={submit} disabled={saving || !f.name.trim() || !f.category_id} className="px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 disabled:opacity-50">{saving ? "Adding…" : "Add asset"}</button>
      </>
    }>
      <Field label="Category">
        <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className={inputCls}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_consumable ? " (consumable)" : ""}</option>)}
        </select>
      </Field>
      <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="e.g. Compound Microscope" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand / Model"><input value={f.brand_model} onChange={(e) => setF({ ...f, brand_model: e.target.value })} className={inputCls} /></Field>
        <Field label="Serial no."><input value={f.serial_number} onChange={(e) => setF({ ...f, serial_number: e.target.value })} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Stock"><input type="number" min={0} value={f.current_stock} onChange={(e) => setF({ ...f, current_stock: e.target.value })} className={inputCls} /></Field>
        <Field label="Unit"><input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={inputCls} placeholder="pcs / ml / g" /></Field>
        <Field label="Reorder at"><input type="number" min={0} value={f.reorder_level} onChange={(e) => setF({ ...f, reorder_level: e.target.value })} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Purchase date"><input type="date" value={f.purchase_date} onChange={(e) => setF({ ...f, purchase_date: e.target.value })} className={inputCls} /></Field>
        <Field label="Purchase cost (₹)"><input type="number" min={0} value={f.purchase_cost} onChange={(e) => setF({ ...f, purchase_cost: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Location (optional)"><input value={f.location_details} onChange={(e) => setF({ ...f, location_details: e.target.value })} className={inputCls} placeholder="e.g. Physics Lab I, Shelf 3" /></Field>
      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">{error}</p>}
    </Drawer>
  );
}
