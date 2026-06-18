"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, IndianRupee, Calendar, Lock, CheckCircle2, Upload, X, Loader2, FileText } from "lucide-react";
import {
  SCHEME_TYPE_LABELS, SCHEME_TYPE_COLORS, STATUS_LABELS, STATUS_COLORS, formatINR,
  type ScholarshipApplication,
} from "@/lib/scholarships";
import { applyForScholarship, type StudentSchemeView } from "@/actions/scholarships";
import { uploadDocument } from "@/lib/storage";

function ApplyDrawer({ scheme, academicYearId, onClose }: {
  scheme: StudentSchemeView; academicYearId: string | null; onClose: () => void;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    const documents: { name: string; url: string }[] = [];
    for (const f of files) {
      const up = await uploadDocument("scholarship-docs", f, scheme.id);
      if (!up.success) { setBusy(false); setError(`Upload failed: ${up.error}`); return; }
      documents.push({ name: f.name, url: up.url });
    }
    const res = await applyForScholarship({ schemeId: scheme.id, academicYearId, documents: documents.length ? documents : null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2"><Award size={18} className="text-indigo-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Apply</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{scheme.name}</p>
            <p className="text-[12px] text-slate-500">{formatINR(scheme.amount_per_student)} per student</p>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Proof documents <span className="text-slate-400 font-normal">(income / category certificate, marksheet)</span></label>
            <label className="flex items-center gap-2 px-3 py-2 text-[13px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <Upload size={14} /> <span>Add files</span>
              <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => <li key={i} className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300"><FileText size={12} className="text-slate-400" /> {f.name}</li>)}
              </ul>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} {busy ? "Submitting…" : "Submit Application"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentScholarshipsView({ schemes, myApplications, academicYearId }: {
  schemes: StudentSchemeView[]; myApplications: ScholarshipApplication[]; academicYearId: string | null;
}) {
  const [applyScheme, setApplyScheme] = useState<StudentSchemeView | null>(null);

  return (
    <div className="space-y-8">
      {/* My applications */}
      {myApplications.length > 0 && (
        <section>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-3">My Applications</h2>
          <div className="space-y-2">
            {myApplications.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{a.scholarship_schemes?.name ?? "Scheme"}</p>
                  <p className="text-[11px] text-slate-400">Applied {new Date(a.application_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status]}`}>{STATUS_LABELS[a.status]}</span>
                  {a.status === "disbursed" && a.disbursed_amount != null && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(a.disbursed_amount)} credited to fees</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available schemes */}
      <section>
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-3">Available Schemes</h2>
        {schemes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
            No scholarship schemes are open right now.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {schemes.map((s) => {
              const canApply = !s.myStatus && s.eligible && !s.deadlinePassed;
              return (
                <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{s.name}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${SCHEME_TYPE_COLORS[s.scheme_type]}`}>{SCHEME_TYPE_LABELS[s.scheme_type]}</span>
                  </div>
                  {s.description && <p className="text-[12px] text-slate-500 mt-1 line-clamp-2">{s.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><IndianRupee size={12} className="text-slate-400" />{formatINR(s.amount_per_student)}</span>
                    {s.application_deadline && <span className="inline-flex items-center gap-1"><Calendar size={12} className="text-slate-400" />{new Date(s.application_deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {s.myStatus ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px]">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span className={`font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[s.myStatus]}`}>{STATUS_LABELS[s.myStatus]}</span>
                      </span>
                    ) : !s.eligible ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400"><Lock size={13} /> {s.reasons[0] ?? "Not eligible"}</span>
                    ) : s.deadlinePassed ? (
                      <span className="text-[12px] text-slate-400">Deadline passed</span>
                    ) : (
                      <span className="text-[12px] text-slate-400">You&apos;re eligible</span>
                    )}
                    {canApply && (
                      <button onClick={() => setApplyScheme(s)} className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Apply</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {applyScheme && <ApplyDrawer scheme={applyScheme} academicYearId={academicYearId} onClose={() => setApplyScheme(null)} />}
    </div>
  );
}
