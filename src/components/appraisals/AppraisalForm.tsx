"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Trash2, FileText, ExternalLink, Save, Send, Award, Upload, CheckCircle2,
} from "lucide-react";
import {
  APPRAISAL_STATUS_LABELS, APPRAISAL_STATUS_COLORS, ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_COLORS,
  isStaffEditable, scoreGrade, type StaffAppraisal, type AppraisalActivity, type ActivityType,
} from "@/lib/appraisals";
import { saveAppraisalRemarks, submitAppraisal, addAppraisalActivity, deleteAppraisalActivity } from "@/actions/appraisals";
import { uploadDocument } from "@/lib/storage";

const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[];

export function AppraisalForm({ appraisal, activities }: { appraisal: StaffAppraisal; activities: AppraisalActivity[] }) {
  const router = useRouter();
  const editable = isStaffEditable(appraisal.status);

  const [remarks, setRemarks] = useState(appraisal.self_remarks ?? "");
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add-activity drawer
  const [drawer, setDrawer] = useState(false);
  const [aType, setAType] = useState<ActivityType>("paper_published");
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aDate, setADate] = useState("");
  const [aFile, setAFile] = useState<File | null>(null);
  const [aBusy, setABusy] = useState(false);

  async function save() {
    setBusy(true); setError(null); setSavedMsg(null);
    const res = await saveAppraisalRemarks({ appraisalId: appraisal.id, selfRemarks: remarks });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setSavedMsg("Saved.");
    router.refresh();
    setTimeout(() => setSavedMsg(null), 2000);
  }

  async function submit() {
    setBusy(true); setError(null);
    const res = await submitAppraisal({ appraisalId: appraisal.id, selfRemarks: remarks });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
  }

  async function addActivity() {
    if (!aTitle.trim()) { setError("Activity title is required."); return; }
    setABusy(true); setError(null);
    let documentUrl: string | null = null;
    if (aFile) {
      const up = await uploadDocument("appraisal-docs", aFile, appraisal.id);
      if (!up.success) { setABusy(false); setError(`Upload failed: ${up.error}`); return; }
      documentUrl = up.url;
    }
    const res = await addAppraisalActivity({
      appraisalId: appraisal.id,
      activityType: aType,
      title: aTitle,
      description: aDesc || null,
      dateOfActivity: aDate || null,
      documentUrl,
    });
    setABusy(false);
    if (!res.success) { setError(res.error); return; }
    setAType("paper_published"); setATitle(""); setADesc(""); setADate(""); setAFile(null);
    setDrawer(false);
    router.refresh();
  }

  async function removeActivity(id: string) {
    await deleteAppraisalActivity({ id });
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{appraisal.appraisal_period}</h2>
          {appraisal.status === "submitted" && <p className="text-[12px] text-slate-500">Submitted — you can still add activities until it&apos;s reviewed.</p>}
        </div>
        <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${APPRAISAL_STATUS_COLORS[appraisal.status]}`}>
          {APPRAISAL_STATUS_LABELS[appraisal.status]}
        </span>
      </div>

      {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

      {/* Reviewer outcome (read-only, once scored) */}
      {(appraisal.status === "reviewed" || appraisal.status === "completed") && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Award size={18} className="text-amber-500" />
            <div>
              <p className="text-[12px] text-slate-500">Overall score</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {appraisal.overall_score ?? "—"} <span className="text-[12px] font-normal text-slate-500">{appraisal.overall_score !== null && `· ${scoreGrade(appraisal.overall_score)}`}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
            <div className="rounded-md bg-white dark:bg-slate-900 py-2"><p className="text-slate-400">Teaching</p><p className="font-semibold text-slate-800 dark:text-slate-200">{appraisal.teaching_score ?? "—"}</p></div>
            <div className="rounded-md bg-white dark:bg-slate-900 py-2"><p className="text-slate-400">Research</p><p className="font-semibold text-slate-800 dark:text-slate-200">{appraisal.research_score ?? "—"}</p></div>
            <div className="rounded-md bg-white dark:bg-slate-900 py-2"><p className="text-slate-400">Admin</p><p className="font-semibold text-slate-800 dark:text-slate-200">{appraisal.admin_score ?? "—"}</p></div>
          </div>
          {appraisal.feedback && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-[12px] font-medium text-slate-500 mb-1">Reviewer feedback</p>
              <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{appraisal.feedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Self remarks */}
      <div>
        <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Self-assessment remarks</label>
        {editable ? (
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Summarise your contributions and goals for this period…" className={`${inputCls} min-h-[90px]`} />
        ) : (
          <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{appraisal.self_remarks || "—"}</p>
        )}
      </div>

      {/* Activities */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Activities <span className="text-slate-400 font-normal">({activities.length})</span></p>
          {editable && (
            <button onClick={() => { setDrawer(true); setError(null); }} className="inline-flex items-center gap-1 text-[12px] font-medium text-purple-600 hover:text-purple-700">
              <Plus size={14} /> Add Activity
            </button>
          )}
        </div>
        {activities.length === 0 ? (
          <p className="text-[12px] text-slate-400">No activities added yet.</p>
        ) : (
          <ul className="space-y-2">
            {activities.map((act) => (
              <li key={act.id} className="flex items-start gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${ACTIVITY_TYPE_COLORS[act.activity_type]}`}>{ACTIVITY_TYPE_LABELS[act.activity_type]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200">{act.title}</p>
                  {act.description && <p className="text-[12px] text-slate-500">{act.description}</p>}
                  {act.date_of_activity && <p className="text-[11px] text-slate-400 mt-0.5">{new Date(act.date_of_activity).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
                </div>
                {act.document_url && (
                  <a href={act.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-purple-600 hover:text-purple-700 shrink-0"><FileText size={13} /> Proof <ExternalLink size={11} /></a>
                )}
                {editable && (
                  <button onClick={() => removeActivity(act.id)} className="p-1 rounded text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 shrink-0"><Trash2 size={13} /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Actions */}
      {editable && (
        <div className="flex items-center justify-end gap-3 pt-1">
          {savedMsg && <span className="text-[12px] text-emerald-600">{savedMsg}</span>}
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
            <Save size={15} /> Save Draft
          </button>
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            {appraisal.status === "submitted" ? <CheckCircle2 size={15} /> : <Send size={15} />}
            {appraisal.status === "submitted" ? "Re-submit" : "Submit for Review"}
          </button>
        </div>
      )}

      {/* Add activity drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Add Activity</h2>
              <button onClick={() => setDrawer(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                <select value={aType} onChange={(e) => setAType(e.target.value as ActivityType)} className={inputCls}>
                  {ACTIVITY_TYPES.map((t) => <option key={t} value={t}>{ACTIVITY_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Title <span className="text-rose-500">*</span></label>
                <input value={aTitle} onChange={(e) => setATitle(e.target.value)} className={inputCls} placeholder="e.g. Paper in IEEE Trans. on Education" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} className={`${inputCls} min-h-[70px]`} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                <input type="date" value={aDate} onChange={(e) => setADate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1">Proof document</label>
                <label className="flex items-center gap-2 px-3 py-2 text-[13px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Upload size={14} />
                  <span className="truncate">{aFile ? aFile.name : "Upload a file (optional)"}</span>
                  <input type="file" className="hidden" onChange={(e) => setAFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setDrawer(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={addActivity} disabled={aBusy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
                {aBusy ? "Adding…" : "Add Activity"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
