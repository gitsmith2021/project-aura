"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, ShieldAlert, CheckCircle2, Send, Maximize } from "lucide-react";
import { submitExam, logViolation, type PlayerQuestion } from "@/actions/onlineExams";
import { formatClock, VIOLATION_LIMIT } from "@/lib/onlineExams";

type Phase = "taking" | "submitting" | "done";
type ViolationType = "tab_switch" | "fullscreen_exit" | "copy_paste";

export function ExamPlayer({ examId, sessionId, title, questions, initialRemaining }: {
  examId: string; sessionId: string; title: string; questions: PlayerQuestion[]; initialRemaining: number;
}) {
  const [idx, setIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string[]>>({});
  const [secondsLeft, setSecondsLeft] = useState(initialRemaining);
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [showReenter, setShowReenter] = useState(false);
  const [phase, setPhase] = useState<Phase>("taking");
  const [result, setResult] = useState<{ score: number; totalMarks: number } | null>(null);

  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  const doSubmit = useCallback(async (auto: boolean) => {
    if (phaseRef.current !== "taking") return;
    setPhase("submitting");
    const res = await submitExam({ sessionId, responses: responsesRef.current, autoSubmitted: auto });
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (res.success) { setResult(res.data); setPhase("done"); }
    else { setPhase("taking"); setWarning(res.error); }
  }, [sessionId]);

  const handleViolation = useCallback(async (type: ViolationType, message: string) => {
    if (phaseRef.current !== "taking") return;
    setWarning(message);
    const res = await logViolation({ sessionId, type });
    if (res.success) {
      setViolations(res.data.count);
      if (res.data.limitReached) {
        setWarning(`Too many violations (${res.data.count}). Your exam has been submitted automatically.`);
        doSubmit(true);
      }
    }
  }, [sessionId, doSubmit]);

  // Countdown
  useEffect(() => {
    if (phase !== "taking") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(t); doSubmit(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, doSubmit]);

  // Anti-cheating listeners
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) handleViolation("tab_switch", "Tab switching is not allowed during the exam."); };
    const onFullscreen = () => {
      if (!document.fullscreenElement && phaseRef.current === "taking") {
        setShowReenter(true);
        handleViolation("fullscreen_exit", "You exited full-screen mode.");
      }
    };
    const onCopy = (e: Event) => { e.preventDefault(); handleViolation("copy_paste", "Copy / paste is disabled during the exam."); };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onCopy);
    document.addEventListener("contextmenu", (e) => e.preventDefault());
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onCopy);
    };
  }, [handleViolation]);

  // auto-dismiss the transient warning banner
  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => setWarning(null), 4000);
    return () => clearTimeout(t);
  }, [warning]);

  function setMcq(qid: string, key: string) { setResponses((p) => ({ ...p, [qid]: [key] })); }
  function toggleMulti(qid: string, key: string) {
    setResponses((p) => { const cur = p[qid] ?? []; return { ...p, [qid]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] }; });
  }
  function setShort(qid: string, text: string) { setResponses((p) => ({ ...p, [qid]: text ? [text] : [] })); }

  const answeredCount = questions.filter((q) => (responses[q.id]?.length ?? 0) > 0).length;

  if (phase === "done" && result) {
    const pct = result.totalMarks > 0 ? Math.round((result.score / result.totalMarks) * 1000) / 10 : 0;
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-4">Exam submitted</h1>
          <p className="text-[13px] text-slate-500 mt-1">{title}</p>
          <div className="mt-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5">
            <p className="text-3xl font-bold text-violet-600">{result.score}<span className="text-lg text-slate-400"> / {result.totalMarks}</span></p>
            <p className="text-[13px] text-slate-500 mt-1">{pct}%</p>
          </div>
          <div className="mt-6 flex gap-2">
            <Link href={`/student-portal/exams/online/${examId}/review`} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-medium hover:bg-violet-700">Review answers</Link>
            <Link href="/student-portal/exams/online" className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[13px] font-medium hover:bg-slate-50 dark:hover:bg-slate-800">Done</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const lowTime = secondsLeft <= 60;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 select-none">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-slate-900 dark:text-white truncate">{title}</p>
          <p className="text-[11px] text-slate-400">{answeredCount}/{questions.length} answered</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {violations > 0 && <span className="inline-flex items-center gap-1 text-[12px] text-amber-600"><AlertTriangle size={13} /> {violations}/{VIOLATION_LIMIT}</span>}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-[14px] ${lowTime ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 animate-pulse" : "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"}`}><Clock size={14} /> {formatClock(secondsLeft)}</span>
        </div>
      </header>

      {warning && (
        <div className="bg-amber-500 text-white text-[13px] font-medium px-4 py-2 flex items-center gap-2 justify-center"><ShieldAlert size={15} /> {warning}</div>
      )}

      <div className="max-w-5xl mx-auto p-4 grid lg:grid-cols-[1fr_220px] gap-4">
        {/* Question */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide">Question {idx + 1} of {questions.length}</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-[15px] font-medium text-slate-900 dark:text-white leading-relaxed">{q.questionText}</p>

          <div className="mt-5 space-y-2">
            {q.questionType === "short" ? (
              <input className="w-full px-3 py-2.5 text-[14px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                value={responses[q.id]?.[0] ?? ""} onChange={(e) => setShort(q.id, e.target.value)} placeholder="Type your answer" />
            ) : (
              q.options.map((o) => {
                const selected = (responses[q.id] ?? []).includes(o.key);
                return (
                  <button key={o.key} type="button"
                    onClick={() => (q.questionType === "mcq" ? setMcq(q.id, o.key) : toggleMulti(q.id, o.key))}
                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-colors ${selected ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    <span className={`w-5 h-5 ${q.questionType === "mcq" ? "rounded-full" : "rounded"} border flex items-center justify-center text-[10px] font-bold shrink-0 ${selected ? "bg-violet-600 border-violet-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-400"}`}>{o.key.toUpperCase()}</span>
                    <span className="text-[14px] text-slate-800 dark:text-slate-200">{o.text}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="inline-flex items-center gap-1 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
            {idx < questions.length - 1
              ? <button onClick={() => setIdx((i) => Math.min(questions.length - 1, i + 1))} className="inline-flex items-center gap-1 px-3 py-2 text-[13px] font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700">Next <ChevronRight size={15} /></button>
              : <button onClick={() => doSubmit(false)} disabled={phase === "submitting"} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"><Send size={15} /> {phase === "submitting" ? "Submitting…" : "Submit exam"}</button>}
          </div>
        </div>

        {/* Palette */}
        <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 h-fit">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((qq, i) => {
              const answered = (responses[qq.id]?.length ?? 0) > 0;
              return (
                <button key={qq.id} onClick={() => setIdx(i)}
                  className={`aspect-square rounded-md text-[12px] font-semibold flex items-center justify-center border ${i === idx ? "ring-2 ring-violet-500 " : ""}${answered ? "bg-violet-600 text-white border-violet-600" : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}>{i + 1}</button>
              );
            })}
          </div>
          <button onClick={() => doSubmit(false)} disabled={phase === "submitting"} className="w-full mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"><Send size={14} /> Submit</button>
        </aside>
      </div>

      {/* Re-enter fullscreen modal */}
      {showReenter && phase === "taking" && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-800">
            <ShieldAlert size={36} className="text-amber-500 mx-auto" />
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white mt-3">Return to full-screen</h2>
            <p className="text-[13px] text-slate-500 mt-1">Leaving full-screen is recorded as a violation. {violations}/{VIOLATION_LIMIT} used. Re-enter to continue.</p>
            <button onClick={() => { document.documentElement.requestFullscreen?.().catch(() => {}); setShowReenter(false); }} className="mt-5 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-[13px] font-medium hover:bg-violet-700"><Maximize size={15} /> Re-enter full-screen</button>
          </div>
        </div>
      )}
    </div>
  );
}
