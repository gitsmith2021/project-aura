"use client";

import { useState, useEffect, useTransition } from "react";
import { CheckCircle2, Clock, XCircle, ChevronDown } from "lucide-react";
import { getInstitutionLeaveRequests, reviewLeaveRequest } from "@/actions/staffPortal";
import type { AdminLeaveRequest } from "@/types/staffPortal";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function days(f: string, t: string) {
  return Math.round((new Date(t).getTime() - new Date(f).getTime()) / 86_400_000) + 1;
}

const statusCfg = {
  approved: { Icon: CheckCircle2, cls: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" },
  rejected: { Icon: XCircle,      cls: "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40" },
  pending:  { Icon: Clock,        cls: "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" },
};

export default function AdminLeavePage({ params }: { params: Promise<{ id: string }> }) {
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [leaves,     setLeaves]     = useState<AdminLeaveRequest[]>([]);
  const [filter,     setFilter]     = useState<"" | "pending" | "approved" | "rejected">("");
  const [loading,    setLoading]    = useState(true);
  const [reviewId,   setReviewId]   = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    params.then(p => setInstitutionId(p.id));
  }, [params]);

  useEffect(() => {
    if (!institutionId) return;
    setLoading(true);
    getInstitutionLeaveRequests(institutionId, filter || undefined)
      .then(r => { if (r.success) setLeaves(r.data); setLoading(false); });
  }, [institutionId, filter]);

  async function handleReview(id: string, status: "approved" | "rejected") {
    if (!institutionId) return;
    await reviewLeaveRequest(id, institutionId, { status, review_note: reviewNote });
    setReviewId(null); setReviewNote("");
    getInstitutionLeaveRequests(institutionId, filter || undefined)
      .then(r => { if (r.success) setLeaves(r.data); });
  }

  const pendingCount = leaves.filter(l => l.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-y-auto px-6 pt-4 pb-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Leave Requests</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {pendingCount > 0 ? `${pendingCount} pending review` : "All caught up"}
            </p>
          </div>

          {/* Status filter */}
          <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
            className="px-3 py-1.5 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 backdrop-blur-sm appearance-none cursor-pointer">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <span className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
            No leave requests {filter ? `with status "${filter}"` : "yet"}.
          </div>
        ) : (
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                  {["Staff","Leave Type","From","To","Days","Reason","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
                {leaves.map(l => {
                  const cfg = statusCfg[l.status] ?? statusCfg.pending;
                  const isExpanded = reviewId === l.id;
                  return (
                    <>
                      <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {l.staff?.title ? `${l.staff.title} ` : ""}{l.staff?.full_name ?? "—"}
                          </p>
                          {l.staff?.designation && <p className="text-[10px] text-slate-400">{l.staff.designation}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 capitalize">{l.leave_type}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(l.from_date)}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(l.to_date)}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">{days(l.from_date, l.to_date)}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{l.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${cfg.cls}`}>
                            <cfg.Icon size={9} /> {l.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {l.status === "pending" && (
                            <button type="button" onClick={() => { setReviewId(isExpanded ? null : l.id); setReviewNote(""); }}
                              className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                              Review <ChevronDown size={10} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          )}
                          {l.review_note && l.status !== "pending" && (
                            <p className="text-[10px] text-slate-400 italic max-w-[120px] truncate" title={l.review_note}>"{l.review_note}"</p>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${l.id}-review`}>
                          <td colSpan={8} className="px-4 pb-3 pt-0 bg-violet-50/30 dark:bg-violet-900/10">
                            <div className="flex flex-wrap items-center gap-3">
                              <input type="text" value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                                placeholder="Optional review note…"
                                className="flex-1 min-w-[200px] px-3 py-1.5 bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400" />
                              <button type="button" onClick={() => handleReview(l.id, "approved")}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                                <CheckCircle2 size={12} /> Approve
                              </button>
                              <button type="button" onClick={() => handleReview(l.id, "rejected")}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors">
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
