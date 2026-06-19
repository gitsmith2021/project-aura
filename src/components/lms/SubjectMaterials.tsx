"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, X, ArrowLeft, Upload, Loader2 } from "lucide-react";
import { uploadDocument } from "@/lib/storage";
import { createMaterial, togglePublishMaterial, deleteMaterial, type MaterialRow, type UnitOption } from "@/actions/studyMaterials";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS, isLinkMaterial, type MaterialType } from "@/lib/lms";
import { MaterialCard } from "./MaterialCard";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

export function SubjectMaterials({ institutionId, subjectId, subjectName, units, initial, backHref }: {
  institutionId: string; subjectId: string; subjectName: string; units: UnitOption[]; initial: MaterialRow[]; backHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<MaterialType>("notes");
  const [unitId, setUnitId] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkOnly = isLinkMaterial(type);

  function reset() { setTitle(""); setType("notes"); setUnitId(""); setExternalUrl(""); setFile(null); setIsPublished(true); setError(null); }

  async function save() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (linkOnly && !externalUrl.trim()) { setError("Add the link URL."); return; }
    if (!linkOnly && !file && !externalUrl.trim()) { setError("Upload a file or provide a link."); return; }
    setBusy(true); setError(null);

    let fileUrl: string | null = null;
    if (file) {
      const up = await uploadDocument("study-materials", file, subjectId);
      if (!up.success) { setBusy(false); setError(up.error); return; }
      fileUrl = up.url;
    }
    const res = await createMaterial({
      institutionId, subjectId, title, materialType: type,
      curriculumUnitId: unitId || null, fileUrl, externalUrl: externalUrl || null, isPublished,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); reset(); router.refresh();
  }

  async function onTogglePublish(m: MaterialRow) {
    const res = await togglePublishMaterial({ institutionId, subjectId, id: m.id, isPublished: !m.isPublished });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  async function onDelete(m: MaterialRow) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    const res = await deleteMaterial({ institutionId, subjectId, id: m.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  // Group by unit (unit number asc; ungrouped last)
  const groups = new Map<string, { label: string; order: number; items: MaterialRow[] }>();
  for (const m of initial) {
    const key = m.unitId ?? "none";
    if (!groups.has(key)) {
      groups.set(key, {
        label: m.unitNumber !== null ? `Unit ${m.unitNumber}${m.unitTitle ? ` · ${m.unitTitle}` : ""}` : "General",
        order: m.unitNumber ?? 999,
        items: [],
      });
    }
    groups.get(key)!.items.push(m);
  }
  const grouped = [...groups.values()].sort((a, b) => a.order - b.order);

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> Back</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BookOpen size={22} className="text-violet-600" /> {subjectName}</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{initial.length} material{initial.length !== 1 ? "s" : ""} · organised by syllabus unit</p>
          </div>
          <button onClick={() => { reset(); setOpen(true); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"><Plus size={15} /> Add Material</button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No materials uploaded yet.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.label}>
              <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{g.label}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((m) => <MaterialCard key={m.id} material={m} manage={{ onTogglePublish: () => onTogglePublish(m), onDelete: () => onDelete(m) }} />)}
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
              <div className="flex items-center gap-2"><Upload size={18} className="text-violet-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Add Material</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Title <span className="text-rose-500">*</span></label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Type</label>
                  <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as MaterialType)}>
                    {MATERIAL_TYPES.map((t) => <option key={t} value={t}>{MATERIAL_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Unit</label>
                  <select className={inputCls} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                    <option value="">General</option>
                    {units.map((u) => <option key={u.id} value={u.id}>Unit {u.unit_number} · {u.title}</option>)}
                  </select>
                </div>
              </div>
              {linkOnly ? (
                <div><label className={labelCls}>Link URL <span className="text-rose-500">*</span></label><input className={inputCls} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://youtube.com/watch?v=… or any URL" /></div>
              ) : (
                <>
                  <div><label className={labelCls}>File</label><input type="file" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
                  <div className="flex items-center gap-2"><div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" /><span className="text-[11px] text-slate-400">or link</span><div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" /></div>
                  <div><label className={labelCls}>External URL</label><input className={inputCls} value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="Google Drive / SCORM launch URL" /></div>
                </>
              )}
              <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded border-slate-300" /> Publish immediately (students can see it)
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}{busy ? "Saving…" : "Add Material"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
