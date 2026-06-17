"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ExternalLink, Award, Save, CheckCircle2 } from "lucide-react";
import {
  APPRAISAL_STATUS_LABELS, APPRAISAL_STATUS_COLORS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS,
  computeOverallScore, scoreGrade, canReview, type StaffAppraisal, type AppraisalActivity,
} from "@/lib/appraisals";
import { reviewAppraisal } from "@/actions/appraisals";

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">{label} <span className="text-slate-400">/ 100</span></label>
      <input
        type="number" min={0} max={100} step="0.01" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );
}

export function AppraisalReviewPanel({
  institutionId,
  appraisal,
  activities,
}: {
  institutionId: string;
  appraisal: StaffAppraisal | null;
  activities: AppraisalActivity[];
}) {
  const router = useRouter();
  const [teaching, setTeaching] = useState(appraisal?.teaching_score?.toString() ?? "");
  const [research, setResearch] = useState(appraisal?.research_score?.toString() ?? "");
  const [admin, setAdmin] = useState(appraisal?.admin_score?.toString() ?? "");
  const [feedback, setFeedback] = useState(appraisal?.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const preview = useMemo(
    () => computeOverallScore(num(teaching), num(research), num(admin)),
    [teaching, research, admin]
  );

  if (!appraisal) return <p className="text-slate-400">Appraisal not found.</p>;

  const reviewable = canReview(appraisal.status);

  async function save(finalize: boolean) {
    setBusy(true); setError(null);
    const res = await reviewAppraisal({
      institutionId,
      appraisalId: appraisal!.id,
      teaching: num(teaching),
      research: num(research),
      admin: num(admin),
      feedback,
      finalize,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{appraisal.staff?.full_name ?? "Staff"}</h1>
            <p className="text-[13px] text-slate-500">
              {[appraisal.staff?.designation, appraisal.staff?.departments?.name].filter(Boolean).join(" · ")}
            </p>
            <p className="text-[12px] text-slate-400 mt-1">{appraisal.appraisal_period}</p>
          </div>
          <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${APPRAISAL_STATUS_COLORS[appraisal.status]}`}>
            {APPRAISAL_STATUS_LABELS[appraisal.status]}
          </span>
        </div>
        {appraisal.self_remarks && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[12px] font-medium text-slate-500 mb-1">Self-assessment remarks</p>
            <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{appraisal.self_remarks}</p>
          </div>
        )}
      </div>

      {/* Activities */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-3">
          Activities &amp; Contributions <span className="text-slate-400 font-normal">({activities.length})</span>
        </h2>
        {activities.length === 0 ? (
          <p className="text-[13px] text-slate-400">No activities logged by the staff member.</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((act) => (
              <li key={act.id} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${ACTIVITY_TYPE_COLORS[act.activity_type]}`}>
                  {ACTIVITY_TYPE_LABELS[act.activity_type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{act.title}</p>
                  {act.description && <p className="text-[12px] text-slate-500">{act.description}</p>}
                  {act.date_of_activity && <p className="text-[11px] text-slate-400 mt-0.5">{new Date(act.date_of_activity).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                </div>
                {act.document_url && (
                  <a href={act.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-purple-600 hover:text-purple-700 shrink-0">
                    <FileText size={13} /> Proof <ExternalLink size={11} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Review scoring */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white mb-1">Reviewer Scoring</h2>
        <p className="text-[12px] text-slate-500 mb-4">Weighted overall = teaching 50% · research 30% · admin 20%.</p>

        {!reviewable && appraisal.status === "pending" && (
          <p className="text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg mb-4">
            The staff member hasn&apos;t submitted their self-appraisal yet. You can still score, but consider waiting for their input.
          </p>
        )}
        {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          <ScoreInput label="Teaching" value={teaching} onChange={setTeaching} />
          <ScoreInput label="Research" value={research} onChange={setResearch} />
          <ScoreInput label="Admin" value={admin} onChange={setAdmin} />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-4 py-3">
          <Award size={18} className="text-amber-500" />
          <div>
            <p className="text-[12px] text-slate-500">Computed overall</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {preview ?? "—"} <span className="text-[12px] font-normal text-slate-500">{preview !== null && `· ${scoreGrade(preview)}`}</span>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Reviewer Feedback</label>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Strengths, areas to develop, goals for next cycle…"
            className="w-full min-h-[100px] px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button onClick={() => save(false)} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 disabled:opacity-50">
            <Save size={15} /> Save Review
          </button>
          <button onClick={() => save(true)} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            <CheckCircle2 size={15} /> Finalize
          </button>
        </div>
      </div>
    </div>
  );
}
