"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Download, Trash2, ChevronLeft, ExternalLink, BadgeCheck } from "lucide-react";
import {
  PUB_TYPE_LABELS, PUB_TYPE_COLORS, PUB_TYPES, filterPublications, publicationsCSV,
  type Publication, type PubType,
} from "@/lib/research";
import { deletePublication } from "@/actions/research";
import { PublicationDrawer } from "./PublicationDrawer";

type Staff = { id: string; full_name: string };

export function PublicationsDirectory({
  institutionId, instSlug, staff, initial,
}: {
  institutionId: string; instSlug: string; staff: Staff[]; initial: Publication[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PubType | "all">("all");
  const [year, setYear] = useState<number | "all">("all");
  const [scopusOnly, setScopusOnly] = useState(false);
  const [ugcOnly, setUgcOnly] = useState(false);

  const years = useMemo(() => [...new Set(initial.map((p) => p.pub_year))].sort((a, b) => b - a), [initial]);
  const filtered = useMemo(() => filterPublications(initial, { search, type, year, scopusOnly, ugcOnly }), [initial, search, type, year, scopusOnly, ugcOnly]);

  async function remove(id: string) { await deletePublication({ institutionId, id }); router.refresh(); }

  function exportCSV() {
    const blob = new Blob([publicationsCSV(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `publications-nirf-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const selectCls = "px-2.5 py-1.5 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/institutions/${instSlug}/research`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600 mb-1"><ChevronLeft size={13} /> Research</Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={22} className="text-purple-600" /> Publications</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Faculty publications with Scopus / UGC-CARE flags — NIRF Criterion 3.</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Plus size={15} /> Add Publication</button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, journal, faculty, author…"
            className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as PubType | "all")}>
          <option value="all">All types</option>
          {PUB_TYPES.map((t) => <option key={t} value={t}>{PUB_TYPE_LABELS[t]}</option>)}
        </select>
        <select className={selectCls} value={String(year)} onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}>
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 px-2"><input type="checkbox" checked={scopusOnly} onChange={(e) => setScopusOnly(e.target.checked)} className="accent-purple-600" /> Scopus</label>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300 px-2"><input type="checkbox" checked={ugcOnly} onChange={(e) => setUgcOnly(e.target.checked)} className="accent-purple-600" /> UGC-CARE</label>
        <button onClick={exportCSV} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><Download size={14} /> NIRF CSV</button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Publication</th>
              <th className="text-left font-medium px-4 py-2.5">Faculty</th>
              <th className="text-center font-medium px-4 py-2.5">Year</th>
              <th className="text-center font-medium px-4 py-2.5">Indexing</th>
              <th className="text-right font-medium px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No publications match these filters.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 align-top">
                <td className="px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${PUB_TYPE_COLORS[p.pub_type]}`}>{PUB_TYPE_LABELS[p.pub_type]}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white">{p.title}</div>
                      {(p.journal_name || p.publisher) && <div className="text-[11px] text-slate-400">{p.journal_name || p.publisher}{p.impact_factor != null ? ` · IF ${p.impact_factor}` : ""}</div>}
                      {p.document_url && <a href={p.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 mt-0.5">View <ExternalLink size={9} /></a>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{p.staff?.full_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{p.pub_year}</td>
                <td className="px-4 py-2.5 text-center">
                  <div className="inline-flex flex-wrap gap-1 justify-center">
                    {p.scopus_indexed && <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><BadgeCheck size={10} /> Scopus</span>}
                    {p.ugc_listed && <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"><BadgeCheck size={10} /> UGC</span>}
                    {!p.scopus_indexed && !p.ugc_listed && <span className="text-slate-400 text-[11px]">—</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PublicationDrawer open={open} institutionId={institutionId} staff={staff} onClose={() => setOpen(false)} />
    </div>
  );
}
