"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bus, Plus, X, Pencil, Trash2, AlertTriangle, ShieldCheck, Phone, IdCard } from "lucide-react";
import {
  createVehicle, updateVehicle, deleteVehicle, type VehicleRow,
} from "@/actions/transport";
import {
  VEHICLE_TYPES, VEHICLE_TYPE_LABELS, expiryState, daysUntil, type VehicleType, type ComplianceAlert,
} from "@/lib/transport";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type Draft = {
  vehicleNumber: string; vehicleType: VehicleType; capacity: string;
  driverName: string; driverPhone: string; driverLicense: string;
  insuranceExpiry: string; fitnessExpiry: string; isActive: boolean;
};

const EMPTY: Draft = {
  vehicleNumber: "", vehicleType: "bus", capacity: "40",
  driverName: "", driverPhone: "", driverLicense: "",
  insuranceExpiry: "", fitnessExpiry: "", isActive: true,
};

function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
  const state = expiryState(date);
  if (state === "none") return <span className="text-[10px] text-slate-400">{label}: —</span>;
  const days = daysUntil(date)!;
  const cls =
    state === "expired" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
    : state === "expiring" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  const text = state === "expired" ? `${label}: expired` : state === "expiring" ? `${label}: ${days}d left` : `${label}: ${date}`;
  return <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${cls}`}>{state !== "ok" && <AlertTriangle size={9} />}{text}</span>;
}

export function VehiclesManager({ institutionId, initial, alerts }: {
  institutionId: string; initial: VehicleRow[]; alerts: ComplianceAlert[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() { setEditId(null); setDraft(EMPTY); setError(null); setOpen(true); }
  function openEdit(v: VehicleRow) {
    setEditId(v.id);
    setDraft({
      vehicleNumber: v.vehicle_number, vehicleType: v.vehicle_type, capacity: String(v.capacity),
      driverName: v.driver_name, driverPhone: v.driver_phone, driverLicense: v.driver_license ?? "",
      insuranceExpiry: v.insurance_expiry ?? "", fitnessExpiry: v.fitness_expiry ?? "", isActive: v.is_active,
    });
    setError(null); setOpen(true);
  }

  async function save() {
    if (!draft.vehicleNumber.trim() || !draft.driverName.trim() || !draft.driverPhone.trim()) {
      setError("Vehicle number, driver name and phone are required."); return;
    }
    const capacity = Math.max(1, Number(draft.capacity) || 0);
    setBusy(true); setError(null);
    const common = {
      institutionId, vehicleNumber: draft.vehicleNumber, vehicleType: draft.vehicleType, capacity,
      driverName: draft.driverName, driverPhone: draft.driverPhone, driverLicense: draft.driverLicense || null,
      insuranceExpiry: draft.insuranceExpiry || null, fitnessExpiry: draft.fitnessExpiry || null,
    };
    const res = editId
      ? await updateVehicle({ ...common, id: editId, isActive: draft.isActive })
      : await createVehicle(common);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }

  async function remove(v: VehicleRow) {
    if (!confirm(`Remove vehicle ${v.vehicle_number}? Routes using it will be unassigned.`)) return;
    const res = await deleteVehicle({ institutionId, id: v.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Bus size={22} className="text-sky-600" /> Vehicles &amp; Drivers</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Fleet registry with insurance &amp; fitness-certificate expiry alerts.</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"><Plus size={15} /> Add Vehicle</button>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2"><AlertTriangle size={15} /> {alerts.length} compliance alert{alerts.length > 1 ? "s" : ""}</p>
          <div className="flex flex-wrap gap-1.5">
            {alerts.map((a, i) => (
              <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ${a.state === "expired" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"}`}>
                {a.vehicleNumber} · {a.kind} {a.state === "expired" ? "expired" : `in ${a.days}d`}
              </span>
            ))}
          </div>
        </div>
      )}

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No vehicles registered yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initial.map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><Bus size={15} className="text-sky-500 shrink-0" /> {v.vehicle_number}</p>
                  <p className="text-[11px] text-slate-400">{VEHICLE_TYPE_LABELS[v.vehicle_type]} · {v.capacity} seats</p>
                </div>
                {v.is_active
                  ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0 flex items-center gap-1"><ShieldCheck size={10} /> Active</span>
                  : <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">Inactive</span>}
              </div>
              <div className="mt-3 space-y-1 text-[12px] text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-1.5"><IdCard size={12} className="text-slate-400" /> {v.driver_name}</p>
                <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {v.driver_phone}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <ExpiryBadge date={v.insurance_expiry} label="Ins" />
                <ExpiryBadge date={v.fitness_expiry} label="Fit" />
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <button onClick={() => openEdit(v)} className="inline-flex items-center gap-1 text-[12px] font-medium text-sky-600 hover:text-sky-700"><Pencil size={12} /> Edit</button>
                <button onClick={() => remove(v)} className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-500 hover:text-rose-600 ml-auto"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Bus size={18} className="text-sky-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Vehicle" : "Add Vehicle"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Vehicle no. <span className="text-rose-500">*</span></label><input className={inputCls} value={draft.vehicleNumber} onChange={(e) => setDraft({ ...draft, vehicleNumber: e.target.value })} placeholder="TN12AB1234" /></div>
                <div><label className={labelCls}>Type</label>
                  <select className={inputCls} value={draft.vehicleType} onChange={(e) => setDraft({ ...draft, vehicleType: e.target.value as VehicleType })}>
                    {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{VEHICLE_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={labelCls}>Capacity</label><input type="number" min={1} className={inputCls} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} /></div>
              <div><label className={labelCls}>Driver name <span className="text-rose-500">*</span></label><input className={inputCls} value={draft.driverName} onChange={(e) => setDraft({ ...draft, driverName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Driver phone <span className="text-rose-500">*</span></label><input className={inputCls} value={draft.driverPhone} onChange={(e) => setDraft({ ...draft, driverPhone: e.target.value })} /></div>
                <div><label className={labelCls}>License no.</label><input className={inputCls} value={draft.driverLicense} onChange={(e) => setDraft({ ...draft, driverLicense: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Insurance expiry</label><input type="date" className={inputCls} value={draft.insuranceExpiry} onChange={(e) => setDraft({ ...draft, insuranceExpiry: e.target.value })} /></div>
                <div><label className={labelCls}>Fitness expiry</label><input type="date" className={inputCls} value={draft.fitnessExpiry} onChange={(e) => setDraft({ ...draft, fitnessExpiry: e.target.value })} /></div>
              </div>
              {editId && (
                <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} className="rounded border-slate-300" /> Active (in service)
                </label>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save changes" : "Add Vehicle"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
