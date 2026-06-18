"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { INCIDENT_TYPES, INCIDENT_TYPE_LABELS, type IncidentType } from "@/lib/disciplinary";
import { submitReport } from "@/actions/disciplinary";

export function StudentReportForm() {
  const [type, setType] = useState<IncidentType>("ragging");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!description.trim()) { setError("Please describe the incident."); return; }
    setBusy(true); setError(null);
    const res = await submitReport({ incidentType: type, incidentDate: date, location: location || null, description, anonymous });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={26} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-[15px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">Report submitted</h2>
        <p className="text-[13px] text-emerald-700 dark:text-emerald-400/90">
          Thank you for speaking up. The disciplinary committee has received your report{anonymous ? " anonymously" : ""} and will act on it.
        </p>
      </div>
    );
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Type of incident</label>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
            {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{INCIDENT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div><label className={labelCls}>When did it happen?</label><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      <div><label className={labelCls}>Where? <span className="text-slate-400 font-normal">(optional)</span></label><input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hostel Block B, room 204" /></div>
      <div><label className={labelCls}>What happened? <span className="text-rose-500">*</span></label><textarea className={`${inputCls} min-h-[130px]`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the incident in as much detail as you're comfortable with." /></div>

      <label className="flex items-start gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 cursor-pointer">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-indigo-600 mt-0.5" />
        <span className="text-[12px] text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200"><Lock size={12} /> Report anonymously</span>
          <br />Your name will not be stored or shown to anyone — the committee sees only the incident details.
        </span>
      </label>

      <div className="flex justify-end">
        <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy && <Loader2 size={14} className="animate-spin" />} {busy ? "Submitting…" : "Submit Report"}
        </button>
      </div>
    </div>
  );
}
