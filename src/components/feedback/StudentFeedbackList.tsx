import Link from "next/link";
import { MessageSquareHeart, CheckCircle2, ChevronRight, Star } from "lucide-react";
import type { StudentFormRow } from "@/actions/feedback";

export function StudentFeedbackList({ rows }: { rows: StudentFormRow[] }) {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0"><MessageSquareHeart size={18} className="text-rose-600" /></div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Feedback</h1>
          <p className="text-xs text-slate-500">Share anonymous feedback on your courses and faculty</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <MessageSquareHeart size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No feedback forms open</p>
          <p className="text-xs text-slate-400 mt-1">Active forms for your class will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{f.title}</p>
                <p className="text-[12px] text-slate-500">{[f.subjectName, f.staffName].filter(Boolean).join(" · ") || `${f.questionCount} questions`}</p>
              </div>
              {f.submitted ? (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 shrink-0"><CheckCircle2 size={14} /> Submitted</span>
              ) : (
                <Link href={`/student-portal/feedback/${f.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 shrink-0"><Star size={13} /> Give feedback <ChevronRight size={13} /></Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
