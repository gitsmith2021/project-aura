"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, X, Pencil, Trash2, Users, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { createAssignment, updateAssignment, deleteAssignment, type AssignmentRow } from "@/actions/lmsAssignments";
import { dueStatus, dueLabel } from "@/lib/lms";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type SubjectOpt = { id: string; name: string };

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function AssignmentsManager({ institutionId, subjects, initial, fixedSubjectId, gradeBase, gradeSuffix = "", heading = "Assignments" }: {
  institutionId: string; subjects: SubjectOpt[]; initial: AssignmentRow[];
  fixedSubjectId?: string; gradeBase: string; gradeSuffix?: string; heading?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState(fixedSubjectId ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("10");
  const [allowLate, setAllowLate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditId(null); setSubjectId(fixedSubjectId ?? ""); setTitle(""); setDescription(""); setDueDate(""); setMaxMarks("10"); setAllowLate(false); setError(null); setOpen(true);
  }
  function openEdit(a: AssignmentRow) {
    setEditId(a.id); setSubjectId(a.subjectId); setTitle(a.title); setDescription(a.description ?? "");
    setDueDate(toLocalInput(a.dueDate)); setMaxMarks(String(a.maxMarks)); setAllowLate(a.allowLate); setError(null); setOpen(true);
  }

  async function save() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!subjectId) { setError("Select a subject."); return; }
    if (!dueDate) { setError("Set a due date."); return; }
    setBusy(true); setError(null);
    const dueIso = new Date(dueDate).toISOString();
    const marks = Math.max(1, Number(maxMarks) || 10);
    const res = editId
      ? await updateAssignment({ institutionId, id: editId, title, description: description || null, dueDate: dueIso, maxMarks: marks, allowLate })
      : await createAssignment({ institutionId, subjectId, title, description: description || null, dueDate: dueIso, maxMarks: marks, allowLate });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }
  async function remove(a: AssignmentRow) {
    if (!confirm(`Delete "${a.title}"? Submissions will be removed.`)) return;
    const res = await deleteAssignment({ institutionId, id: a.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardList size={18} className="text-violet-600" /> {heading}</h2>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={15} /> New Assignment</button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-12 text-center text-slate-400">No assignments yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {initial.map((a) => {
            const st = dueStatus(a.dueDate);
            const stCls = st === "overdue" ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30" : st === "due_soon" ? "text-amber-600 bg-amber-50 dark:bg-amber-950/30" : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
            return (
              <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{a.title}</p>
                    {!fixedSubjectId && <p className="text-[11px] text-slate-400">{a.subjectName ?? "—"}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 ${stCls}`}>
                    {st === "overdue" ? <AlertTriangle size={10} /> : <Clock size={10} />}{dueLabel(a.dueDate)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{a.maxMarks} marks</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"><Users size={11} /> {a.submissionCount}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1"><CheckCircle2 size={11} /> {a.gradedCount} graded</span>
                  {a.allowLate && <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300">Late allowed</span>}
                </div>
                <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <Link href={`${gradeBase}/${a.id}${gradeSuffix}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-md bg-violet-600 text-white hover:bg-violet-700">Grade &amp; submissions</Link>
                  <button onClick={() => openEdit(a)} className="p-1.5 rounded-md text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 ml-auto"><Pencil size={14} /></button>
                  <button onClick={() => remove(a)} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><ClipboardList size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Assignment" : "New Assignment"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              {!fixedSubjectId && (
                <div><label className={labelCls}>Subject <span className="text-rose-500">*</span></label>
                  <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={!!editId}>
                    <option value="">Select subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div><label className={labelCls}>Title <span className="text-rose-500">*</span></label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><label className={labelCls}>Description</label><textarea className={inputCls + " h-20 resize-none"} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Due date <span className="text-rose-500">*</span></label><input type="datetime-local" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                <div><label className={labelCls}>Max marks</label><input type="number" min={1} className={inputCls} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} /></div>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={allowLate} onChange={(e) => setAllowLate(e.target.checked)} className="rounded border-slate-300" /> Allow late submissions
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
