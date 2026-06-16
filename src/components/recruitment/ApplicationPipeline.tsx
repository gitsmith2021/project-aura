"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, X, CalendarClock, UserCheck } from "lucide-react";
import {
  APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS,
  RECRUITMENT_PIPELINE,
  nextApplicationStatus, canHire, canReject, pipelineGroups,
  type JobApplication, type ApplicationStatus,
} from "@/lib/recruitment";
import { updateApplicationStatus } from "@/actions/recruitment";

function AppCard({
  app, institutionId, jobId,
  onAdvance, onReject, busy,
}: {
  app: JobApplication;
  institutionId: string;
  jobId: string;
  onAdvance: (id: string, next: ApplicationStatus) => void;
  onReject: (id: string) => void;
  busy: string | null;
}) {
  const next = nextApplicationStatus(app.status);
  const isBusy = busy === app.id;

  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 text-[12px] transition-opacity ${isBusy ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white truncate">{app.applicant_name}</p>
          <p className="text-slate-500 dark:text-slate-400 truncate">{app.applicant_email}</p>
        </div>
        <Link
          href={`/institutions/${institutionId}/recruitment/${jobId}/${app.id}`}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="View details"
        >
          <ChevronRight size={14} />
        </Link>
      </div>

      {app.current_employer && (
        <p className="text-slate-500 dark:text-slate-400 mb-2 truncate">
          {app.current_employer}
          {app.experience_years != null ? ` · ${app.experience_years}y exp` : ""}
        </p>
      )}

      {app.interview_date && app.status === "interview" && (
        <p className="flex items-center gap-1 text-amber-600 dark:text-amber-400 mb-2">
          <CalendarClock size={12} />
          {new Date(app.interview_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      )}

      {app.offer_date && app.status === "offer" && (
        <p className="flex items-center gap-1 text-violet-600 dark:text-violet-400 mb-2">
          <UserCheck size={12} />
          Offer: {new Date(app.offer_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {next && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onAdvance(app.id, next)}
            className="flex-1 px-2 py-1 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-medium text-[11px] transition-colors truncate"
          >
            → {APPLICATION_STATUS_LABELS[next]}
          </button>
        )}
        {canHire(app.status) && (
          <Link
            href={`/institutions/${institutionId}/recruitment/${jobId}/${app.id}?action=hire`}
            className="flex-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-medium text-[11px] transition-colors text-center truncate"
          >
            Hire
          </Link>
        )}
        {canReject(app.status) && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onReject(app.id)}
            className="p-1 rounded-md text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
            title="Reject"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ApplicationPipeline({
  applications: initialApplications,
  institutionId,
  jobId,
}: {
  applications: JobApplication[];
  institutionId: string;
  jobId: string;
}) {
  const router = useRouter();
  const [applications, setApplications] = useState(initialApplications);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = pipelineGroups(applications);

  async function advance(id: string, next: ApplicationStatus) {
    setBusy(id);
    setError(null);
    const result = await updateApplicationStatus({ institutionId, jobId, applicationId: id, status: next });
    if (!result.success) { setError(result.error); }
    else { setApplications(prev => prev.map(a => a.id === id ? { ...a, status: next, updated_at: new Date().toISOString() } : a)); }
    setBusy(null);
    router.refresh();
  }

  async function reject(id: string) {
    setBusy(id);
    setError(null);
    const result = await updateApplicationStatus({ institutionId, jobId, applicationId: id, status: "rejected" });
    if (!result.success) { setError(result.error); }
    else { setApplications(prev => prev.map(a => a.id === id ? { ...a, status: "rejected", updated_at: new Date().toISOString() } : a)); }
    setBusy(null);
    router.refresh();
  }

  const COLS: { key: ApplicationStatus; color: string }[] = [
    { key: "applied",   color: "border-t-slate-400" },
    { key: "screened",  color: "border-t-blue-500" },
    { key: "interview", color: "border-t-amber-500" },
    { key: "offer",     color: "border-t-violet-500" },
    { key: "joined",    color: "border-t-emerald-500" },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-[12px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Kanban columns */}
      <div className="grid grid-cols-5 gap-3 min-w-0">
        {COLS.map(({ key, color }) => {
          const cards = groups[key] ?? [];
          return (
            <div key={key} className={`bg-slate-50 dark:bg-slate-800/50 rounded-xl border-t-2 ${color} p-3 min-h-[120px]`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${APPLICATION_STATUS_COLORS[key]}`}>
                  {APPLICATION_STATUS_LABELS[key]}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    institutionId={institutionId}
                    jobId={jobId}
                    onAdvance={advance}
                    onReject={reject}
                    busy={busy}
                  />
                ))}
                {cards.length === 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center py-4">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejected strip */}
      {(groups.rejected?.length ?? 0) > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-[12px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 select-none list-none flex items-center gap-1">
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
            {groups.rejected.length} rejected candidate{groups.rejected.length !== 1 ? "s" : ""}
          </summary>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            {groups.rejected.map(app => (
              <div key={app.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[12px] opacity-60">
                <p className="font-medium text-slate-900 dark:text-white truncate">{app.applicant_name}</p>
                <p className="text-slate-500 dark:text-slate-400 truncate">{app.applicant_email}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
