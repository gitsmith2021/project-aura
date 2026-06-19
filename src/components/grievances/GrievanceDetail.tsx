"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  CATEGORY_LABELS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS, GRIEVANCE_STATUSES,
  isOverdue, daysToDeadline, type Grievance, type GrievanceStatus,
} from "@/lib/grievances";
import {
  acknowledgeGrievance, assignGrievance, updateGrievanceStatus, setGrievanceDeadline,
} from "@/actions/grievances";

type StaffOption = { id: string; full_name: string };

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function GrievanceDetail({
  institutionId, instSlug, staffOptions, initial,
}: {
  institutionId: string;
  instSlug: string;
  staffOptions: StaffOption[];
  initial: Grievance;
}) {
  const router = useRouter();
  const g = initial;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GrievanceStatus>(g.status);
  const [notes, setNotes] = useState(g.resolution_notes ?? "");
  const [assigned, setAssigned] = useState(g.assigned_to ?? "");
  const [deadline, setDeadline] = useState(g.deadline ?? "");

  const overdue = isOverdue(g);
  const dToDeadline = daysToDeadline(g.deadline);

  async function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(true); setError(null);
    const res = await fn();
    setBusy(false);
    if (!res.success) { setError(res.error ?? "Something went wrong."); return false; }
    router.refresh();
    return true;
  }

  const inputCls = "w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500";
  const labelCls = "block text-[12px] font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <Link href={`/institutions/${instSlug}/grievances`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600">
        <ChevronLeft size={14} /> Grievances
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{g.subject}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[g.category]}`}>{CATEGORY_LABELS[g.category]}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[g.status]}`}>{STATUS_LABELS[g.status]}</span>
            <span className="text-[11px] text-slate-400">
              {g.complainant_type === "anonymous" ? "Anonymous complainant" : `From a ${g.complainant_type}`} · filed {fmtDate(g.created_at)}
            </span>
          </div>
        </div>
        {g.status === "submitted" && (
          <button onClick={() => run(() => acknowledgeGrievance({ institutionId, grievanceId: g.id }))} disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} Acknowledge
          </button>
        )}
      </div>

      {error && <p className="text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

      {overdue && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
          <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
          <p className="text-[12px] text-rose-700 dark:text-rose-300">Past the resolution deadline ({fmtDate(g.deadline!)}). Consider escalating.</p>
        </div>
      )}

      {/* Description */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-2">Details</h2>
        <p className="text-[13px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{g.description}</p>
      </div>

      {/* Workflow */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white">Resolution Workflow</h2>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Assigned to</label>
            <div className="flex gap-2">
              <select className={inputCls} value={assigned} onChange={(e) => setAssigned(e.target.value)}>
                <option value="">Unassigned</option>
                {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <button onClick={() => run(() => assignGrievance({ institutionId, grievanceId: g.id, staffId: assigned || null }))} disabled={busy}
                className="px-3 py-2 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">Save</button>
            </div>
          </div>
          <div>
            <label className={labelCls}>Resolution deadline {dToDeadline !== null && !isOverdue(g) && <span className="text-slate-400 font-normal">({dToDeadline}d left)</span>}</label>
            <div className="flex gap-2">
              <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <button onClick={() => run(() => setGrievanceDeadline({ institutionId, grievanceId: g.id, deadline: deadline || null }))} disabled={busy}
                className="px-3 py-2 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0">Save</button>
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as GrievanceStatus)}>
            {GRIEVANCE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Resolution notes {(status === "resolved" || status === "closed") && <span className="text-slate-400 font-normal">(shared with a named complainant)</span>}</label>
          <textarea className={`${inputCls} min-h-[90px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Outcome / action taken…" />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => run(() => updateGrievanceStatus({ institutionId, grievanceId: g.id, status, resolutionNotes: notes }))}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Update Status
          </button>
        </div>

        {g.resolved_at && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Resolved {fmtDate(g.resolved_at)}.</p>
        )}
      </div>
    </div>
  );
}
