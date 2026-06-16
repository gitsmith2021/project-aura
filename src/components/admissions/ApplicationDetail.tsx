"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, MapPin, School, FileText, GraduationCap, X, Save } from "lucide-react";
import { updateApplicationStatus } from "@/actions/admissions";
import {
  ADMISSION_PIPELINE, ADMISSION_STATUS_LABELS, ADMISSION_STATUS_COLORS, canEnroll, canReject,
  type Admission, type AdmissionStatus,
} from "@/lib/admissions";
import { EnrollModal } from "./EnrollModal";

export function ApplicationDetail({ institutionId, application }: { institutionId: string; application: Admission }) {
  const [app, setApp] = useState<Admission>(application);
  const [notes, setNotes] = useState(application.admin_notes ?? "");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState(false);

  const setStatus = async (status: AdmissionStatus) => {
    setBusy(true); setError(null);
    const res = await updateApplicationStatus({ institutionId, applicationId: app.id, status });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setApp((p) => ({ ...p, status }));
  };

  const saveNotes = async () => {
    setBusy(true); setError(null);
    const res = await updateApplicationStatus({ institutionId, applicationId: app.id, status: app.status, notes });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSavedNotes(true); setTimeout(() => setSavedNotes(false), 2000);
  };

  return (
    <div className="px-6 pt-6 pb-6 w-full max-w-3xl">
      <Link href={`/institutions/${institutionId}/admissions`} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium mb-4">
        <ArrowLeft size={13} /> Admissions pipeline
      </Link>

      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">{app.applicant_name}</h1>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${ADMISSION_STATUS_COLORS[app.status]}`}>{ADMISSION_STATUS_LABELS[app.status]}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {app.program_applied}{app.departments?.name ? ` · ${app.departments.name}` : ""} · applied {new Date(app.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        {canEnroll(app.status) && (
          <button type="button" onClick={() => setEnrollOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 shrink-0"><GraduationCap size={14} /> Enroll</button>
        )}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {/* details */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <Info icon={<Mail size={13} />} label="Email" value={app.applicant_email} />
        <Info icon={<Phone size={13} />} label="Phone" value={app.applicant_phone ?? "—"} />
        <Info icon={<Calendar size={13} />} label="Date of birth" value={app.dob ?? "—"} />
        <Info icon={<School size={13} />} label="Previous school" value={app.previous_school ?? "—"} />
        <Info icon={<GraduationCap size={13} />} label="Qualifying marks" value={app.marks_percentage != null ? `${app.marks_percentage}%` : "—"} />
        <Info icon={<MapPin size={13} />} label="Address" value={app.address ?? "—"} />
      </div>

      {/* documents */}
      {app.documents_url && app.documents_url.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Documents</p>
          <div className="flex flex-wrap gap-2">
            {app.documents_url.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                <FileText size={12} /> {d.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* status controls */}
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Move to stage</p>
        <div className="flex flex-wrap gap-1.5">
          {ADMISSION_PIPELINE.map((s) => (
            <button key={s} type="button" onClick={() => setStatus(s)} disabled={busy || app.status === s} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
              app.status === s ? "bg-indigo-600 text-white border-indigo-700" : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            } disabled:opacity-50`}>{ADMISSION_STATUS_LABELS[s]}</button>
          ))}
          {canReject(app.status) && (
            <button type="button" onClick={() => setStatus("rejected")} disabled={busy} className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50 flex items-center gap-1"><X size={11} /> Reject</button>
          )}
        </div>
      </div>

      {/* admin notes */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Admin notes</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        <button type="button" onClick={saveNotes} disabled={busy} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
          <Save size={13} /> {savedNotes ? "Saved" : "Save notes"}
        </button>
      </div>

      {enrollOpen && <EnrollModal institutionId={institutionId} application={app} onClose={() => setEnrollOpen(false)} />}
    </div>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">{icon} {label}</p>
      <p className="text-xs text-slate-700 dark:text-slate-200 break-words">{value}</p>
    </div>
  );
}
