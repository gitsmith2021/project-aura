"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Clock, Check, Loader2 } from "lucide-react";
import { gradeSubmission, type AssignmentDetail, type GradeRow } from "@/actions/lmsAssignments";
import { submissionState } from "@/lib/lms";

export function SubmissionsGrader({ institutionId, detail, backHref }: {
  institutionId: string; detail: AssignmentDetail; backHref: string;
}) {
  const router = useRouter();
  const submitted = detail.rows.filter((r) => r.submissionId);
  const graded = detail.rows.filter((r) => r.marksAwarded !== null).length;

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> Back</Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{detail.title}</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{detail.subjectName} · max {detail.maxMarks} marks · {submitted.length} submitted · {graded} graded</p>
      </div>

      {detail.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No students in this subject&apos;s department.</div>
      ) : (
        <div className="space-y-2.5">
          {detail.rows.map((r) => <GradeCard key={r.studentId} institutionId={institutionId} assignmentId={detail.id} maxMarks={detail.maxMarks} row={r} onSaved={() => router.refresh()} />)}
        </div>
      )}
    </div>
  );
}

function GradeCard({ institutionId, assignmentId, maxMarks, row, onSaved }: {
  institutionId: string; assignmentId: string; maxMarks: number; row: GradeRow; onSaved: () => void;
}) {
  const [marks, setMarks] = useState(row.marksAwarded !== null ? String(row.marksAwarded) : "");
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = submissionState(row.submittedAt ? { submitted_at: row.submittedAt, marks_awarded: row.marksAwarded } : null);

  async function save() {
    if (!row.submissionId) return;
    const m = Number(marks);
    if (marks === "" || Number.isNaN(m) || m < 0 || m > maxMarks) { setError(`Enter marks between 0 and ${maxMarks}.`); return; }
    setBusy(true); setError(null);
    const res = await gradeSubmission({ institutionId, assignmentId, submissionId: row.submissionId, marks: m, feedback: feedback || null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    onSaved();
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{row.studentName}{row.rollNo && <span className="text-[11px] text-slate-400 font-normal ml-1.5">{row.rollNo}</span>}</p>
          {state === "not_submitted" ? (
            <p className="text-[12px] text-slate-400 mt-0.5">Not submitted</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 mt-1 text-[12px]">
              {row.fileUrl && <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-700"><FileText size={12} /> File</a>}
              {row.isLate && <span className="inline-flex items-center gap-1 text-amber-600"><Clock size={11} /> Late</span>}
              {row.notes && <span className="text-slate-500 truncate max-w-[220px]" title={row.notes}>“{row.notes}”</span>}
            </div>
          )}
        </div>
        {state !== "not_submitted" && (
          <div className="flex items-end gap-2 shrink-0">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Marks</label>
              <input value={marks} onChange={(e) => setMarks(e.target.value)} type="number" min={0} max={maxMarks}
                className="w-20 px-2 py-1.5 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder={`/${maxMarks}`} />
            </div>
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Save</button>
          </div>
        )}
      </div>
      {state !== "not_submitted" && (
        <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback (optional)"
          className="mt-2 w-full px-3 py-1.5 text-[12px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500" />
      )}
      {error && <p className="mt-2 text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
