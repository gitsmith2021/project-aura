"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, X, Upload, Clock, AlertTriangle, CheckCircle2, FileText, Loader2, Award } from "lucide-react";
import { uploadDocument } from "@/lib/storage";
import { submitAssignment, type StudentAssignmentRow } from "@/actions/lmsAssignments";
import { dueStatus, dueLabel, percentage } from "@/lib/lms";

export function StudentAssignments({ rows }: { rows: StudentAssignmentRow[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = rows.find((r) => r.id === openId) ?? null;

  function openFor(id: string) { setOpenId(id); setFile(null); setNotes(""); setError(null); }

  async function submit() {
    if (!active) return;
    if (!file && !notes.trim()) { setError("Attach a file or add a note."); return; }
    setBusy(true); setError(null);
    let fileUrl: string | null = null;
    if (file) {
      const up = await uploadDocument("lms-submissions", file, active.id);
      if (!up.success) { setBusy(false); setError(up.error); return; }
      fileUrl = up.url;
    }
    const res = await submitAssignment({ assignmentId: active.id, fileUrl, notes: notes || null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpenId(null); router.refresh();
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0"><ClipboardList size={18} className="text-violet-600" /></div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Assignments</h1>
          <p className="text-xs text-slate-500">Submit your work and view grades</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <ClipboardList size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No assignments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => {
            const sub = a.submission;
            const st = dueStatus(a.dueDate);
            const closed = st === "overdue" && !a.allowLate;
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{a.title}</p>
                    <p className="text-[12px] text-slate-500">{[a.subjectName, `${a.maxMarks} marks`].filter(Boolean).join(" · ")}</p>
                    {a.description && <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{a.description}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${st === "overdue" ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30" : st === "due_soon" ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30" : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"}`}>
                    {st === "overdue" ? <AlertTriangle size={10} /> : <Clock size={10} />}{dueLabel(a.dueDate)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/60 pt-3">
                  {sub ? (
                    sub.state === "graded" ? (
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400"><Award size={14} /> {sub.marksAwarded}/{a.maxMarks} ({percentage(sub.marksAwarded ?? 0, a.maxMarks)}%)</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500"><CheckCircle2 size={14} className="text-emerald-500" /> Submitted{sub.isLate ? " (late)" : ""}</span>
                    )
                  ) : (
                    <span className="text-[12px] text-slate-400">Not submitted</span>
                  )}
                  {!(sub?.state === "graded") && (
                    closed && !sub ? (
                      <span className="text-[12px] text-rose-500">Deadline passed</span>
                    ) : (
                      <button onClick={() => openFor(a.id)} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Upload size={13} /> {sub ? "Resubmit" : "Submit"}</button>
                    )
                  )}
                </div>
                {sub?.feedback && <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2"><span className="font-medium">Feedback:</span> {sub.feedback}</p>}
              </div>
            );
          })}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpenId(null)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Upload size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Submit</h2></div>
              <button onClick={() => setOpenId(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{active.title}</p>
              {dueStatus(active.dueDate) === "overdue" && active.allowLate && <p className="text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg flex items-center gap-1.5"><Clock size={13} /> The deadline has passed — this will be marked late.</p>}
              <div><label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">File</label><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" /></div>
              <div><label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white h-24 resize-none" placeholder="Optional message to your teacher" /></div>
              {active.submission?.fileUrl && <a href={active.submission.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-violet-600 hover:text-violet-700"><FileText size={12} /> Current submission</a>}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpenId(null)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}{busy ? "Submitting…" : "Submit"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
