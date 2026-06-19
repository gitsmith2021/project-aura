"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListChecks, Plus, X, Pencil, Trash2, ArrowLeft, Check, CircleDot } from "lucide-react";
import { saveQuestion, deleteQuestion, type AdminQuestion, type QuestionOption } from "@/actions/onlineExams";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/onlineExams";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

const KEYS = ["a", "b", "c", "d", "e", "f"];

export function QuestionBankEditor({ institutionId, examId, examTitle, initial }: {
  institutionId: string; examId: string; examTitle: string; initial: AdminQuestion[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [qType, setQType] = useState<QuestionType>("mcq");
  const [qText, setQText] = useState("");
  const [opts, setOpts] = useState<QuestionOption[]>([{ key: "a", text: "" }, { key: "b", text: "" }]);
  const [correct, setCorrect] = useState<string[]>([]);
  const [acceptedText, setAcceptedText] = useState("");
  const [marks, setMarks] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditId(null); setQType("mcq"); setQText("");
    setOpts([{ key: "a", text: "" }, { key: "b", text: "" }]); setCorrect([]); setAcceptedText(""); setMarks("1");
    setError(null); setOpen(true);
  }
  function openEdit(q: AdminQuestion) {
    setEditId(q.id); setQType(q.questionType); setQText(q.questionText); setMarks(String(q.marks));
    if (q.questionType === "short") { setAcceptedText(q.correctKeys.join("\n")); setOpts([]); setCorrect([]); }
    else { setOpts(q.options.length ? q.options : [{ key: "a", text: "" }, { key: "b", text: "" }]); setCorrect(q.correctKeys); setAcceptedText(""); }
    setError(null); setOpen(true);
  }

  function setOpt(i: number, text: string) { setOpts((p) => p.map((o, idx) => (idx === i ? { ...o, text } : o))); }
  function addOpt() { setOpts((p) => (p.length >= KEYS.length ? p : [...p, { key: KEYS[p.length], text: "" }])); }
  function removeOpt(i: number) {
    setOpts((p) => p.filter((_, idx) => idx !== i).map((o, idx) => ({ key: KEYS[idx], text: o.text })));
    setCorrect([]); // keys shifted; reset selection
  }
  function toggleCorrect(key: string) {
    if (qType === "mcq") setCorrect([key]);
    else setCorrect((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));
  }

  async function save() {
    const correctKeys = qType === "short"
      ? acceptedText.split("\n").map((s) => s.trim()).filter(Boolean)
      : correct;
    const options = qType === "short" ? [] : opts.map((o) => ({ key: o.key, text: o.text.trim() })).filter((o) => o.text);
    if (!qText.trim()) { setError("Question text is required."); return; }
    if (qType !== "short" && options.length < 2) { setError("Add at least two options."); return; }
    if (correctKeys.length === 0) { setError(qType === "short" ? "Add at least one accepted answer." : "Mark the correct option(s)."); return; }
    setBusy(true); setError(null);
    const position = editId ? (initial.find((q) => q.id === editId)?.position ?? 0) : initial.length;
    const res = await saveQuestion({
      institutionId, examId, id: editId, questionText: qText, questionType: qType,
      options, correctKeys, marks: Math.max(1, Number(marks) || 1), position,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }

  async function remove(q: AdminQuestion) {
    if (!confirm("Delete this question?")) return;
    const res = await deleteQuestion({ institutionId, examId, id: q.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  const totalMarks = initial.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={`/institutions/${institutionId}/online-exams`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> All exams</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ListChecks size={22} className="text-violet-600" /> Question Bank</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{examTitle} · {initial.length} question{initial.length !== 1 ? "s" : ""} · {totalMarks} marks</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={15} /> Add Question</button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No questions yet. Add questions, then publish the exam.</div>
      ) : (
        <div className="space-y-3">
          {initial.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white"><span className="text-slate-400">Q{i + 1}.</span> {q.questionText}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 mt-1 inline-block">{QUESTION_TYPE_LABELS[q.questionType]} · {q.marks}m</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(q)} className="p-1.5 rounded-md text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"><Pencil size={14} /></button>
                  <button onClick={() => remove(q)} className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                </div>
              </div>
              {q.questionType === "short" ? (
                <p className="mt-2 text-[12px] text-slate-500">Accepted: <span className="text-emerald-600 dark:text-emerald-400">{q.correctKeys.join(", ")}</span></p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {q.options.map((o) => (
                    <li key={o.key} className={`text-[12px] flex items-center gap-2 ${q.correctKeys.includes(o.key) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-slate-600 dark:text-slate-300"}`}>
                      {q.correctKeys.includes(o.key) ? <Check size={12} /> : <span className="w-3 inline-block text-slate-300 uppercase">{o.key}</span>}
                      {o.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><ListChecks size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit Question" : "Add Question"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Type</label>
                  <select className={inputCls} value={qType} onChange={(e) => { setQType(e.target.value as QuestionType); setCorrect([]); }}>
                    {QUESTION_TYPES.map((t) => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Marks</label><input type="number" min={1} className={inputCls} value={marks} onChange={(e) => setMarks(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Question <span className="text-rose-500">*</span></label><textarea className={inputCls + " h-20 resize-none"} value={qText} onChange={(e) => setQText(e.target.value)} /></div>

              {qType === "short" ? (
                <div>
                  <label className={labelCls}>Accepted answers (one per line)</label>
                  <textarea className={inputCls + " h-24 resize-none"} value={acceptedText} onChange={(e) => setAcceptedText(e.target.value)} placeholder={"paris\nparis city"} />
                  <p className="text-[11px] text-slate-400 mt-1">Matching is case- and space-insensitive.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1"><label className={labelCls + " mb-0"}>Options ({qType === "mcq" ? "pick one correct" : "pick all correct"})</label>{opts.length < KEYS.length && <button onClick={addOpt} className="text-[12px] font-medium text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"><Plus size={12} /> Option</button>}</div>
                  <div className="space-y-2">
                    {opts.map((o, i) => (
                      <div key={o.key} className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleCorrect(o.key)} title="Mark correct"
                          className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center border ${correct.includes(o.key) ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-300"}`}>
                          {qType === "mcq" ? <CircleDot size={13} /> : <Check size={13} />}
                        </button>
                        <span className="text-[11px] uppercase text-slate-400 w-3">{o.key}</span>
                        <input className={inputCls + " flex-1"} value={o.text} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${o.key.toUpperCase()}`} />
                        {opts.length > 2 && <button onClick={() => removeOpt(i)} className="p-1 text-slate-400 hover:text-rose-500"><X size={14} /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy ? "Saving…" : editId ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
