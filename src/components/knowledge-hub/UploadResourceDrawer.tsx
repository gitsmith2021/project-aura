"use client";

import { useState } from "react";
import { X, UploadCloud, Link2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  KH_CATEGORIES, VISIBILITY_TIERS, NAAC_CRITERIA, contentTypesFor,
  type KnowledgeCategory, type VisibilityTier,
} from "@/lib/knowledgeHub";
import { createResource } from "@/actions/knowledgeHub";

type Props = {
  institutionId: string;
  departments: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const inputCls =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors";
const labelCls = "block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1";

export function UploadResourceDrawer({ institutionId, departments, isOpen, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>("academic");
  const [contentType, setContentType] = useState(contentTypesFor("academic")[0].value);
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [subject, setSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState<VisibilityTier>("institution");
  const [departmentId, setDepartmentId] = useState("");
  const [naacCriterion, setNaacCriterion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCategoryChange = (c: KnowledgeCategory) => {
    setCategory(c);
    setContentType(contentTypesFor(c)[0].value);
  };

  const reset = () => {
    setMode("file"); setTitle(""); setDescription(""); setCategory("academic");
    setContentType(contentTypesFor("academic")[0].value); setFile(null); setExternalUrl("");
    setSubject(""); setAcademicYear(""); setTags(""); setVisibility("institution");
    setDepartmentId(""); setNaacCriterion(""); setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError("Title is required."); return; }
    if (mode === "file" && !file) { setError("Choose a file to upload."); return; }
    if (mode === "link" && !externalUrl.trim()) { setError("Enter the external link."); return; }
    if (visibility === "department" && !departmentId) { setError("Pick a department for department-only visibility."); return; }

    setBusy(true);
    try {
      let fileUrl: string | null = null;
      if (mode === "file" && file) {
        const supabase = createClient();
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${institutionId}/${crypto.randomUUID()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("knowledge-hub").upload(path, file, { upsert: false });
        if (upErr) { setError(`Upload failed: ${upErr.message}`); setBusy(false); return; }
        fileUrl = supabase.storage.from("knowledge-hub").getPublicUrl(path).data.publicUrl;
      }

      const res = await createResource({
        institutionId, title, description, category, contentType,
        fileUrl, externalUrl: mode === "link" ? externalUrl : null,
        subject, academicYear, tags, visibility,
        departmentId: departmentId || null,
        naacCriterion: category === "accreditation" ? (naacCriterion || null) : null,
      });
      if (!res.success) { setError(res.error); setBusy(false); return; }

      reset();
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`relative w-full max-w-md h-full bg-white dark:bg-slate-900 flex flex-col border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Upload to Knowledge Hub</h2>
            <p className="text-xs text-slate-500">Share a resource with your institution.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>}

          {/* File vs link */}
          <div className="flex gap-2">
            {(["file", "link"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${mode === m ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                {m === "file" ? <UploadCloud size={14} /> : <Link2 size={14} />} {m === "file" ? "Upload file" : "External link"}
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <label className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 py-5 text-center cursor-pointer hover:border-violet-300 transition-colors">
              <UploadCloud size={20} className="text-slate-400" />
              <span className="text-xs text-slate-600 dark:text-slate-300">{file ? file.name : "Choose a file (PDF, DOCX, PPTX, …)"}</span>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <div>
              <label className={labelCls}>External URL</label>
              <input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://… (YouTube, DOI, journal)" className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Intro to Machine Learning — Unit 1 Notes" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short abstract (optional)" className={`${inputCls} resize-y`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select value={category} onChange={(e) => onCategoryChange(e.target.value as KnowledgeCategory)} className={inputCls}>
                {KH_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Content type</label>
              <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={inputCls}>
                {contentTypesFor(category).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Visibility</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as VisibilityTier)} className={inputCls}>
                {VISIBILITY_TIERS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department {visibility === "department" ? "*" : "(optional)"}</label>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {category === "accreditation" && (
            <div>
              <label className={labelCls}>NAAC Criterion</label>
              <select value={naacCriterion} onChange={(e) => setNaacCriterion(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {NAAC_CRITERIA.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Subject (optional)</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Academic year (optional)</label>
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2025-26" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="machine-learning, ai, unit-1" className={inputCls} />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="button" onClick={submit} disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 rounded-md hover:bg-violet-700 disabled:opacity-60 transition-colors">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />} Publish
          </button>
        </div>
      </div>
    </div>
  );
}
