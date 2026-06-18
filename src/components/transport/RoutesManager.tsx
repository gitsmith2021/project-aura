"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Route, Plus, X, Pencil, Trash2, MapPin, Bus, Users, Clock, ChevronRight, GripVertical } from "lucide-react";
import { createRoute, updateRoute, deleteRoute, type RouteRow } from "@/actions/transport";
import { formatTime, type RouteStop } from "@/lib/transport";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type VehicleOpt = { id: string; vehicle_number: string; capacity: number };

export function RoutesManager({ institutionId, initial, vehicles }: {
  institutionId: string; initial: RouteRow[]; vehicles: VehicleOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [morningStart, setMorningStart] = useState("");
  const [eveningStart, setEveningStart] = useState("");
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditId(null); setRouteName(""); setVehicleId(""); setMorningStart(""); setEveningStart("");
    setStops([{ name: "", pickup_time: "" }]); setError(null); setOpen(true);
  }
  function openEdit(r: RouteRow) {
    setEditId(r.id); setRouteName(r.route_name); setVehicleId(r.vehicle?.id ?? "");
    setMorningStart(r.morning_start?.slice(0, 5) ?? ""); setEveningStart(r.evening_start?.slice(0, 5) ?? "");
    setStops(r.stops.length ? r.stops.map((s) => ({ name: s.name, pickup_time: s.pickup_time ?? "" })) : [{ name: "", pickup_time: "" }]);
    setError(null); setOpen(true);
  }

  function setStop(i: number, patch: Partial<RouteStop>) {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addStop() { setStops((prev) => [...prev, { name: "", pickup_time: "" }]); }
  function removeStop(i: number) { setStops((prev) => prev.filter((_, idx) => idx !== i)); }
  function moveStop(i: number, dir: -1 | 1) {
    setStops((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    if (!routeName.trim()) { setError("Route name is required."); return; }
    const cleanStops = stops
      .map((s) => ({ name: s.name.trim(), pickup_time: s.pickup_time?.trim() || null }))
      .filter((s) => s.name.length > 0);
    setBusy(true); setError(null);
    const common = {
      institutionId, routeName, vehicleId: vehicleId || null, stops: cleanStops,
      morningStart: morningStart || null, eveningStart: eveningStart || null,
    };
    const res = editId ? await updateRoute({ ...common, id: editId }) : await createRoute(common);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }

  async function remove(r: RouteRow) {
    if (!confirm(`Delete route "${r.route_name}"? Its ${r.studentCount} allocation(s) will be removed.`)) return;
    const res = await deleteRoute({ institutionId, id: r.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Route size={22} className="text-sky-600" /> Bus Routes</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Define routes, stops and timings; assign a vehicle and allocate students.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/institutions/${institutionId}/transport/vehicles`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Bus size={15} /> Vehicles</Link>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"><Plus size={15} /> Add Route</button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No routes defined yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initial.map((r) => (
            <div key={r.id} className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/institutions/${institutionId}/transport/${r.id}`} className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 flex items-center gap-1">{r.route_name} <ChevronRight size={14} className="text-slate-300 group-hover:text-sky-500" /></p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1"><Bus size={11} /> {r.vehicle?.vehicle_number ?? "No vehicle"}</p>
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><MapPin size={11} /> {r.stopCount} stops</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300"><Users size={11} /> {r.studentCount}{r.vehicle ? `/${r.vehicle.capacity}` : ""}</span>
              </div>
              {(r.morning_start || r.evening_start) && (
                <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1"><Clock size={11} /> AM {formatTime(r.morning_start)} · PM {formatTime(r.evening_start)}</p>
              )}
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1 text-[12px] font-medium text-sky-600 hover:text-sky-700"><Pencil size={12} /> Edit</button>
                <button onClick={() => remove(r)} className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-500 hover:text-rose-600 ml-auto"><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Route size={18} className="text-sky-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Route" : "Add Route"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Route name <span className="text-rose-500">*</span></label><input className={inputCls} value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Route 1 — City Centre" /></div>
              <div><label className={labelCls}>Vehicle</label>
                <select className={inputCls} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number} ({v.capacity} seats)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Morning start</label><input type="time" className={inputCls} value={morningStart} onChange={(e) => setMorningStart(e.target.value)} /></div>
                <div><label className={labelCls}>Evening start</label><input type="time" className={inputCls} value={eveningStart} onChange={(e) => setEveningStart(e.target.value)} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1"><label className={labelCls + " mb-0"}>Stops (in pickup order)</label><button onClick={addStop} className="text-[12px] font-medium text-sky-600 hover:text-sky-700 inline-flex items-center gap-1"><Plus size={12} /> Add stop</button></div>
                <div className="space-y-2">
                  {stops.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="flex flex-col">
                        <button onClick={() => moveStop(i, -1)} disabled={i === 0} className="text-slate-300 hover:text-slate-500 disabled:opacity-30"><GripVertical size={12} /></button>
                      </div>
                      <input className={inputCls + " flex-1"} value={s.name} onChange={(e) => setStop(i, { name: e.target.value })} placeholder={`Stop ${i + 1} name`} />
                      <input type="time" className={inputCls + " w-28"} value={s.pickup_time ?? ""} onChange={(e) => setStop(i, { pickup_time: e.target.value })} />
                      <button onClick={() => removeStop(i)} className="p-1.5 text-slate-400 hover:text-rose-500"><X size={14} /></button>
                    </div>
                  ))}
                  {stops.length === 0 && <p className="text-[12px] text-slate-400">No stops added.</p>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save changes" : "Add Route"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
