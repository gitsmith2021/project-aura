import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Award } from "lucide-react";
import type { ExamReview } from "@/actions/onlineExams";
import { percentage, QUESTION_TYPE_LABELS } from "@/lib/onlineExams";

export function ExamReviewView({ review }: { review: ExamReview }) {
  const pct = percentage(review.score, review.totalMarks);

  function labelFor(keys: string[], options: { key: string; text: string }[], isShort: boolean): string {
    if (isShort) return keys.join(", ") || "—";
    if (options.length === 0) return keys.join(", ") || "—";
    return keys.map((k) => options.find((o) => o.key === k)?.text ?? k).join(", ") || "—";
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
      <Link href="/student-portal/exams/online" className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-3"><ArrowLeft size={13} /> Online exams</Link>

      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white p-5 shadow-sm">
        <p className="text-[11px] uppercase tracking-widest text-violet-100 font-semibold">Result</p>
        <p className="text-lg font-bold mt-0.5">{review.title}</p>
        <div className="mt-4 flex items-end gap-4">
          <p className="text-3xl font-bold">{review.score}<span className="text-lg text-violet-200"> / {review.totalMarks}</span></p>
          <p className="text-xl font-semibold text-violet-100 pb-0.5">{pct}%</p>
          <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold ${review.passed ? "bg-emerald-400/20 text-emerald-50" : "bg-rose-400/20 text-rose-50"}`}>
            <Award size={13} /> {review.passed ? "Passed" : "Below pass"}
          </span>
        </div>
        {review.flagged && <p className="mt-3 text-[12px] text-amber-100 flex items-center gap-1"><AlertTriangle size={13} /> This attempt was flagged for integrity violations.</p>}
      </div>

      <div className="mt-5 space-y-3">
        {review.questions.map((q, i) => (
          <div key={i} className={`rounded-xl border p-4 ${q.isCorrect ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/10"}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white"><span className="text-slate-400">Q{i + 1}.</span> {q.questionText}</p>
              <span className="text-[12px] font-semibold shrink-0 flex items-center gap-1">{q.isCorrect ? <CheckCircle2 size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-rose-500" />} {q.awarded}/{q.marks}</span>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">{QUESTION_TYPE_LABELS[q.questionType]}</p>
            <div className="mt-2 space-y-1 text-[12px]">
              <p className="text-slate-600 dark:text-slate-300">Your answer: <span className={q.isCorrect ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>{labelFor(q.response, q.options, q.questionType === "short")}</span></p>
              {!q.isCorrect && <p className="text-slate-600 dark:text-slate-300">Correct answer: <span className="text-emerald-600 dark:text-emerald-400 font-medium">{labelFor(q.correctKeys, q.options, q.questionType === "short")}</span></p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
