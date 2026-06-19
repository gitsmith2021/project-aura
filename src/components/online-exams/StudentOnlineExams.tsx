import Link from "next/link";
import { MonitorCheck, Clock, ListChecks, Play, RotateCcw, Eye, Lock, CalendarClock } from "lucide-react";
import type { StudentExamRow } from "@/actions/onlineExams";
import { examWindowState, formatDuration, percentage } from "@/lib/onlineExams";

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

export function StudentOnlineExams({ rows }: { rows: StudentExamRow[] }) {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0"><MonitorCheck size={18} className="text-violet-600" /></div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Online Exams</h1>
          <p className="text-xs text-slate-500">Take timed assessments and view your results</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <MonitorCheck size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No online exams available</p>
          <p className="text-xs text-slate-400 mt-1">Published exams for your class will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((e) => {
            const attempted = e.sessionStatus === "submitted" || e.sessionStatus === "auto_submitted";
            const win = examWindowState({ status: e.status, scheduled_start: e.scheduledStart, scheduled_end: e.scheduledEnd });
            const canTake = win === "open" && !attempted;
            return (
              <div key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{e.title}</p>
                  {e.subjectName && <p className="text-[12px] text-slate-500">{e.subjectName}</p>}
                  <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300"><Clock size={11} /> {formatDuration(e.durationMinutes)}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300"><ListChecks size={11} /> {e.questionCount} Q · {e.totalMarks}m</span>
                    {e.scheduledStart && win === "upcoming" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><CalendarClock size={11} /> Opens {fmt(e.scheduledStart)}</span>}
                  </div>
                  {attempted && <p className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium mt-2">Scored {e.score ?? 0}/{e.totalMarks} ({percentage(e.score ?? 0, e.totalMarks)}%)</p>}
                </div>
                <div className="shrink-0">
                  {attempted ? (
                    <Link href={`/student-portal/exams/online/${e.id}/review`} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Eye size={13} /> Review</Link>
                  ) : canTake ? (
                    <Link href={`/student-portal/exams/online/${e.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700">
                      {e.sessionStatus === "in_progress" ? <><RotateCcw size={13} /> Resume</> : <><Play size={13} /> Start</>}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-400"><Lock size={13} /> {win === "upcoming" ? "Soon" : "Closed"}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
