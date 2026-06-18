"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, IndianRupee, Download, FileText, ExternalLink, Check, X, Banknote } from "lucide-react";
import {
  SCHEME_TYPE_LABELS, SCHEME_TYPE_COLORS, STATUS_LABELS, STATUS_COLORS, formatINR, applicationsCSV,
  type ScholarshipScheme, type ScholarshipApplication,
} from "@/lib/scholarships";
import { updateApplicationStatus, disburseScholarship } from "@/actions/scholarships";
import { EligibilityChecker } from "./EligibilityChecker";

function ApplicationRow({ institutionId, schemeId, schemeCriteria, amountDefault, app }: {
  institutionId: string; schemeId: string;
  schemeCriteria: ScholarshipScheme["eligibility_criteria"]; amountDefault: number | null;
  app: ScholarshipApplication;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  const [amount, setAmount] = useState((app.disbursed_amount ?? amountDefault ?? "").toString());

  async function setStatus(status: "verified" | "approved" | "rejected") {
    setBusy(true);
    await updateApplicationStatus({ institutionId, schemeId, applicationId: app.id, status });
    setBusy(false);
    router.refresh();
  }

  async function disburse() {
    setBusy(true);
    const res = await disburseScholarship({ institutionId, schemeId, applicationId: app.id, amount: Number(amount) });
    setBusy(false);
    if (res.success) { setDisbursing(false); router.refresh(); }
    else alert(res.error);
  }

  const docs = Array.isArray(app.documents_url) ? app.documents_url : [];

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/40 align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900 dark:text-white">{app.students?.full_name ?? "—"}</div>
        <div className="text-[11px] text-slate-400">{[app.students?.roll_no, app.students?.category].filter(Boolean).join(" · ")}</div>
        {docs.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {docs.map((d, i) => (
              <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700">
                <FileText size={11} /> {d.name || `Doc ${i + 1}`} <ExternalLink size={9} />
              </a>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <EligibilityChecker criteria={schemeCriteria} student={{ category: app.students?.category ?? null }} compact />
      </td>
      <td className="px-4 py-3">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[app.status]}`}>{STATUS_LABELS[app.status]}</span>
        {app.status === "disbursed" && app.disbursed_amount != null && (
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(app.disbursed_amount)} adjusted</div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {disbursing ? (
          <div className="inline-flex items-center gap-1.5">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₹"
              className="w-24 px-2 py-1 text-[12px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={disburse} disabled={busy} className="px-2.5 py-1 text-[12px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">Confirm</button>
            <button onClick={() => setDisbursing(false)} className="px-2 py-1 text-[12px] text-slate-500">Cancel</button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5">
            {app.status === "applied" && (
              <button onClick={() => setStatus("verified")} disabled={busy} className="px-2.5 py-1 text-[12px] font-medium rounded-lg border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-50">Verify</button>
            )}
            {app.status === "verified" && (
              <button onClick={() => setStatus("approved")} disabled={busy} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"><Check size={12} /> Approve</button>
            )}
            {app.status === "approved" && (
              <button onClick={() => setDisbursing(true)} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"><Banknote size={12} /> Disburse</button>
            )}
            {(app.status === "applied" || app.status === "verified" || app.status === "approved") && (
              <button onClick={() => setStatus("rejected")} disabled={busy} title="Reject" className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600"><X size={14} /></button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export function SchemeApplications({ institutionId, scheme, applications }: {
  institutionId: string; scheme: ScholarshipScheme | null; applications: ScholarshipApplication[];
}) {
  if (!scheme) return <p className="text-slate-400">Scheme not found.</p>;

  function exportCSV() {
    const blob = new Blob([applicationsCSV(applications)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${scheme!.name.replace(/\s+/g, "-")}-applications.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Award size={20} className="text-purple-600" /> {scheme.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[12px] text-slate-500">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${SCHEME_TYPE_COLORS[scheme.scheme_type]}`}>{SCHEME_TYPE_LABELS[scheme.scheme_type]}</span>
              <span className="inline-flex items-center gap-1"><IndianRupee size={13} className="text-slate-400" />{formatINR(scheme.amount_per_student)} / student</span>
            </div>
            {scheme.eligibility_criteria && (
              <p className="text-[11px] text-slate-400 mt-2">
                Eligibility: {[
                  scheme.eligibility_criteria.categories?.length ? scheme.eligibility_criteria.categories.join("/") : null,
                  scheme.eligibility_criteria.min_marks != null ? `≥${scheme.eligibility_criteria.min_marks}%` : null,
                  scheme.eligibility_criteria.income_limit != null ? `income ≤ ${formatINR(scheme.eligibility_criteria.income_limit)}` : null,
                ].filter(Boolean).join(" · ") || "Open to all"}
              </p>
            )}
          </div>
          <button onClick={exportCSV} disabled={applications.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"><Download size={15} /> CSV</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Student</th>
              <th className="text-left font-medium px-4 py-2.5">Eligibility</th>
              <th className="text-left font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {applications.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No applications for this scheme yet.</td></tr>
            ) : applications.map((a) => (
              <ApplicationRow key={a.id} institutionId={institutionId} schemeId={scheme.id}
                schemeCriteria={scheme.eligibility_criteria} amountDefault={scheme.amount_per_student} app={a} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
