"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MonitorCheck, Plus, X, Pencil, Trash2, ListChecks, BarChart3, Send, Lock, Clock, Users } from "lucide-react";
import {
  createExam, updateExam, setExamStatus, deleteExam, type ExamRow,
} from "@/actions/onlineExams";
import { EXAM_STATUS_LABELS, EXAM_STATUS_STYLES, formatDuration, type ExamStatus } from "@/lib/onlineExams";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type Dept = { id: string; name: string };
type Draft = {
  title: string; subjectName: string; description: string; departmentId: string;
  durationMinutes: string; passMarks: string; scheduledStart: string; scheduledEnd: string; shuffleQuestions: boolean;
};
const EMPTY: Draft = {
  title: "", subjectName: "", description: "", departmentId: "",
  durationMinutes: "30", passMarks: "0", scheduledStart: "", scheduledEnd: "", shuffleQuestions: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export function OnlineExamsManager({ institutionId, initial, departments }: {
  institutionId: string; initial: ExamRow[]; departments: Dept[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() { setEditId(null); setDraft(EMPTY); setError(null); setOpen(true); }
  function openEdit(e: ExamRow) {
    setEditId(e.id);
    setDraft({
      title: e.title, subjectName: e.subjectName ?? "", description: "", departmentId: e.departmentId ?? "",
      durationMinutes: String(e.durationMinutes), passMarks: String(e.passMarks),
      scheduledStart: toLocalInput(e.scheduledStart), scheduledEnd: toLocalInput(e.scheduledEnd), shuffleQuestions: true,
    });
    setError(null); setOpen(true);
  }

  async function save() {
    if (!draft.title.trim()) { setError("Exam title is required."); return; }
    setBusy(true); setError(null);
    const common = {
      institutionId, title: draft.title, subjectName: draft.subjectName || null, description: draft.description || null,
      departmentId: draft.departmentId || null, durationMinutes: Math.max(1, Number(draft.durationMinutes) || 30),
      passMarks: Math.max(0, Number(draft.passMarks) || 0),
      scheduledStart: draft.scheduledStart ? new Date(draft.scheduledStart).toISOString() : null,
      scheduledEnd: draft.scheduledEnd ? new Date(draft.scheduledEnd).toISOString() : null,
      shuffleQuestions: draft.shuffleQuestions,
    };
    const res = editId ? await updateExam({ ...common, id: editId }) : await createExam(common);
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }

  async function changeStatus(e: ExamRow, status: ExamStatus) {
    const res = await setExamStatus({ institutionId, id: e.id, status });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  async function remove(e: ExamRow) {
    if (!confirm(`Delete "${e.title}"? Questions and ${e.submissionCount} submission(s) will be removed.`)) return;
    const res = await deleteExam({ institutionId, id: e.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><MonitorCheck size={22} className="text-violet-600" /> Online Examinations</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Create timed, auto-graded MCQ assessments with anti-cheating safeguards.</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={15} /> New Exam</button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No online exams yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {initial.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{e.title}</p>
                  <p className="text-[11px] text-slate-400">{e.subjectName ?? "—"} · {e.departmentName ?? "Institution-wide"}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${EXAM_STATUS_STYLES[e.status]}`}>{EXAM_STATUS_LABELS[e.status]}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><Clock size={11} /> {formatDuration(e.durationMinutes)}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><ListChecks size={11} /> {e.questionCount} Q · {e.totalMarks}m</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"><Users size={11} /> {e.submissionCount}</span>
              </div>
              <div className="mt-3 flex items-center flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <Link href={`/institutions/${institutionId}/online-exams/${e.id}/questions`} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><ListChecks size={13} /> Questions</Link>
                <Link href={`/institutions/${institutionId}/online-exams/${e.id}/results`} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><BarChart3 size={13} /> Results</Link>
                {e.status === "draft" && <button onClick={() => changeStatus(e, "published")} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700"><Send size={13} /> Publish</button>}
                {e.status === "published" && <button onClick={() => changeStatus(e, "closed")} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700"><Lock size={13} /> Close</button>}
                <button onClick={() => openEdit(e)} className="p-1.5 rounded-md text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 ml-auto"><Pencil size={14} /></button>
                <button onClick={() => remove(e)} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><MonitorCheck size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Exam" : "New Exam"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Title <span className="text-rose-500">*</span></label><input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Unit Test 1 — Data Structures" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Subject</label><input className={inputCls} value={draft.subjectName} onChange={(e) => setDraft({ ...draft, subjectName: e.target.value })} /></div>
                <div><label className={labelCls}>Department</label>
                  <select className={inputCls} value={draft.departmentId} onChange={(e) => setDraft({ ...draft, departmentId: e.target.value })}>
                    <option value="">Institution-wide</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Duration (min)</label><input type="number" min={1} className={inputCls} value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: e.target.value })} /></div>
                <div><label className={labelCls}>Pass marks</label><input type="number" min={0} className={inputCls} value={draft.passMarks} onChange={(e) => setDraft({ ...draft, passMarks: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Opens</label><input type="datetime-local" className={inputCls} value={draft.scheduledStart} onChange={(e) => setDraft({ ...draft, scheduledStart: e.target.value })} /></div>
                <div><label className={labelCls}>Closes</label><input type="datetime-local" className={inputCls} value={draft.scheduledEnd} onChange={(e) => setDraft({ ...draft, scheduledEnd: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={draft.shuffleQuestions} onChange={(e) => setDraft({ ...draft, shuffleQuestions: e.target.checked })} className="rounded border-slate-300" /> Shuffle question order per student
              </label>
              <p className="text-[11px] text-slate-400">Total marks are computed from the question bank when you publish.</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save changes" : "Create Exam"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
