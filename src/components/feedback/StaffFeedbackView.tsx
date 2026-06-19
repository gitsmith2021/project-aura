import Link from "next/link";
import { MessageSquareHeart, Star, ChevronRight, Users } from "lucide-react";
import type { StaffFeedbackRow } from "@/actions/feedback";
import { RATING_SCALE, ratingLabel } from "@/lib/feedback";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: RATING_SCALE }).map((_, i) => (
        <Star key={i} size={13} className={i < Math.round(value) ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"} />
      ))}
    </span>
  );
}

export function StaffFeedbackView({ rows }: { rows: StaffFeedbackRow[] }) {
  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0"><MessageSquareHeart size={18} className="text-rose-600" /></div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">My Feedback</h1>
          <p className="text-xs text-slate-500">Anonymous, aggregated ratings from your students</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <MessageSquareHeart size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No feedback yet</p>
          <p className="text-xs text-slate-400 mt-1">Feedback forms created for you will appear here once students respond.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((f) => (
            <Link key={f.id} href={`/staff-portal/feedback/${f.id}/report`} className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 hover:border-rose-300 dark:hover:border-rose-700 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-white">{f.title}</p>
                  {f.subjectName && <p className="text-[12px] text-slate-500">{f.subjectName}</p>}
                  <p className="text-[12px] text-slate-400 flex items-center gap-1 mt-1"><Users size={11} /> {f.responseCount} response{f.responseCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{f.overallAverage ?? "—"}</span>
                    {f.overallAverage !== null && <Stars value={f.overallAverage} />}
                  </div>
                  <p className="text-[11px] text-rose-500 flex items-center justify-end gap-1">{ratingLabel(f.overallAverage)} <ChevronRight size={12} /></p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
