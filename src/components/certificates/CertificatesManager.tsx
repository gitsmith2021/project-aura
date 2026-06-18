"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, X, Check, Ban, Printer, Trash2, GraduationCap, Briefcase } from "lucide-react";
import {
  getCertificateRequests, approveCertificate, rejectCertificate, issueCertificate,
  issueStaffCertificate, deleteCertificateRequest, type CertRequestRow,
} from "@/actions/certificates";
import {
  CERTIFICATE_LABELS, STAFF_CERT_TYPES, STATUS_LABELS, STATUS_STYLES,
  type CertStatus, type CertificateType,
} from "@/lib/certificates";

const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500";
const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

type StaffOpt = { id: string; full_name: string; employee_id: string | null };
const FILTERS: (CertStatus | "all")[] = ["all", "requested", "approved", "issued", "rejected"];

export function CertificatesManager({ institutionId, initial, staff }: {
  institutionId: string; initial: CertRequestRow[]; staff: StaffOpt[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<CertStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  // reject drawer
  const [rejectFor, setRejectFor] = useState<CertRequestRow | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  // issue-staff drawer
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [staffType, setStaffType] = useState<CertificateType>("experience_certificate");
  const [staffPurpose, setStaffPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await getCertificateRequests(institutionId);
    if (res.success) setRows(res.data);
    router.refresh();
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const counts = FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f] = f === "all" ? rows.length : rows.filter((r) => r.status === f).length;
    return acc;
  }, {});

  async function doIssue(r: CertRequestRow) {
    setBusyId(r.id);
    const res = await issueCertificate({ institutionId, id: r.id });
    setBusyId(null);
    if (!res.success) { alert(res.error); return; }
    refresh();
  }
  async function doApprove(r: CertRequestRow) {
    setBusyId(r.id);
    const res = await approveCertificate({ institutionId, id: r.id });
    setBusyId(null);
    if (!res.success) { alert(res.error); return; }
    refresh();
  }
  async function doReject() {
    if (!rejectFor) return;
    setBusy(true); setError(null);
    const res = await rejectCertificate({ institutionId, id: rejectFor.id, remarks: rejectRemarks });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setRejectFor(null); setRejectRemarks(""); refresh();
  }
  async function doDelete(r: CertRequestRow) {
    if (!confirm(`Delete this ${CERTIFICATE_LABELS[r.certificateType]} request for ${r.holderName}?`)) return;
    const res = await deleteCertificateRequest({ institutionId, id: r.id });
    if (!res.success) { alert(res.error); return; }
    refresh();
  }
  async function doIssueStaff() {
    if (!staffId) { setError("Select a staff member."); return; }
    setBusy(true); setError(null);
    const res = await issueStaffCertificate({ institutionId, staffId, certificateType: staffType, purpose: staffPurpose || null });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setStaffOpen(false); setStaffId(""); setStaffPurpose(""); refresh();
  }

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileText size={22} className="text-sky-600" /> Certificates &amp; Documents</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Review student requests, issue numbered documents, and generate staff letters.</p>
        </div>
        <button onClick={() => { setStaffOpen(true); setError(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700"><Plus size={15} /> Issue staff document</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-full border ${filter === f ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            {f === "all" ? "All" : STATUS_LABELS[f]} <span className="opacity-70">({counts[f] ?? 0})</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No requests in this view.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2.5 font-medium">Holder</th>
              <th className="px-4 py-2.5 font-medium">Document</th>
              <th className="px-4 py-2.5 font-medium">Purpose</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Cert. No</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr></thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {r.requesterType === "student" ? <GraduationCap size={13} className="text-slate-400" /> : <Briefcase size={13} className="text-slate-400" />}
                      {r.holderName}
                    </p>
                    {r.holderRef && <p className="text-[11px] text-slate-400">{r.holderRef}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{CERTIFICATE_LABELS[r.certificateType]}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px]"><span className="line-clamp-2">{r.purpose ?? "—"}</span></td>
                  <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>{r.status === "rejected" && r.remarks && <p className="text-[10px] text-rose-400 mt-1 max-w-[160px] line-clamp-2">{r.remarks}</p>}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{r.certificateNo ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {r.status === "requested" && (
                        <button onClick={() => doApprove(r)} disabled={busyId === r.id} title="Approve" className="p-1.5 rounded-md text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 disabled:opacity-50"><Check size={15} /></button>
                      )}
                      {(r.status === "requested" || r.status === "approved") && (
                        <>
                          <button onClick={() => doIssue(r)} disabled={busyId === r.id} className="px-2 py-1 text-[12px] font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Issue</button>
                          <button onClick={() => { setRejectFor(r); setRejectRemarks(""); setError(null); }} title="Reject" className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"><Ban size={15} /></button>
                        </>
                      )}
                      {r.status === "issued" && (
                        <Link href={`/institutions/${institutionId}/certificates/${r.id}/print`} className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Printer size={13} /> Print</Link>
                      )}
                      <button onClick={() => doDelete(r)} title="Delete" className="p-1.5 rounded-md text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject drawer */}
      {rejectFor && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectFor(null)} />
          <div className="relative w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Ban size={18} className="text-rose-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Reject Request</h2></div>
              <button onClick={() => setRejectFor(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <p className="text-[12px] text-slate-500">Rejecting the {CERTIFICATE_LABELS[rejectFor.certificateType]} request for <span className="font-semibold text-slate-700 dark:text-slate-300">{rejectFor.holderName}</span>.</p>
              <div><label className={labelCls}>Reason <span className="text-rose-500">*</span></label><textarea className={inputCls + " h-28 resize-none"} value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="Shared with the requester" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setRejectFor(null)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={doReject} disabled={busy} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">{busy ? "Rejecting…" : "Reject"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue staff document drawer */}
      {staffOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setStaffOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2"><Briefcase size={18} className="text-sky-500" /><h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Issue Staff Document</h2></div>
              <button onClick={() => setStaffOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} /></button>
            </div>
            <div className="flex-1 px-5 py-4 space-y-4">
              {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}
              <div>
                <label className={labelCls}>Staff member</label>
                <select className={inputCls} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">Select staff</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.employee_id ? ` (${s.employee_id})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Document type</label>
                <select className={inputCls} value={staffType} onChange={(e) => setStaffType(e.target.value as CertificateType)}>
                  {STAFF_CERT_TYPES.map((t) => <option key={t} value={t}>{CERTIFICATE_LABELS[t]}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Purpose / note (optional)</label><input className={inputCls} value={staffPurpose} onChange={(e) => setStaffPurpose(e.target.value)} /></div>
              <p className="text-[11px] text-slate-400">The document is issued immediately with a reference number, ready to print.</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setStaffOpen(false)} className="px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button onClick={doIssueStaff} disabled={busy || !staffId} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50">{busy ? "Issuing…" : "Issue"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
