"use client";

import { FlaskConical, ListChecks } from "lucide-react";
import type { LabExperiment } from "@/lib/laboratories";

export function ExperimentCard({ experiment }: { experiment: LabExperiment }) {
  const reqs = experiment.requirements ?? [];
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
          <FlaskConical size={16} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{experiment.title}</h3>
          {experiment.description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{experiment.description}</p>
          )}
        </div>
      </div>

      {reqs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            <ListChecks size={12} /> Requirements
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reqs.map((r, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
