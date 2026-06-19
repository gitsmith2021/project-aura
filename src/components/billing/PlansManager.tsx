"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Plus, X, Pencil, ArrowLeft, Check, Power } from "lucide-react";
import { savePlan, togglePlanActive, type PlanRow } from "@/actions/subscriptions";
import { FEATURES, formatINR, type FeatureKey } from "@/lib/subscriptions";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

export function PlansManager({ initial }: { initial: PlanRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [priceAnnual, setPriceAnnual] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [maxStaff, setMaxStaff] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [features, setFeatures] = useState<FeatureKey[]>(["core"]);
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditId(null); setName(""); setPriceMonthly(""); setPriceAnnual(""); setMaxStudents(""); setMaxStaff("");
    setSortOrder(String(initial.length + 1)); setFeatures(["core"]); setIsActive(true); setError(null); setOpen(true);
  }
  function openEdit(p: PlanRow) {
    setEditId(p.id); setName(p.name); setPriceMonthly(String(p.priceMonthly)); setPriceAnnual(p.priceAnnual !== null ? String(p.priceAnnual) : "");
    setMaxStudents(p.maxStudents !== null ? String(p.maxStudents) : ""); setMaxStaff(p.maxStaff !== null ? String(p.maxStaff) : "");
    setSortOrder(String(p.sortOrder)); setFeatures(p.features.includes("core") ? p.features : ["core", ...p.features]); setIsActive(p.isActive); setError(null); setOpen(true);
  }
  function toggleFeature(k: FeatureKey) {
    if (k === "core") return; // always on
    setFeatures((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  }

  async function save() {
    if (!name.trim()) { setError("Plan name is required."); return; }
    setBusy(true); setError(null);
    const res = await savePlan({
      id: editId, name, priceMonthly: Math.max(0, Number(priceMonthly) || 0),
      priceAnnual: priceAnnual === "" ? null : Math.max(0, Number(priceAnnual) || 0),
      maxStudents: maxStudents === "" ? null : Math.max(0, Number(maxStudents) || 0),
      maxStaff: maxStaff === "" ? null : Math.max(0, Number(maxStaff) || 0),
      features, isActive, sortOrder: Number(sortOrder) || 0,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }
  async function toggleActive(p: PlanRow) {
    const res = await togglePlanActive({ id: p.id, isActive: !p.isActive });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/billing" className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> Billing</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Layers size={22} className="text-violet-600" /> Subscription Plans</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Define pricing tiers, caps and the modules each plan unlocks.</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={15} /> New Plan</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {initial.map((p) => (
          <div key={p.id} className={`rounded-xl border bg-white dark:bg-slate-900 p-5 flex flex-col ${p.isActive ? "border-slate-200 dark:border-slate-800" : "border-slate-200 dark:border-slate-800 opacity-70"}`}>
            <div className="flex items-start justify-between">
              <p className="text-[16px] font-bold text-slate-900 dark:text-white">{p.name}</p>
              {!p.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">Inactive</span>}
            </div>
            <p className="mt-1 text-2xl font-bold text-violet-600">{formatINR(p.priceMonthly)}<span className="text-[13px] text-slate-400 font-medium">/mo</span></p>
            <p className="text-[11px] text-slate-400">{p.priceAnnual !== null ? `${formatINR(p.priceAnnual)}/yr` : "no annual price"}</p>
            <p className="mt-2 text-[12px] text-slate-500">{p.maxStudents ?? "∞"} students · {p.maxStaff ?? "∞"} staff</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {p.features.filter((f) => f !== "core").map((f) => <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300">{f}</span>)}
            </div>
            <div className="mt-auto pt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-3">
              <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 text-[12px] font-medium text-violet-600 hover:text-violet-700"><Pencil size={12} /> Edit</button>
              <button onClick={() => toggleActive(p)} className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-auto"><Power size={12} /> {p.isActive ? "Deactivate" : "Activate"}</button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Layers size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Plan" : "New Plan"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Name <span className="text-rose-500">*</span></label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Price / month (₹)</label><input type="number" min={0} className={inputCls} value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} /></div>
                <div><label className={labelCls}>Price / year (₹)</label><input type="number" min={0} className={inputCls} value={priceAnnual} onChange={(e) => setPriceAnnual(e.target.value)} placeholder="optional" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={labelCls}>Max students</label><input type="number" min={0} className={inputCls} value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} placeholder="∞" /></div>
                <div><label className={labelCls}>Max staff</label><input type="number" min={0} className={inputCls} value={maxStaff} onChange={(e) => setMaxStaff(e.target.value)} placeholder="∞" /></div>
                <div><label className={labelCls}>Order</label><input type="number" className={inputCls} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
              </div>
              <div>
                <label className={labelCls}>Included modules</label>
                <div className="space-y-1.5">
                  {FEATURES.map((f) => (
                    <button key={f.key} type="button" onClick={() => toggleFeature(f.key)} disabled={f.key === "core"}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-[13px] ${features.includes(f.key) ? "border-violet-300 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-700" : "border-slate-200 dark:border-slate-700"} ${f.key === "core" ? "opacity-70 cursor-default" : ""}`}>
                      <span className={`w-4 h-4 rounded flex items-center justify-center border ${features.includes(f.key) ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>{features.includes(f.key) && <Check size={11} />}</span>
                      <span className="text-slate-700 dark:text-slate-300">{f.label}</span>
                      {f.premium && <span className="ml-auto text-[10px] text-amber-600">premium</span>}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded border-slate-300" /> Active (offered to new institutions)
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
