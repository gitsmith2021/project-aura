"use client";

import Link from "next/link";
import { Pencil, Users, CalendarDays, Briefcase } from "lucide-react";
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS,
  EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPE_COLORS,
  deadlineLabel, isDeadlinePassed,
  type JobPosting,
} from "@/lib/recruitment";

export function JobPostingCard({
  posting,
  institutionId,
  today,
  onEdit,
}: {
  posting: JobPosting;
  institutionId: string;
  today: string;
  onEdit: (posting: JobPosting) => void;
}) {
  const dlLabel = deadlineLabel(posting.deadline, today);
  const dlPassed = isDeadlinePassed(posting.deadline, today);

  return (
    <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-shadow">
      {/* Status + type badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[posting.status]}`}>
          {JOB_STATUS_LABELS[posting.status]}
        </span>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${EMPLOYMENT_TYPE_COLORS[posting.employment_type]}`}>
          {EMPLOYMENT_TYPE_LABELS[posting.employment_type]}
        </span>
        {posting.departments?.name && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {posting.departments.name}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white mb-1 pr-8 line-clamp-2">
        {posting.title}
      </h3>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-[12px] text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
        <span className="flex items-center gap-1">
          <Users size={12} />
          {posting.vacancies} {posting.vacancies === 1 ? "vacancy" : "vacancies"}
        </span>
        {posting.experience_years != null && (
          <span className="flex items-center gap-1">
            <Briefcase size={12} />
            {posting.experience_years}+ yrs
          </span>
        )}
        {posting.deadline && (
          <span className={`flex items-center gap-1 ${dlPassed ? "text-rose-500 dark:text-rose-400" : ""}`}>
            <CalendarDays size={12} />
            {dlLabel}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-slate-400 dark:text-slate-500">
          {posting.application_count ?? 0} application{(posting.application_count ?? 0) !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(posting)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            title="Edit posting"
          >
            <Pencil size={14} />
          </button>
          {posting.status === "open" && (
            <Link
              href={`/institutions/${institutionId}/recruitment/${posting.id}`}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              View Pipeline
            </Link>
          )}
          {posting.status !== "open" && (
            <Link
              href={`/institutions/${institutionId}/recruitment/${posting.id}`}
              className="px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              View
            </Link>
          )}
        </div>
      </div>

      {posting.description && (
        <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2">
          {posting.description}
        </p>
      )}
    </div>
  );
}
