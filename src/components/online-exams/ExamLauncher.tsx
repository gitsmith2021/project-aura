"use client";

import { useState } from "react";
import Link from "next/link";
import { MonitorCheck, Clock, ListChecks, ShieldAlert, ArrowLeft, Play } from "lucide-react";
import { startExam, type StartExamData } from "@/actions/onlineExams";
import { ExamPlayer } from "@/components/online-exams/ExamPlayer";
import { formatDuration } from "@/lib/onlineExams";

export function ExamLauncher({ examId, title, durationMinutes, questionCount }: {
  examId: string; title: string; durationMinutes: number; questionCount: number;
}) {
  const [data, setData] = useState<StartExamData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setBusy(true); setError(null);
    const res = await startExam(examId);
    if (!res.success) { setBusy(false); setError(res.error); return; }
    // Enter full-screen within this user gesture before mounting the player.
    document.documentElement.requestFullscreen?.().catch(() => {});
    setData(res.data);
  }

  if (data) {
    return <ExamPlayer examId={examId} sessionId={data.sessionId} title={data.title} questions={data.questions} initialRemaining={data.remainingSeconds} />;
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-xl mx-auto">
      <Link href="/student-portal/exams/online" className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-3"><ArrowLeft size={13} /> Online exams</Link>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0"><MonitorCheck size={20} className="text-violet-600" /></div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">{title}</h1>
            <p className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
              <span className="inline-flex items-center gap-1"><Clock size={12} /> {formatDuration(durationMinutes)}</span>
              <span className="inline-flex items-center gap-1"><ListChecks size={12} /> {questionCount} questions</span>
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-4">
          <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-2"><ShieldAlert size={15} /> Exam rules</p>
          <ul className="text-[12px] text-amber-700 dark:text-amber-300/90 space-y-1 list-disc list-inside">
            <li>The exam runs in full-screen. Leaving full-screen is recorded.</li>
            <li>Switching tabs or windows is recorded as a violation.</li>
            <li>Copy &amp; paste is disabled.</li>
            <li>After <strong>3 violations</strong> the exam auto-submits and is flagged.</li>
            <li>The timer cannot be paused. On timeout your answers are submitted automatically.</li>
          </ul>
        </div>

        {error && <p className="mt-4 text-[12px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 rounded-lg">{error}</p>}

        <button onClick={begin} disabled={busy} className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 text-white text-[14px] font-semibold hover:bg-violet-700 disabled:opacity-50">
          <Play size={16} /> {busy ? "Starting…" : "Start exam"}
        </button>
      </div>
    </div>
  );
}
