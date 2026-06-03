"use client";

import { useState } from "react";
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  publishDraftSchedule,
  type DraftScheduleData,
  type DraftTimetableEntry,
} from "@/actions/scheduler";
import { SHIFT_PERIOD_TIMES } from "@/lib/scheduleConstants";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

type Props = {
  draft: DraftScheduleData;
  sessionType?: string;
  onBack: () => void;
  onPublished: (count: number) => void;
};

export function DraftPreviewPanel({ draft, sessionType = "NORMAL", onBack, onPublished }: Props) {
  const periodLabels = (SHIFT_PERIOD_TIMES[sessionType] ?? SHIFT_PERIOD_TIMES.NORMAL).map((p) => p.label);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Build day → period → entries lookup
  const grid: Record<string, Record<number, DraftTimetableEntry[]>> = {};
  for (const day of DAYS) {
    grid[day] = {};
    for (let p = 0; p < 6; p++) grid[day][p] = [];
  }
  for (const e of draft.timetable) {
    if (grid[e.day_name]?.[e.period]) {
      grid[e.day_name][e.period].push(e);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setPublishError(null);
    const result = await publishDraftSchedule(draft.id);
    setPublishing(false);
    if (result.success) {
      onPublished(result.count);
    } else {
      setPublishError(result.error);
    }
  }

  const isPublished = draft.status === "PUBLISHED";
  const maxHours = Math.max(...draft.staff_workload.map((s) => s.total_hours_week), 1);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-400 hover:text-violet-600 hover:border-violet-200 hover:bg-violet-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 truncate">Draft Preview</p>
          <p className="text-[10px] text-slate-400">{draft.academic_year} · {draft.timetable.length} slots</p>
        </div>
        {isPublished && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
            Published
          </span>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">

        {/* Staff Workload */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Staff Workload
          </p>
          <div className="space-y-1.5">
            {draft.staff_workload.map((s) => {
              const pct = Math.round((s.total_hours_week / maxHours) * 100);
              return (
                <div key={s.staff_id} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-700 truncate w-28 shrink-0">{s.staff_name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 w-8 text-right">
                    {s.total_hours_week}h
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timetable — by day */}
        <section>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Timetable
          </p>
          <div className="space-y-3">
            {DAYS.map((day) => {
              const dayEntries = Object.values(grid[day]).flat();
              if (dayEntries.length === 0) return null;
              return (
                <div key={day}>
                  <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <span className="h-px flex-1 bg-slate-200" />
                    {day}
                    <span className="h-px flex-1 bg-slate-200" />
                  </p>
                  <div className="space-y-1">
                    {Array.from({ length: 6 }, (_, p) => {
                      const entries = grid[day][p];
                      if (!entries || entries.length === 0) return null;
                      return (
                        <div key={p} className="rounded-md border border-slate-100 bg-white px-2.5 py-1.5">
                          <p className="text-[10px] font-semibold text-slate-400 mb-1">
                            P{p + 1} · {periodLabels[p]}
                          </p>
                          <div className="space-y-0.5">
                            {entries.map((e, i) => (
                              <div key={i} className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-slate-700 truncate">{e.staff_name}</span>
                                <span className="shrink-0 text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                                  {e.cohort_name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer actions */}
      <div className="shrink-0 pt-3 mt-3 border-t border-slate-100 space-y-2">
        {publishError && (
          <div className="flex items-start gap-1.5 rounded-md bg-red-50 border border-red-200 px-2.5 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
            <span className="text-[11px] text-red-700">{publishError}</span>
          </div>
        )}
        <button
          onClick={handlePublish}
          disabled={publishing || isPublished}
          className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
        >
          {publishing ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Publishing…</>
          ) : isPublished ? (
            <><CheckCircle2 className="w-3 h-3" /> Already Published</>
          ) : (
            <><Upload className="w-3 h-3" /> Publish to Calendar</>
          )}
        </button>
        <p className="text-center text-[10px] text-slate-400">
          {isPublished
            ? "This draft is already in the calendar."
            : `${draft.timetable.length} class slots will be added to the schedule.`}
        </p>
      </div>
    </div>
  );
}
