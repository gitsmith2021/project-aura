"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, FileText, Upload } from "lucide-react";
import { createPublication } from "@/actions/research";
import { uploadDocument } from "@/lib/storage";
import { PUB_TYPES, PUB_TYPE_LABELS, type PubType } from "@/lib/research";

type Staff = { id: string; full_name: string };

export function PublicationDrawer({ open, institutionId, staff, onClose }: {
  open: boolean; institutionId: string; staff: Staff[]; onClose: () => void;
}) {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [title, setTitle] = useState("");
  const [pubType, setPubType] = useState<PubType>("journal");
  const [journal, setJournal] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [doi, setDoi] = useState("");
  const [scopus, setScopus] = useState(false);
  const [ugc, setUgc] = useState(false);
  const [impact, setImpact] = useState("");
  const [authors, setAuthors] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function save() {
    if (!staffId) { setError("Select the faculty author."); return; }
    if (!title.trim()) { setError("Title is required."); return; }
    setBusy(true); setError(null);
    let documentUrl: string | null = null;
    if (file) {
      const up = await uploadDocument("research-docs", file, institutionId);
      if (!up.success) { setBusy(false); setError(`Upload failed: ${up.error}`); return; }
      documentUrl = up.url;
    }
    const res = await createPublication({
      institutionId, staffId, title, pubType, pubYear: Number(year),
      journalName: journal || null, publisher: publisher || null, doi: doi || null,
      scopusIndexed: scopus, ugcListed: ugc, impactFactor: impact ? Number(impact) : null,
      authors: authors.split(",").map((a) => a.trim()).filter(Boolean), documentUrl,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    router.refresh();
    onClose();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2"><FileText size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Add Publication</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className={labelCls}>Faculty author <span className="text-rose-500">*</span></label>
            <select className={inputCls} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Select faculty</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Title <span className="text-rose-500">*</span></label><textarea className={`${inputCls} min-h-[60px]`} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={pubType} onChange={(e) => setPubType(e.target.value as PubType)}>
                {PUB_TYPES.map((t) => <option key={t} value={t}>{PUB_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Year</label><input type="number" className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))} min={1950} max={new Date().getFullYear() + 1} /></div>
          </div>
          <div><label className={labelCls}>Journal name</label><input className={inputCls} value={journal} onChange={(e) => setJournal(e.target.value)} /></div>
          <div><label className={labelCls}>Publisher</label><input className={inputCls} value={publisher} onChange={(e) => setPublisher(e.target.value)} /></div>
          <div><label className={labelCls}>Authors <span className="text-slate-400 font-normal">(comma-separated)</span></label><input className={inputCls} value={authors} onChange={(e) => setAuthors(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>DOI</label><input className={inputCls} value={doi} onChange={(e) => setDoi(e.target.value)} /></div>
            <div><label className={labelCls}>Impact factor</label><input type="number" step="0.001" className={inputCls} value={impact} onChange={(e) => setImpact(e.target.value)} /></div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300"><input type="checkbox" checked={scopus} onChange={(e) => setScopus(e.target.checked)} className="accent-purple-600" /> Scopus indexed</label>
            <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300"><input type="checkbox" checked={ugc} onChange={(e) => setUgc(e.target.checked)} className="accent-purple-600" /> UGC-CARE listed</label>
          </div>
          <div>
            <label className={labelCls}>Document <span className="text-slate-400 font-normal">(optional)</span></label>
            <label className="flex items-center gap-2 px-3 py-2 text-[13px] rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <Upload size={14} /> <span className="truncate">{file ? file.name : "Upload PDF (optional)"}</span>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Saving…" : "Add Publication"}</button>
        </div>
      </div>
    </div>
  );
}
