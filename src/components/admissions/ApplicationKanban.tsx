"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Link2, Check, ArrowRight, X, GraduationCap, ChevronRight } from "lucide-react";
import { updateApplicationStatus } from "@/actions/admissions";
import {
  ADMISSION_PIPELINE, ADMISSION_STATUS_LABELS, ADMISSION_STATUS_COLORS, admissionStats,
  nextAdmissionStatus, canEnroll, canReject, type Admission, type AdmissionStatus,
} from "@/lib/admissions";
import { EnrollModal } from "./EnrollModal";

export function ApplicationKanban({ institutionId, instSlug, initial }: {
  institutionId: string; instSlug: string; initial: Admission[];
}) {
  const [apps, setApps] = useState<Admission[]>(initial);
  const [enrollFor, setEnrollFor] = useState<Admission | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => admissionStats(apps), [apps]);
  const columns = useMemo(() => {
    const map: Record<string, Admission[]> = {};
    for (const s of ADMISSION_PIPELINE) map[s] = [];
    for (const a of apps) (map[a.status] ??= []).push(a);
    return map;
  }, [apps]);
  const rejected = apps.filter((a) => a.status === "rejected");

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/admissions/${instSlug}` : `/admissions/${instSlug}`;

  const move = async (a: Admission, status: AdmissionStatus) => {
    setBusy(a.id); setError(null);
    const res = await updateApplicationStatus({ institutionId, applicationId: a.id, status });
    setBusy(null);
    if (!res.success) { setError(res.error); return; }
    setApps((prev) => prev.map((x) => (x.id === a.id ? { ...x, status } : x)));
  };

  const copyLink = () => { navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Admissions</h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Applicant pipeline — shortlist, interview, admit, and enroll in one click.</p>
        </div>
        <button type="button" onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
          {copied ? <Check size={14} /> : <Link2 size={14} />} {copied ? "Link copied" : "Public application link"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <Stat label="Total" value={stats.total} />
        <Stat label="In pipeline" value={stats.inPipeline} />
        <Stat label="Admitted" value={stats.admitted} tone="violet" />
        <Stat label="Enrolled" value={stats.enrolled} tone="emerald" />
        <Stat label="Rejected" value={stats.rejected} tone="rose" />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-3">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-5 sm:grid-cols-2">
        {ADMISSION_PIPELINE.map((col) => (
          <div key={col} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-2">
            <div className="flex items-center justify-between px-1.5 py-1 mb-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${ADMISSION_STATUS_COLORS[col]}`}>{ADMISSION_STATUS_LABELS[col]}</span>
              <span className="text-[11px] text-slate-400">{columns[col].length}</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {columns[col].map((a) => {
                const nxt = nextAdmissionStatus(a.status);
                return (
                  <div key={a.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
                    <Link href={`/institutions/${institutionId}/admissions/${a.id}`} className="block">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate hover:text-indigo-600">{a.applicant_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {a.program_applied}{a.departments?.name ? ` · ${a.departments.name}` : ""}{a.marks_percentage != null ? ` · ${a.marks_percentage}%` : ""}
                      </p>
                    </Link>
                    <div className="flex items-center gap-1 mt-2">
                      {canEnroll(a.status) ? (
                        <button type="button" onClick={() => setEnrollFor(a)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-emerald-600 text-white text-[10px] font-semibold rounded-md hover:bg-emerald-700">
                          <GraduationCap size={11} /> Enroll
                        </button>
                      ) : nxt ? (
                        <button type="button" onClick={() => move(a, nxt)} disabled={busy === a.id} className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-indigo-600 text-white text-[10px] font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50">
                          {ADMISSION_STATUS_LABELS[nxt]} <ArrowRight size={11} />
                        </button>
                      ) : null}
                      {canReject(a.status) && (
                        <button type="button" onClick={() => move(a, "rejected")} disabled={busy === a.id} title="Reject" className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-40"><X size={13} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
              {columns[col].length === 0 && <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 py-3">—</p>}
            </div>
          </div>
        ))}
      </div>

      {rejected.length > 0 && (
        <details className="mt-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <summary className="px-4 py-2.5 text-xs font-semibold text-slate-500 cursor-pointer">Rejected ({rejected.length})</summary>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rejected.map((a) => (
              <Link key={a.id} href={`/institutions/${institutionId}/admissions/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{a.applicant_name}</p>
                  <p className="text-[10px] text-slate-400">{a.program_applied}{a.departments?.name ? ` · ${a.departments.name}` : ""}</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </Link>
            ))}
          </div>
        </details>
      )}

      {enrollFor && <EnrollModal institutionId={institutionId} application={enrollFor} onClose={() => setEnrollFor(null)} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "violet" | "emerald" | "rose" }) {
  const color = tone === "violet" ? "text-violet-600 dark:text-violet-400" : tone === "emerald" ? "text-emerald-600 dark:text-emerald-400" : tone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
