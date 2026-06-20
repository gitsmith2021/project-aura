"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bus, MapPin, Clock, Users, X, UserPlus, Trash2, Phone, AlertTriangle } from "lucide-react";
import { assignStudent, unassignStudent, type RouteDetail } from "@/actions/transport";
import { VEHICLE_TYPE_LABELS, formatTime, expiryState } from "@/lib/transport";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type Student = { id: string; full_name: string; roll_no: string | null };
type Year = { id: string; label: string; is_current: boolean };

export function RouteDetailManager({ institutionId, route, students, years }: {
  institutionId: string; route: RouteDetail; students: Student[]; years: Year[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [boardingStop, setBoardingStop] = useState(route.stops[0]?.name ?? "");
  const [academicYearId, setAcademicYearId] = useState(years.find((y) => y.is_current)?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocatedIds = new Set(route.allocations.map((a) => a.studentId));
  const available = students.filter((s) => !allocatedIds.has(s.id));
  const v = route.vehicle;
  const overCapacity = v ? route.allocations.length > v.capacity : false;

  async function assign() {
    if (!studentId) { setError("Select a student."); return; }
    if (!boardingStop.trim()) { setError("Boarding stop is required."); return; }
    setBusy(true); setError(null);
    const res = await assignStudent({ institutionId, routeId: route.id, studentId, boardingStop, academicYearId: academicYearId || null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); setStudentId(""); router.refresh();
  }

  async function remove(allocationId: string, name: string) {
    if (!confirm(`Remove ${name} from this route?`)) return;
    const res = await unassignStudent({ institutionId, routeId: route.id, allocationId });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={`/institutions/${institutionId}/transport`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-sky-600 mb-2"><ArrowLeft size={13} /> All routes</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{route.route_name}</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><MapPin size={13} /> {route.stops.length} stops</span>
              <span className="inline-flex items-center gap-1"><Clock size={13} /> AM {formatTime(route.morning_start)} · PM {formatTime(route.evening_start)}</span>
              <span className="inline-flex items-center gap-1"><Users size={13} /> {route.allocations.length}{v ? `/${v.capacity}` : ""} students</span>
            </p>
          </div>
          <button onClick={() => { setOpen(true); setError(null); setStudentId(""); setBoardingStop(route.stops[0]?.name ?? ""); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"><UserPlus size={15} /> Allocate student</button>
        </div>
      </div>

      {overCapacity && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 text-[12px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5"><AlertTriangle size={14} /> Allocations exceed the vehicle&apos;s {v?.capacity}-seat capacity.</div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Vehicle + stops */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Vehicle</p>
            {v ? (
              <div className="space-y-1.5">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5"><Bus size={15} className="text-sky-500" /> {v.vehicle_number}</p>
                <p className="text-[12px] text-slate-500">{VEHICLE_TYPE_LABELS[v.vehicle_type]} · {v.capacity} seats</p>
                <p className="text-[12px] text-slate-600 dark:text-slate-300">{v.driver_name}</p>
                <p className="text-[12px] text-slate-500 flex items-center gap-1"><Phone size={11} /> {v.driver_phone}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {expiryState(v.insurance_expiry) === "expired" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Insurance expired</span>}
                  {expiryState(v.fitness_expiry) === "expired" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Fitness expired</span>}
                </div>
              </div>
            ) : <p className="text-[13px] text-slate-400">No vehicle assigned. Edit the route to attach one.</p>}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Stops</p>
            {route.stops.length === 0 ? <p className="text-[13px] text-slate-400">No stops defined.</p> : (
              <ol className="space-y-0">
                {route.stops.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 pb-3 last:pb-0 relative">
                    <div className="flex flex-col items-center">
                      <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      {i < route.stops.length - 1 && <span className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" style={{ minHeight: 16 }} />}
                    </div>
                    <div className="min-w-0 -mt-0.5">
                      <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                      {s.pickup_time && <p className="text-[11px] text-slate-400">{formatTime(s.pickup_time)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Allocated students */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800"><p className="text-[13px] font-semibold text-slate-900 dark:text-white">Allocated students ({route.allocations.length})</p></div>
          {route.allocations.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-[13px]">No students allocated to this route yet.</div>
          ) : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 font-medium">Student</th><th className="px-4 py-2 font-medium">Roll no.</th><th className="px-4 py-2 font-medium">Boarding stop</th><th className="px-4 py-2"></th>
              </tr></thead>
              <tbody>
                {route.allocations.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{a.studentName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{a.rollNo ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300"><span className="inline-flex items-center gap-1"><MapPin size={11} className="text-slate-400" /> {a.boardingStop}</span></td>
                    <td className="px-4 py-2.5 text-right"><button onClick={() => remove(a.id, a.studentName)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><UserPlus size={18} className="text-sky-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Allocate Student</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className={labelCls}>Student</label>
                <select className={inputCls} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                  <option value="">Select student</option>
                  {available.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.roll_no ? ` (${s.roll_no})` : ""}</option>)}
                </select>
                {available.length === 0 && <p className="text-[11px] text-slate-400 mt-1">All active students are already allocated.</p>}
              </div>
              <div>
                <label className={labelCls}>Boarding stop</label>
                {route.stops.length > 0 ? (
                  <select className={inputCls} value={boardingStop} onChange={(e) => setBoardingStop(e.target.value)}>
                    {route.stops.map((s, i) => <option key={i} value={s.name}>{s.name}{s.pickup_time ? ` — ${formatTime(s.pickup_time)}` : ""}</option>)}
                  </select>
                ) : (
                  <input className={inputCls} value={boardingStop} onChange={(e) => setBoardingStop(e.target.value)} placeholder="Stop name" />
                )}
              </div>
              <div>
                <label className={labelCls}>Academic year</label>
                <select className={inputCls} value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                  <option value="">— None —</option>
                  {years.map((y) => <option key={y.id} value={y.id}>{y.label}{y.is_current ? " (current)" : ""}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={assign} disabled={busy || !studentId} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">{busy ? "Allocating…" : "Allocate"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
