"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, ArrowLeft, ShieldCheck, CheckCircle2, Send } from "lucide-react";
import { submitFeedback, type StudentFormDetail } from "@/actions/feedback";
import { RATING_SCALE, type AnswerMap } from "@/lib/feedback";

export function FeedbackForm({ form }: { form: StudentFormDetail }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function setRating(qid: string, v: number) { setAnswers((p) => ({ ...p, [qid]: v })); }
  function setText(qid: string, v: string) { setAnswers((p) => ({ ...p, [qid]: v })); }

  async function submit() {
    setBusy(true); setError(null);
    const res = await submitFeedback({ formId: form.id, answers });
    setBusy(false);
    if (!res.success) { setError(res.error); return; }
    setDone(true); router.refresh();
  }

  if (done || form.submitted) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-xl mx-auto">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-8 text-center">
          <CheckCircle2 size={44} className="text-emerald-500 mx-auto" />
          <h1 className="text-base font-bold text-slate-900 dark:text-white mt-3">Thank you!</h1>
          <p className="text-[13px] text-slate-500 mt-1">Your anonymous feedback for &quot;{form.title}&quot; has been recorded.</p>
          <Link href="/student-portal/feedback" className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-700">Back to feedback</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-xl mx-auto">
      <Link href="/student-portal/feedback" className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-rose-600 mb-3"><ArrowLeft size={13} /> Feedback</Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-6">
        <h1 className="text-base font-bold text-slate-900 dark:text-white">{form.title}</h1>
        {(form.subjectName || form.staffName) && <p className="text-[12px] text-slate-500 mt-0.5">{[form.subjectName, form.staffName].filter(Boolean).join(" · ")}</p>}
        {form.description && <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2">{form.description}</p>}

        <div className="mt-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2 text-[12px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <ShieldCheck size={14} /> Your response is anonymous — it is never linked to your identity.
        </div>

        <div className="mt-5 space-y-5">
          {form.questions.map((q, i) => (
            <div key={q.id}>
              <p className="text-[13px] font-medium text-slate-800 dark:text-slate-200 mb-2"><span className="text-slate-400">{i + 1}.</span> {q.text}</p>
              {q.type === "rating" ? (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: RATING_SCALE }).map((_, idx) => {
                    const v = idx + 1;
                    const active = typeof answers[q.id] === "number" && (answers[q.id] as number) >= v;
                    return (
                      <button key={v} type="button" onClick={() => setRating(q.id, v)} className="p-0.5">
                        <Star size={26} className={active ? "text-amber-400 fill-amber-400" : "text-slate-300 dark:text-slate-600 hover:text-amber-300"} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea className="w-full px-3 py-2 text-[13px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none"
                  value={(answers[q.id] as string) ?? ""} onChange={(e) => setText(q.id, e.target.value)} placeholder="Your answer (optional)" />
              )}
            </div>
          ))}
        </div>

        {error && <p className="mt-4 text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

        <button onClick={submit} disabled={busy} className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-600 text-white text-[14px] font-semibold hover:bg-rose-700 disabled:opacity-50">
          <Send size={16} /> {busy ? "Submitting…" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}
