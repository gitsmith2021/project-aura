"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck, Loader2, CheckCircle2, XCircle, Clock,
  FileText, Trash2, ExternalLink,
} from "lucide-react";
import {
  getMyConsents, recordConsent, withdrawConsent,
  getMyErasureRequests, requestErasure,
  type ConsentStatus, type ErasureRequest,
} from "@/actions/privacy";
import { CONSENT_TYPES, CONSENT_TYPE_META, ERASURE_SLA_HOURS, type ConsentType } from "@/lib/dataRetention";

const STATUS_BADGES: Record<ErasureRequest["status"], { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" },
  in_review: { label: "In Review", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" },
  rejected:  { label: "Rejected",  cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function PrivacyCenter({
  institutionId,
  subjectType,
  subjectId,
}: {
  institutionId: string;
  subjectType: "student" | "staff";
  subjectId: string;
}) {
  const [status, setStatus] = useState<ConsentStatus>({});
  const [requests, setRequests] = useState<ErasureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyType, setBusyType] = useState<ConsentType | null>(null);
  const [error, setError] = useState("");

  // Erasure form
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    const [consents, erasures] = await Promise.all([getMyConsents(), getMyErasureRequests()]);
    if (consents.success) setStatus(consents.data.status);
    if (erasures.success) setRequests(erasures.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(type: ConsentType, active: boolean) {
    setBusyType(type);
    setError("");
    const res = active ? await withdrawConsent(type) : await recordConsent(type, true);
    if (!res.success) setError(res.error);
    else await load();
    setBusyType(null);
  }

  async function handleErasureSubmit() {
    if (!reason.trim()) { setFormError("Please describe why you want your data erased."); return; }
    setSubmitting(true);
    setFormError("");
    const res = await requestErasure({
      institution_id: institutionId,
      subject_type: subjectType,
      subject_id: subjectId,
      reason: reason.trim(),
    });
    if (!res.success) {
      setFormError(res.error);
    } else {
      setReason("");
      await load();
    }
    setSubmitting(false);
  }

  const hasOpenRequest = requests.some((r) => r.status === "pending" || r.status === "in_review");

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={22} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── My consents ── */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-violet-600 dark:text-violet-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">My Consents</h2>
          </div>
          <Link
            href="/privacy-policy"
            target="_blank"
            className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
          >
            Privacy policy <ExternalLink size={11} />
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {CONSENT_TYPES.map((type) => {
            const meta = CONSENT_TYPE_META[type];
            const current = status[type];
            const active = current?.consented === true;
            return (
              <div key={type} className="flex items-start gap-3 px-5 py-3.5">
                <div className="mt-0.5 shrink-0">
                  {active ? (
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  ) : (
                    <XCircle size={16} className="text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {meta.label}
                    {meta.required && (
                      <span className="ml-1.5 text-[9px] font-bold text-violet-600 dark:text-violet-400 uppercase">required</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{meta.description}</p>
                  {current && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      {current.withdrawn_at
                        ? `Withdrawn on ${fmtDate(current.withdrawn_at)}`
                        : active
                          ? `Given on ${fmtDate(current.consented_at)}`
                          : `Declined on ${fmtDate(current.consented_at)}`}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {meta.required ? (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic max-w-[140px] block text-right">
                      Withdraw via erasure request below
                    </span>
                  ) : (
                    <button
                      onClick={() => handleToggle(type, active)}
                      disabled={busyType !== null}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                        active
                          ? "text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          : "text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      }`}
                    >
                      {busyType === type ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : active ? "Withdraw" : "Give consent"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {error && <p className="px-5 pb-3 text-xs text-red-600">{error}</p>}
      </section>

      {/* ── Erasure requests ── */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Trash2 size={16} className="text-rose-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Data Erasure</h2>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Under the DPDP Act 2023 you can ask your institution to erase your personal data. Requests are
            resolved within {ERASURE_SLA_HOURS} hours. Data the institution must keep by law (e.g. financial
            records) is exempt — any refusal will include a documented reason.
          </p>

          {hasOpenRequest ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300">
              <Clock size={14} className="shrink-0" />
              You have an erasure request in progress — its status is shown below.
            </div>
          ) : (
            <div className="space-y-2.5">
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why do you want your data erased? (e.g. I have left the institution)"
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
              />
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <button
                onClick={handleErasureSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 size={12} className="animate-spin" />}
                Submit erasure request
              </button>
            </div>
          )}

          {requests.length > 0 && (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGES[r.status].cls}`}>
                        {STATUS_BADGES[r.status].label}
                      </span>
                      <span className="text-[10px] text-slate-400">Requested {fmtDate(r.requested_at)}</span>
                      {r.resolved_at && (
                        <span className="text-[10px] text-slate-400">· Resolved {fmtDate(r.resolved_at)}</span>
                      )}
                    </div>
                    {r.reason && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{r.reason}</p>
                    )}
                    {r.admin_notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">
                        <span className="font-semibold">Institution response:</span> {r.admin_notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
