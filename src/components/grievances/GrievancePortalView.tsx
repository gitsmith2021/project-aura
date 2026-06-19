"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scale, Loader2, Lock, ShieldCheck } from "lucide-react";
import {
  GRIEVANCE_CATEGORIES, CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS,
  isSensitiveCategory, type Grievance, type GrievanceCategory,
} from "@/lib/grievances";
import { submitGrievance } from "@/actions/grievances";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function GrievancePortalView({ initial }: { initial: Grievance[] }) {
  const router = useRouter();
  const [category, setCategory] = useState<GrievanceCategory>("academic");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onCategoryChange(c: GrievanceCategory) {
    setCategory(c);
    // Pre-select anonymity for sensitive categories (harassment/ragging/conduct).
    if (isSensitiveCategory(c)) setAnonymous(true);
  }

  async function submit() {
    if (!subject.trim()) { setError("Please add a subject."); return; }
    if (!description.trim()) { setError("Please describe your grievance."); return; }
    setBusy(true); setError(null);
    const res = await submitGrievance({ category, subject, description, anonymous });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSubject(""); setDescription(""); setDone(true);
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Scale size={22} className="text-purple-600" /> Grievance Redressal
        </h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          Raise a concern with the institution. Sensitive matters (harassment, ragging, staff conduct)
          can be submitted anonymously — your identity will not be stored.
        </p>
      </div>

      {done && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[13px] text-emerald-700 dark:text-emerald-300">
            Your grievance has been submitted{anonymous ? " anonymously" : ""}. The institution will review and respond
            {anonymous ? "" : " — track its status below"}.
          </p>
        </div>
      )}

      {/* Submission form */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={category} onChange={(e) => onCategoryChange(e.target.value as GrievanceCategory)}>
              {GRIEVANCE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Subject <span className="text-rose-500">*</span></label>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="A short summary" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Details <span className="text-rose-500">*</span></label>
          <textarea className={`${inputCls} min-h-[130px]`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your grievance in as much detail as you're comfortable with." />
        </div>

        <label className="flex items-start gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 cursor-pointer">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-purple-600 mt-0.5" />
          <span className="text-[12px] text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200"><Lock size={12} /> Submit anonymously</span>
            <br />Your name will not be stored or shown to anyone. Note: anonymous grievances can&apos;t be tracked below.
          </span>
        </label>

        <div className="flex justify-end">
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} {busy ? "Submitting…" : "Submit Grievance"}
          </button>
        </div>
      </div>

      {/* Tracking list */}
      <div>
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-2">My Grievances</h2>
        {initial.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-10 text-center text-[13px] text-slate-400">
            You haven&apos;t raised any (non-anonymous) grievances yet.
          </div>
        ) : (
          <div className="space-y-2">
            {initial.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{g.subject}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{CATEGORY_LABELS[g.category]} · filed {fmtDate(g.created_at)}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[g.status]}`}>
                    {STATUS_LABELS[g.status]}
                  </span>
                </div>
                {g.resolution_notes && (
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                    <span className="font-medium">Response:</span> {g.resolution_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
