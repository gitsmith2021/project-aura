"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Plus, X, Pencil, Trash2, ChevronLeft, Globe, Mail, Phone } from "lucide-react";
import { createCompany, updateCompany, deleteCompany } from "@/actions/placements";
import type { Company } from "@/lib/placements";

export function CompaniesManager({ institutionId, instSlug, initial }: { institutionId: string; instSlug: string; initial: Company[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [hrName, setHrName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [hrPhone, setHrPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditing(null); setName(""); setIndustry(""); setWebsite(""); setHrName(""); setHrEmail(""); setHrPhone("");
    setError(null); setOpen(true);
  }
  function openEdit(c: Company) {
    setEditing(c); setName(c.name); setIndustry(c.industry ?? ""); setWebsite(c.website ?? "");
    setHrName(c.hr_contact_name ?? ""); setHrEmail(c.hr_contact_email ?? ""); setHrPhone(c.hr_contact_phone ?? "");
    setError(null); setOpen(true);
  }

  async function save() {
    if (!name.trim()) { setError("Company name is required."); return; }
    setBusy(true); setError(null);
    const common = { name, industry: industry || null, website: website || null, hrContactName: hrName || null, hrContactEmail: hrEmail || null, hrContactPhone: hrPhone || null };
    const res = editing
      ? await updateCompany({ institutionId, id: editing.id, ...common })
      : await createCompany({ institutionId, ...common });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    await deleteCompany({ institutionId, id });
    router.refresh();
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/institutions/${instSlug}/placements`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600 mb-1"><ChevronLeft size={13} /> Placements</Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Building2 size={22} className="text-purple-600" /> Recruiting Companies</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Company registry with HR contacts for placement drives.</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700"><Plus size={15} /> Add Company</button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No companies yet.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {initial.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">{c.name}</p>
                  {c.industry && <p className="text-[11px] text-slate-400">{c.industry}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"><Pencil size={13} /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-[12px] text-slate-600 dark:text-slate-300">
                {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 truncate"><Globe size={12} /> {c.website}</a>}
                {c.hr_contact_name && <p className="truncate">{c.hr_contact_name}</p>}
                {c.hr_contact_email && <p className="flex items-center gap-1.5 truncate"><Mail size={12} className="text-slate-400" /> {c.hr_contact_email}</p>}
                {c.hr_contact_phone && <p className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {c.hr_contact_phone}</p>}
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
              <div className="flex items-center gap-2"><Building2 size={18} className="text-purple-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editing ? "Edit Company" : "Add Company"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Name <span className="text-rose-500">*</span></label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label className={labelCls}>Industry</label><input className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. IT Services" /></div>
              <div><label className={labelCls}>Website</label><input className={inputCls} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800" />
              <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300">HR Contact</p>
              <div><label className={labelCls}>Name</label><input className={inputCls} value={hrName} onChange={(e) => setHrName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Email</label><input type="email" className={inputCls} value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} /></div>
                <div><label className={labelCls}>Phone</label><input className={inputCls} value={hrPhone} onChange={(e) => setHrPhone(e.target.value)} /></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">{busy ? "Saving…" : editing ? "Save" : "Add Company"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
