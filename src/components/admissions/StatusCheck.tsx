"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { checkApplicationStatus, type StatusCheckResult } from "@/actions/admissions";
import { ADMISSION_STATUS_COLORS, ADMISSION_STATUS_LABELS, type AdmissionStatus } from "@/lib/admissions";

const inputCls =
  "w-full h-10 px-3 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500";

export function StatusCheck({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [results, setResults] = useState<StatusCheckResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setLoading(true); setError(null); setResults(null);
    const res = await checkApplicationStatus(slug, email, dob);
    setLoading(false);
    if (!res.success) { setError(res.error); return; }
    setResults(res.data);
  };

  return (
    <div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Email used to apply</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Date of birth</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} />
        </div>
        <button type="button" onClick={check} disabled={loading || !email || !dob} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Check status
        </button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mt-3">{error}</p>}

      {results && (
        results.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No application found for that email + date of birth.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {results.map((r, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.applicant_name}</p>
                  <p className="text-[11px] text-slate-400">{r.program_applied} · applied {new Date(r.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${ADMISSION_STATUS_COLORS[r.status as AdmissionStatus]}`}>{ADMISSION_STATUS_LABELS[r.status as AdmissionStatus]}</span>
              </div>
            ))}
          </div>
        )
      )}

      <p className="text-center text-[11px] text-slate-400 mt-4">
        <Link href={`/admissions/${slug}`} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">← Back to application</Link>
      </p>
    </div>
  );
}
