"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, X, Printer, Clock } from "lucide-react";
import { requestCertificate, type CertRequestRow } from "@/actions/certificates";
import {
  CERTIFICATE_LABELS, STUDENT_CERT_TYPES, STATUS_LABELS, STATUS_STYLES, type CertificateType,
} from "@/lib/certificates";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

export function StudentCertificates({ initial }: { initial: CertRequestRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CertificateType>("bonafide");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true); setError(null);
    const res = await requestCertificate({ certificateType: type, purpose: purpose || null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setOpen(false); setPurpose(""); router.refresh();
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0"><FileText size={18} className="text-sky-600" /></div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Certificates</h1>
            <p className="text-xs text-slate-500">Request documents and download them once issued</p>
          </div>
        </div>
        <button onClick={() => { setOpen(true); setError(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"><Plus size={15} /> Request</button>
      </div>

      {initial.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <FileText size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No certificate requests yet</p>
          <p className="text-xs text-slate-400 mt-1">Request a bonafide, transfer, or other certificate to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {initial.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{CERTIFICATE_LABELS[r.certificateType]}</p>
                {r.purpose && <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{r.purpose}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                  {r.certificateNo && <span className="text-[11px] font-mono text-slate-400">{r.certificateNo}</span>}
                  {r.status === "requested" && <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={11} /> Awaiting review</span>}
                </div>
                {r.status === "rejected" && r.remarks && <p className="text-[11px] text-rose-500 mt-1">Reason: {r.remarks}</p>}
              </div>
              {r.status === "issued" && (
                <Link href={`/student-portal/certificates/${r.id}/print`} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"><Printer size={13} /> Download</Link>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><FileText size={18} className="text-sky-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Request Certificate</h2></div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className={labelCls}>Certificate type</label>
                <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as CertificateType)}>
                  {STUDENT_CERT_TYPES.map((t) => <option key={t} value={t}>{CERTIFICATE_LABELS[t]}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Purpose (optional)</label><textarea className={inputCls + " h-24 resize-none"} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. applying for an education loan" /></div>
              <p className="text-[11px] text-slate-400">Your request goes to the administration. You&apos;ll be able to download the document once it&apos;s issued.</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={submit} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">{busy ? "Submitting…" : "Submit request"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
