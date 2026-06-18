"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert, Plus, X, Search, Download, ChevronRight, ShieldX, FileWarning, CheckCircle2, AlertTriangle,
} from "lucide-react";
import {
  INCIDENT_TYPE_LABELS, INCIDENT_TYPE_COLORS, INCIDENT_STATUS_LABELS, INCIDENT_STATUS_COLORS,
  INCIDENT_TYPES, INCIDENT_STATUSES, filterIncidents, disciplinaryStats, incidentsCSV,
  type DisciplinaryIncident, type IncidentType, type IncidentStatus,
} from "@/lib/disciplinary";
import { reportIncident } from "@/actions/disciplinary";

type Student = { id: string; full_name: string; roll_no: string | null };

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function IncidentRegister({
  institutionId, instSlug, students, initial,
}: {
  institutionId: string; instSlug: string; students: Student[]; initial: DisciplinaryIncident[];
}) {
  const router = useRouter();
  const [type, setType] = useState<IncidentType | "all">("all");
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [fType, setFType] = useState<IncidentType>("misconduct");
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10));
  const [fStudent, setFStudent] = useState("");
  const [fLocation, setFLocation] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => disciplinaryStats(initial), [initial]);
  const filtered = useMemo(() => filterIncidents(initial, { type, status, search }), [initial, type, status, search]);

  async function create() {
    if (!fDesc.trim()) { setError("A description is required."); return; }
    setBusy(true); setError(null);
    const res = await reportIncident({
      institutionId, incidentType: fType, incidentDate: fDate,
      description: fDesc, studentId: fStudent || null, location: fLocation || null,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false);
    setFType("misconduct"); setFStudent(""); setFLocation(""); setFDesc("");
    router.refresh();
  }

  function exportCSV() {
    const blob = new Blob([incidentsCSV(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `disciplinary-register-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls = "px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500";
  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert size={22} className="text-purple-600" /> Disciplinary Register
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Incident records, committee actions and NAAC 6.2 evidence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/institutions/${instSlug}/disciplinary/anti-ragging`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30">
            <ShieldX size={15} /> Anti-Ragging
          </Link>
          <button onClick={() => { setOpen(true); setError(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700">
            <Plus size={15} /> Report Incident
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<FileWarning size={18} className="text-amber-600" />} label="Open Cases" value={stats.open} accent="bg-amber-100 dark:bg-amber-950/40" />
        <StatCard icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Resolution Rate" value={`${stats.resolutionRate}%`} accent="bg-emerald-100 dark:bg-emerald-950/40" />
        <StatCard icon={<ShieldX size={18} className="text-rose-600" />} label="Ragging Cases" value={stats.raggingCases} accent="bg-rose-100 dark:bg-rose-950/40" />
        <StatCard icon={<AlertTriangle size={18} className="text-orange-600" />} label="Escalated" value={stats.escalated} accent="bg-orange-100 dark:bg-orange-950/40" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, student, location…"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as IncidentType | "all")}>
          <option value="all">All types</option>
          {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>)}
        </select>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus | "all")}>
          <option value="all">All statuses</option>
          {INCIDENT_STATUSES.map((s) => <option key={s} value={s}>{INCIDENT_STATUS_LABELS[s]}</option>)}
        </select>
        <button onClick={exportCSV} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          <Download size={14} /> CSV
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Date</th>
              <th className="text-left font-medium px-4 py-2.5">Type</th>
              <th className="text-left font-medium px-4 py-2.5">Student</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No incidents match these filters.</td></tr>
            ) : filtered.map((i) => (
              <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{new Date(i.incident_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${INCIDENT_TYPE_COLORS[i.incident_type]}`}>{INCIDENT_TYPE_LABELS[i.incident_type]}</span></td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                  {i.is_anonymous ? <span className="text-slate-400 italic">Anonymous report</span> : (i.students?.full_name ?? "—")}
                  {i.students?.roll_no && <span className="text-[11px] text-slate-400"> · {i.students.roll_no}</span>}
                </td>
                <td className="px-4 py-2.5"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${INCIDENT_STATUS_COLORS[i.status]}`}>{INCIDENT_STATUS_LABELS[i.status]}</span></td>
                <td className="px-4 py-2.5 text-right">
                  <Link href={`/institutions/${instSlug}/disciplinary/${i.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
                    Review <ChevronRight size={13} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Report drawer */}
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><ShieldAlert size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Report Incident</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={fType} onChange={(e) => setFType(e.target.value as IncidentType)}>
                    {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={fDate} onChange={(e) => setFDate(e.target.value)} /></div>
              </div>
              <div>
                <label className={labelCls}>Student involved <span className="text-slate-400 font-normal">(optional)</span></label>
                <select className={inputCls} value={fStudent} onChange={(e) => setFStudent(e.target.value)}>
                  <option value="">Not specified</option>
                  {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.roll_no ? ` (${s.roll_no})` : ""}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Location</label><input className={inputCls} value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="e.g. Block A corridor" /></div>
              <div><label className={labelCls}>Description <span className="text-rose-500">*</span></label><textarea className={`${inputCls} min-h-[110px]`} value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="What happened…" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={create} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Saving…" : "File Report"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
