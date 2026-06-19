"use client";

import Link from "next/link";
import { ArrowLeft, BarChart3, AlertTriangle, Trophy } from "lucide-react";
import type { ResultRow } from "@/actions/onlineExams";
import { percentage } from "@/lib/onlineExams";

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress", submitted: "Submitted", auto_submitted: "Auto-submitted",
};

export function ExamResultsView({ institutionId, examTitle, rows }: {
  institutionId: string; examTitle: string; rows: ResultRow[];
}) {
  const submitted = rows.filter((r) => r.status !== "in_progress");
  const avg = submitted.length
    ? Math.round((submitted.reduce((s, r) => s + percentage(r.score ?? 0, r.totalMarks), 0) / submitted.length) * 10) / 10
    : 0;
  const flagged = rows.filter((r) => r.flagged).length;

  return (
    <div className="w-full p-6 space-y-6">
      <div>
        <Link href={`/institutions/${institutionId}/online-exams`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-violet-600 mb-2"><ArrowLeft size={13} /> All exams</Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 size={22} className="text-violet-600" /> Results — {examTitle}</h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Submissions</p><p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{submitted.length}</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Average score</p><p className="text-2xl font-bold text-violet-600 mt-1">{avg}%</p></div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"><p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1">Flagged</p><p className={`text-2xl font-bold mt-1 ${flagged ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>{flagged}</p></div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No attempts yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Student</th>
              <th className="px-4 py-2.5 font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">%</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Violations</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.sessionId} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="px-4 py-2.5 text-slate-400">{i + 1}{i === 0 && r.status !== "in_progress" && <Trophy size={12} className="inline ml-1 text-amber-500" />}</td>
                  <td className="px-4 py-2.5"><span className="font-medium text-slate-800 dark:text-slate-200">{r.studentName}</span>{r.rollNo && <span className="text-[11px] text-slate-400 ml-1">{r.rollNo}</span>}</td>
                  <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{r.status === "in_progress" ? "—" : `${r.score ?? 0} / ${r.totalMarks}`}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{r.status === "in_progress" ? "—" : `${percentage(r.score ?? 0, r.totalMarks)}%`}</td>
                  <td className="px-4 py-2.5 text-slate-500">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="px-4 py-2.5">{r.violationCount > 0 ? <span className={`inline-flex items-center gap-1 text-[12px] ${r.flagged ? "text-rose-600 font-semibold" : "text-amber-600"}`}><AlertTriangle size={12} /> {r.violationCount}{r.flagged ? " · flagged" : ""}</span> : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
