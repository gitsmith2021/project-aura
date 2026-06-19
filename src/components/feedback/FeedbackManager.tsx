"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquareHeart, Plus, X, Pencil, Trash2, BarChart3, Eye, EyeOff, Star, AlignLeft, GripVertical } from "lucide-react";
import {
  saveFeedbackForm, setFormActive, deleteFeedbackForm, type AdminFormRow,
} from "@/actions/feedback";
import { QUESTION_TYPE_LABELS, type FeedbackQuestion, type FeedbackQuestionType } from "@/lib/feedback";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type Dept = { id: string; name: string };
type StaffOpt = { id: string; full_name: string };

function newId(): string {
  return (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
const DEFAULT_QS: FeedbackQuestion[] = [
  { id: newId(), text: "Clarity and effectiveness of teaching", type: "rating" },
  { id: newId(), text: "Punctuality and regularity", type: "rating" },
  { id: newId(), text: "Any suggestions for improvement?", type: "text" },
];

export function FeedbackManager({ institutionId, initial, departments, staff }: {
  institutionId: string; initial: AdminFormRow[]; departments: Dept[]; staff: StaffOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [questions, setQuestions] = useState<FeedbackQuestion[]>(DEFAULT_QS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditId(null); setTitle(""); setDescription(""); setDepartmentId(""); setStaffId(""); setSubjectName("");
    setQuestions(DEFAULT_QS.map((q) => ({ ...q, id: newId() }))); setError(null); setOpen(true);
  }
  // Details-only edit: questions are left untouched server-side (not sent).
  function openEdit(f: AdminFormRow) {
    setEditId(f.id); setTitle(f.title); setSubjectName(f.subjectName ?? ""); setDescription("");
    setDepartmentId(""); setStaffId(""); setQuestions([]); setError(null); setOpen(true);
  }

  function addQuestion(type: FeedbackQuestionType) { setQuestions((p) => [...p, { id: newId(), text: "", type }]); }
  function setQ(i: number, patch: Partial<FeedbackQuestion>) { setQuestions((p) => p.map((q, idx) => (idx === i ? { ...q, ...patch } : q))); }
  function removeQ(i: number) { setQuestions((p) => p.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!title.trim()) { setError("Form title is required."); return; }
    const qs = questions.map((q) => ({ ...q, text: q.text.trim() })).filter((q) => q.text);
    if (!editId && qs.length === 0) { setError("Add at least one question."); return; }
    setBusy(true); setError(null);
    const res = await saveFeedbackForm({
      institutionId, id: editId, title, description: description || null,
      departmentId: departmentId || null, staffId: staffId || null, subjectName: subjectName || null,
      questions: editId ? undefined : qs, // edit = details only; create = new questions
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }

  async function toggleActive(f: AdminFormRow) {
    const res = await setFormActive({ institutionId, id: f.id, isActive: !f.isActive });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  async function remove(f: AdminFormRow) {
    if (!confirm(`Delete "${f.title}"? Its ${f.responseCount} response(s) will be removed.`)) return;
    const res = await deleteFeedbackForm({ institutionId, id: f.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageSquareHeart size={22} className="text-rose-600" /> Student Feedback</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Anonymous feedback forms — responses are never linked to a student.</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700"><Plus size={15} /> New Form</button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No feedback forms yet.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {initial.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{f.title}</p>
                  <p className="text-[11px] text-slate-400">{[f.subjectName, f.staffName, f.departmentName ?? "Institution-wide"].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${f.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>{f.isActive ? "Active" : "Closed"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{f.questionCount} questions</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">{f.responseCount} responses</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                <Link href={`/institutions/${institutionId}/feedback/${f.id}/report`} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><BarChart3 size={13} /> Report</Link>
                <button onClick={() => toggleActive(f)} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">{f.isActive ? <><EyeOff size={13} /> Close</> : <><Eye size={13} /> Open</>}</button>
                <button onClick={() => openEdit(f)} className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 ml-auto"><Pencil size={14} /></button>
                <button onClick={() => remove(f)} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><MessageSquareHeart size={18} className="text-rose-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Form (details)" : "New Feedback Form"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              {editId && <p className="text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">Editing updates the form details. To change questions, create a new form.</p>}
              <div><label className={labelCls}>Title <span className="text-rose-500">*</span></label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="End-Semester Faculty Feedback" /></div>
              <div><label className={labelCls}>Description</label><textarea className={inputCls + " h-16 resize-none"} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Faculty (optional)</label>
                  <select className={inputCls} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                    <option value="">— None —</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Subject</label><input className={inputCls} value={subjectName} onChange={(e) => setSubjectName(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Department</label>
                <select className={inputCls} value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">Institution-wide</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {!editId && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls + " mb-0"}>Questions</label>
                    <div className="flex gap-1.5">
                      <button onClick={() => addQuestion("rating")} className="text-[12px] font-medium text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"><Star size={12} /> Rating</button>
                      <button onClick={() => addQuestion("text")} className="text-[12px] font-medium text-rose-600 hover:text-rose-700 inline-flex items-center gap-1"><AlignLeft size={12} /> Comment</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {questions.map((q, i) => (
                      <div key={q.id} className="flex items-center gap-2">
                        <GripVertical size={14} className="text-slate-300 shrink-0" />
                        <span title={QUESTION_TYPE_LABELS[q.type]} className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${q.type === "rating" ? "bg-amber-100 text-amber-600 dark:bg-amber-950/40" : "bg-sky-100 text-sky-600 dark:bg-sky-950/40"}`}>{q.type === "rating" ? <Star size={13} /> : <AlignLeft size={13} />}</span>
                        <input className={inputCls + " flex-1"} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder={q.type === "rating" ? "Rating question" : "Comment prompt"} />
                        <button onClick={() => removeQ(i)} className="p-1 text-slate-400 hover:text-rose-500"><X size={14} /></button>
                      </div>
                    ))}
                    {questions.length === 0 && <p className="text-[12px] text-slate-400">Add rating or comment questions.</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save details" : "Create Form"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
