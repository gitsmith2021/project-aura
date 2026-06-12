"use client";

import { useCallback, useEffect, useState, use } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getErasureRequests, updateErasureRequest, getConsentLogs,
  type ErasureRequest, type ConsentLog,
} from "@/actions/privacy";
import { RETENTION_POLICIES, CONSENT_TYPE_META, ERASURE_SLA_HOURS } from "@/lib/dataRetention";
import {
  ShieldCheck, Loader2, Trash2, ScrollText, Archive,
  AlertTriangle, CheckCircle2, XCircle, Clock, Play,
} from "lucide-react";

type Tab = "erasure" | "consents" | "retention";

const STATUS_BADGES: Record<ErasureRequest["status"], { label: string; cls: string }> = {
  pending:   { label: "Pending",   cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" },
  in_review: { label: "In Review", cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" },
  rejected:  { label: "Rejected",  cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300" },
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 36e5;

const isOverdue = (r: ErasureRequest) =>
  (r.status === "pending" || r.status === "in_review") && hoursSince(r.requested_at) > ERASURE_SLA_HOURS;

export default function CompliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [tab, setTab] = useState<Tab>("erasure");
  const [requests, setRequests] = useState<ErasureRequest[]>([]);
  const [logs, setLogs] = useState<ConsentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Per-request action state
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [er, cl] = await Promise.all([
      getErasureRequests(institutionId),
      getConsentLogs(institutionId),
    ]);
    if (er.success) setRequests(er.data); else setError(er.error);
    if (cl.success) setLogs(cl.data);
    setLoading(false);
  }, [institutionId]);

  useEffect(() => { load(); }, [load]);

  async function transition(r: ErasureRequest, status: ErasureRequest["status"]) {
    setBusyId(r.id);
    setError("");
    const res = await updateErasureRequest(
      r.id, institutionId, status, notesById[r.id] ?? r.admin_notes ?? ""
    );
    if (!res.success) setError(res.error);
    else await load();
    setBusyId(null);
  }

  const pending = requests.filter((r) => r.status === "pending").length;
  const overdue = requests.filter(isOverdue).length;
  const completed = requests.filter((r) => r.status === "completed").length;
  const activeConsents = logs.filter((l) => l.consented && !l.withdrawn_at).length;

  const tabs: { key: Tab; label: string; Icon: typeof Trash2 }[] = [
    { key: "erasure",   label: "Erasure Requests", Icon: Trash2 },
    { key: "consents",  label: "Consent Audit Log", Icon: ScrollText },
    { key: "retention", label: "Retention Policy",  Icon: Archive },
  ];

  return (
    <DashboardLayout>
      <div className="px-6 py-8 w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <ShieldCheck size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">DPDP Compliance</h1>
            <p className="text-xs text-slate-500">
              Digital Personal Data Protection Act 2023 — consent ledger &amp; erasure queue
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Pending Requests",  value: pending,        color: "text-amber-600" },
            { label: `Overdue (> ${ERASURE_SLA_HOURS}h)`, value: overdue, color: overdue > 0 ? "text-rose-600" : "text-emerald-600" },
            { label: "Completed",         value: completed,      color: "text-emerald-600" },
            { label: "Active Consents",   value: activeConsents, color: "text-violet-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key
                  ? "bg-violet-600 text-white"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <t.Icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-violet-500" />
          </div>
        ) : tab === "erasure" ? (
          /* ── Erasure queue ── */
          requests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No erasure requests — nothing in the queue.
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => {
                const open = r.status === "pending" || r.status === "in_review";
                const overdueFlag = isOverdue(r);
                return (
                  <div
                    key={r.id}
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-4 ${
                      overdueFlag ? "border-rose-300 dark:border-rose-800" : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {r.subject_name ?? "Unknown subject"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                        {r.subject_type}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGES[r.status].cls}`}>
                        {STATUS_BADGES[r.status].label}
                      </span>
                      {overdueFlag && (
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                          <AlertTriangle size={10} /> {ERASURE_SLA_HOURS}h SLA breached
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-slate-400">
                        Requested {fmtDateTime(r.requested_at)}
                        {r.resolved_at && ` · Resolved ${fmtDateTime(r.resolved_at)}`}
                      </span>
                    </div>

                    {r.reason && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        <span className="font-semibold">Reason:</span> {r.reason}
                      </p>
                    )}

                    {open ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <textarea
                          rows={2}
                          value={notesById[r.id] ?? r.admin_notes ?? ""}
                          onChange={(e) => setNotesById((m) => ({ ...m, [r.id]: e.target.value }))}
                          placeholder="Admin notes — required when rejecting (DPDP: refusals must be documented)"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                        />
                        <div className="flex flex-wrap gap-2">
                          {r.status === "pending" && (
                            <button
                              onClick={() => transition(r, "in_review")}
                              disabled={busyId !== null}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              {busyId === r.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                              Start Review
                            </button>
                          )}
                          <button
                            onClick={() => transition(r, "completed")}
                            disabled={busyId !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {busyId === r.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                            Mark Completed
                          </button>
                          <button
                            onClick={() => transition(r, "rejected")}
                            disabled={busyId !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {busyId === r.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                            Reject
                          </button>
                        </div>
                        <p className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock size={10} /> Completing this request means the subject&apos;s personal data has
                          actually been erased or anonymised — record what was done in the notes.
                        </p>
                      </div>
                    ) : (
                      r.admin_notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-semibold">Resolution notes:</span> {r.admin_notes}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : tab === "consents" ? (
          /* ── Consent audit log ── */
          logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No consent records yet — they appear as users accept the first-login consent banner.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5 font-semibold">User</th>
                    <th className="px-4 py-2.5 font-semibold">Consent</th>
                    <th className="px-4 py-2.5 font-semibold">Choice</th>
                    <th className="px-4 py-2.5 font-semibold">Recorded</th>
                    <th className="px-4 py-2.5 font-semibold">Withdrawn</th>
                    <th className="px-4 py-2.5 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {l.user_name ?? `${l.user_id.slice(0, 8)}…`}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                        {CONSENT_TYPE_META[l.consent_type]?.label ?? l.consent_type}
                      </td>
                      <td className="px-4 py-2.5">
                        {l.consented ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Given</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">Declined</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDateTime(l.consented_at)}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {l.withdrawn_at ? fmtDateTime(l.withdrawn_at) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-mono">{l.ip_address ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── Retention policy ── */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5 font-semibold">Data category</th>
                  <th className="px-4 py-2.5 font-semibold">Tables</th>
                  <th className="px-4 py-2.5 font-semibold">Kept for</th>
                  <th className="px-4 py-2.5 font-semibold">Legal basis</th>
                </tr>
              </thead>
              <tbody>
                {RETENTION_POLICIES.map((p) => (
                  <tr key={p.key} className="border-t border-slate-100 dark:border-slate-800 align-top">
                    <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{p.category}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">{p.tables.join(", ")}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{p.period}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{p.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
