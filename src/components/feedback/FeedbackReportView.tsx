import Link from "next/link";
import { ArrowLeft, Star, Users, MessageSquare, BarChart3 } from "lucide-react";
import type { FeedbackReport } from "@/actions/feedback";
import { RATING_SCALE, ratingLabel } from "@/lib/feedback";

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: RATING_SCALE }).map((_, i) => (
        <Star key={i} size={14} className={i < Math.round(value) ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600"} />
      ))}
    </span>
  );
}

export function FeedbackReportView({ report, backHref }: { report: FeedbackReport; backHref: string }) {
  const { aggregate } = report;
  const maxWord = Math.max(1, ...report.wordCloud.map((w) => w.count));

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-rose-600 mb-2"><ArrowLeft size={13} /> Back</Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 size={22} className="text-rose-600" /> {report.title}</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{[report.subjectName, report.staffName].filter(Boolean).join(" · ") || "Aggregated, anonymous results"}</p>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Overall rating</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{aggregate.overallAverage ?? "—"}</p>
            {aggregate.overallAverage !== null && <Stars value={aggregate.overallAverage} />}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{ratingLabel(aggregate.overallAverage)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><Users size={12} /> Responses</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{aggregate.responseCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">of {report.eligibleCount} eligible</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide">Response rate</p>
          <p className="text-2xl font-bold text-violet-600 mt-1">{report.responseRate}%</p>
        </div>
      </div>

      {aggregate.responseCount === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No responses yet.</div>
      ) : (
        <>
          {/* Rating questions */}
          {aggregate.ratings.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Rating questions</p>
              {aggregate.ratings.map((r) => (
                <div key={r.questionId}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] text-slate-700 dark:text-slate-300">{r.text}</p>
                    <span className="flex items-center gap-1.5 shrink-0"><Stars value={r.average} /> <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{r.average || "—"}</span></span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const c = r.distribution[star - 1];
                      const pct = r.count ? Math.round((c / r.count) * 100) : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-[11px]">
                          <span className="w-6 text-slate-400 flex items-center gap-0.5">{star}<Star size={9} className="text-amber-400 fill-amber-400" /></span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
                          <span className="w-8 text-right text-slate-400">{c}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Word cloud */}
          {report.wordCloud.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Common words</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                {report.wordCloud.map((w) => (
                  <span key={w.word} className="text-rose-600 dark:text-rose-400" style={{ fontSize: `${0.8 + (w.count / maxWord) * 1.1}rem`, opacity: 0.5 + (w.count / maxWord) * 0.5 }}>{w.word}</span>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          {aggregate.comments.map((c) => c.answers.length > 0 && (
            <div key={c.questionId} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3"><MessageSquare size={15} className="text-rose-500" /> {c.text} <span className="text-[11px] text-slate-400 font-normal">({c.answers.length})</span></p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {c.answers.map((a, i) => (
                  <p key={i} className="text-[13px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2">{a}</p>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
