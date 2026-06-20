"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Handshake, Plus, X, Download, Activity, AlertTriangle, Loader2, FileText, Building2 } from "lucide-react";
import { uploadDocument } from "@/lib/storage";
import { getNaacMouCsv, saveMOU, toggleMOUActive, deleteMOU, type MouRow } from "@/actions/industryConnect";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS, computeExpiry, expiryUrgency, mouStats, type PartnerType } from "@/lib/industryConnect";
import { MOUCard } from "./MOUCard";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type Filter = "all" | "active" | "expiring" | "expired";

export function IndustryConnectManager({ institutionId, initial }: { institutionId: string; initial: MouRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [partnerName, setPartnerName] = useState("");
  const [partnerType, setPartnerType] = useState<PartnerType>("industry");
  const [mouDate, setMouDate] = useState("");
  const [validityYears, setValidityYears] = useState("3");
  const [expiryDate, setExpiryDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [activities, setActivities] = useState<string[]>([]);
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingDoc, setExistingDoc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = mouStats(initial.map((m) => ({ partner_type: m.partnerType, expiry_date: m.expiryDate, is_active: m.isActive })));
  const alerts = initial.filter((m) => m.isActive && ["critical", "warning", "expired"].includes(expiryUrgency(m.expiryDate)));

  const visible = initial.filter((m) => {
    if (filter === "all") return true;
    const u = expiryUrgency(m.expiryDate);
    if (filter === "active") return m.isActive;
    if (filter === "expiring") return m.isActive && (u === "critical" || u === "warning");
    if (filter === "expired") return u === "expired";
    return true;
  });

  function openAdd() {
    setEditId(null); setPartnerName(""); setPartnerType("industry"); setMouDate(""); setValidityYears("3"); setExpiryDate("");
    setPurpose(""); setActivities([]); setContactPerson(""); setContactEmail(""); setFile(null); setExistingDoc(null); setError(null); setOpen(true);
  }
  function openEdit(m: MouRow) {
    setEditId(m.id); setPartnerName(m.partnerName); setPartnerType(m.partnerType); setMouDate(m.mouDate);
    setValidityYears(String(m.validityYears)); setExpiryDate(m.expiryDate); setPurpose(m.purpose);
    setActivities(m.activities); setContactPerson(m.contactPerson ?? ""); setContactEmail(m.contactEmail ?? "");
    setFile(null); setExistingDoc(m.mouDocumentUrl); setError(null); setOpen(true);
  }

  // Auto-fill expiry when MOU date / validity change.
  function onMouDate(v: string) { setMouDate(v); if (v) setExpiryDate(computeExpiry(v, Number(validityYears) || 3)); }
  function onValidity(v: string) { setValidityYears(v); if (mouDate) setExpiryDate(computeExpiry(mouDate, Number(v) || 3)); }

  function setAct(i: number, v: string) { setActivities((p) => p.map((a, idx) => (idx === i ? v : a))); }
  function addAct() { setActivities((p) => [...p, ""]); }
  function removeAct(i: number) { setActivities((p) => p.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!partnerName.trim()) { setError("Partner name is required."); return; }
    if (!purpose.trim()) { setError("Purpose is required."); return; }
    if (!mouDate || !expiryDate) { setError("MOU and expiry dates are required."); return; }
    setBusy(true); setError(null);
    let docUrl: string | null = existingDoc;
    if (file) {
      const up = await uploadDocument("mou-documents", file, institutionId);
      if (!up.success) { setBusy(false); setError(up.error); return; }
      docUrl = up.url;
    }
    const res = await saveMOU({
      institutionId, id: editId, partnerName, partnerType, mouDate, validityYears: Math.max(1, Number(validityYears) || 3),
      expiryDate, purpose, activities: activities.map((a) => a.trim()).filter(Boolean),
      contactPerson: contactPerson || null, contactEmail: contactEmail || null, mouDocumentUrl: docUrl,
    });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); router.refresh();
  }

  async function onToggle(m: MouRow) {
    const res = await toggleMOUActive({ institutionId, id: m.id, isActive: !m.isActive });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }
  async function onDelete(m: MouRow) {
    if (!confirm(`Delete the MOU with ${m.partnerName}? Linked activities will be kept but unlinked.`)) return;
    const res = await deleteMOU({ institutionId, id: m.id });
    if (!res.success) { alert(res.error); return; }
    router.refresh();
  }

  async function exportCsv() {
    setExporting(true);
    const res = await getNaacMouCsv(institutionId);
    setExporting(false);
    if (!res.success) { alert(res.error); return; }
    const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `naac-7.1-mous-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Handshake size={22} className="text-teal-600" /> Industry Connect &amp; MOUs</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Partnerships and the activities run under them — NAAC Criterion 7.1.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/institutions/${institutionId}/industry-connect/interactions`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Activity size={15} /> Activities</Link>
          <button onClick={exportCsv} disabled={exporting} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">{exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} NAAC 7.1</button>
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700"><Plus size={15} /> Add MOU</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total MOUs" value={stats.total} icon={<Handshake size={15} />} />
        <Stat label="Active" value={stats.active} icon={<Building2 size={15} />} tint="text-emerald-600" />
        <Stat label="Expiring soon" value={stats.expiringSoon} icon={<AlertTriangle size={15} />} tint={stats.expiringSoon ? "text-amber-600" : undefined} />
        <Stat label="Expired" value={stats.expired} icon={<AlertTriangle size={15} />} tint={stats.expired ? "text-rose-600" : undefined} />
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/20 p-4">
          <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2"><AlertTriangle size={15} /> {alerts.length} MOU{alerts.length > 1 ? "s" : ""} need attention</p>
          <div className="flex flex-wrap gap-1.5">
            {alerts.map((m) => {
              const u = expiryUrgency(m.expiryDate);
              return <span key={m.id} className={`text-[11px] px-2 py-0.5 rounded-full ${u === "expired" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" : u === "critical" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"}`}>{m.partnerName} · {u === "expired" ? "expired" : `expires ${new Date(m.expiryDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}</span>;
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(["all", "active", "expiring", "expired"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[12px] font-medium rounded-full border capitalize ${filter === f ? "bg-teal-600 text-white border-teal-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{f}</button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No MOUs in this view.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((m) => <MOUCard key={m.id} mou={m} onEdit={() => openEdit(m)} onToggle={() => onToggle(m)} onDelete={() => onDelete(m)} />)}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Handshake size={18} className="text-teal-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">{editId ? "Edit MOU" : "Add MOU"}</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div><label className={labelCls}>Partner name <span className="text-rose-500">*</span></label><input className={inputCls} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} /></div>
              <div><label className={labelCls}>Partner type</label>
                <select className={inputCls} value={partnerType} onChange={(e) => setPartnerType(e.target.value as PartnerType)}>
                  {PARTNER_TYPES.map((t) => <option key={t} value={t}>{PARTNER_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1"><label className={labelCls}>MOU date <span className="text-rose-500">*</span></label><input type="date" className={inputCls} value={mouDate} onChange={(e) => onMouDate(e.target.value)} /></div>
                <div className="col-span-1"><label className={labelCls}>Validity (yrs)</label><input type="number" min={1} className={inputCls} value={validityYears} onChange={(e) => onValidity(e.target.value)} /></div>
                <div className="col-span-1"><label className={labelCls}>Expiry</label><input type="date" className={inputCls} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></div>
              </div>
              <div><label className={labelCls}>Purpose <span className="text-rose-500">*</span></label><textarea className={inputCls + " h-20 resize-none"} value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
              <div>
                <div className="flex items-center justify-between mb-1"><label className={labelCls + " mb-0"}>Planned activities</label><button onClick={addAct} className="text-[12px] font-medium text-teal-600 hover:text-teal-700 inline-flex items-center gap-1"><Plus size={12} /> Add</button></div>
                <div className="space-y-2">
                  {activities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className={inputCls + " flex-1"} value={a} onChange={(e) => setAct(i, e.target.value)} placeholder={`Activity ${i + 1}`} />
                      <button onClick={() => removeAct(i)} className="p-1 text-slate-400 hover:text-rose-500"><X size={14} /></button>
                    </div>
                  ))}
                  {activities.length === 0 && <p className="text-[12px] text-slate-400">No planned activities listed.</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Contact person</label><input className={inputCls} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></div>
                <div><label className={labelCls}>Contact email</label><input type="email" className={inputCls} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
              </div>
              <div>
                <label className={labelCls}>MOU document</label>
                <input type="file" className={inputCls} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {existingDoc && !file && <a href={existingDoc} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700"><FileText size={11} /> Current document</a>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}{busy ? "Saving…" : editId ? "Save" : "Add MOU"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, tint }: { label: string; value: number; icon: React.ReactNode; tint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1">{icon} {label}</p>
      <p className={`text-2xl font-bold mt-1 ${tint ?? "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}
