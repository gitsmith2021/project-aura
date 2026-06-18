"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, X, Trash2, Upload, ExternalLink, BadgeCheck } from "lucide-react";
import {
  PUB_TYPES, PUB_TYPE_LABELS, PUB_TYPE_COLORS, type Publication, type PubType,
} from "@/lib/research";
import { addMyPublication, deleteMyPublication } from "@/actions/research";
import { uploadDocument } from "@/lib/storage";

export function StaffPublications({ initial }: { initial: Publication[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pubType, setPubType] = useState<PubType>("journal");
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [doi, setDoi] = useState("");
  const [scopus, setScopus] = useState(false);
  const [ugc, setUgc] = useState(false);
  const [impact, setImpact] = useState("");
  const [authors, setAuthors] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) { setError("Title is required."); return; }
    setBusy(true); setError(null);
    let documentUrl: string | null = null;
    if (file) {
      const up = await uploadDocument("research-docs", file, "mine");
      if (!up.success) { setBusy(false); setError(`Upload failed: ${up.error}`); return; }
      documentUrl = up.url;
    }
    const res = await addMyPublication({
      staffId: "", title, pubType, pubYear: Number(year),
      journalName: journal || null, doi: doi || null,
      scopusIndexed: scopus, ugcListed: ugc, impactFactor: impact ? Number(impact) : null,
      authors: authors.split(",").map((a) => a.trim()).filter(Boolean), documentUrl,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setTitle(""); setJournal(""); setDoi(""); setScopus(false); setUgc(false); setImpact(""); setAuthors(""); setFile(null);
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) { await deleteMyPublication({ id }); router.refresh(); }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-slate-500 dark:text-slate-400">{initial.length} publication{initial.length === 1 ? "" : "s"}</p>
        <button onClick={() => { setOpen(true); setError(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"><Plus size={15} /> Add Publication</button>
      </div>

      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 px-4 py-2.5 text-[12px] text-indigo-700 dark:text-indigo-300">
        Publications you add here are automatically attached to your current appraisal — no need to enter them twice.
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-14 text-center text-slate-400">No publications added yet.</div>
      ) : (
        <div className="space-y-2">
          {initial.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${PUB_TYPE_COLORS[p.pub_type]}`}>{PUB_TYPE_LABELS[p.pub_type]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-900 dark:text-white">{p.title}</p>
                <p className="text-[11px] text-slate-400">{[p.journal_name, p.pub_year, p.impact_factor != null ? `IF ${p.impact_factor}` : null].filter(Boolean).join(" · ")}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {p.scopus_indexed && <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><BadgeCheck size={10} /> Scopus</span>}
                  {p.ugc_listed && <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><BadgeCheck size={10} /> UGC</span>}
                  {p.document_url && <a href={p.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700">View <ExternalLink size={9} /></a>}
                </div>
              </div>
              <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><FileText size={18} className="text-indigo-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Add Publication</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
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
              <div><label className={labelCls}>Journal / Publisher</label><input className={inputCls} value={journal} onChange={(e) => setJournal(e.target.value)} /></div>
              <div><label className={labelCls}>Authors <span className="text-slate-400 font-normal">(comma-separated)</span></label><input className={inputCls} value={authors} onChange={(e) => setAuthors(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>DOI</label><input className={inputCls} value={doi} onChange={(e) => setDoi(e.target.value)} /></div>
                <div><label className={labelCls}>Impact factor</label><input type="number" step="0.001" className={inputCls} value={impact} onChange={(e) => setImpact(e.target.value)} /></div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300"><input type="checkbox" checked={scopus} onChange={(e) => setScopus(e.target.checked)} className="accent-indigo-600" /> Scopus indexed</label>
                <label className="flex items-center gap-2 text-[13px] text-slate-700 dark:text-slate-300"><input type="checkbox" checked={ugc} onChange={(e) => setUgc(e.target.checked)} className="accent-indigo-600" /> UGC-CARE listed</label>
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
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? "Saving…" : "Add Publication"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
