"use client";

import { Printer, TrendingUp, AlertTriangle } from "lucide-react";
import { ExamResult } from "@/actions/examResults";
import { computeCGPA, gradePoint } from "@/utils/grading";

type Props = {
  results: ExamResult[];
  studentName: string;
  rollNumber?: string | null;
  department?: string | null;
  program?: string | null;
  institutionName?: string | null;
};

const GRADE_COLORS: Record<string, string> = {
  O:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  "A+": "bg-teal-50 text-teal-700 border-teal-200",
  A:    "bg-blue-50 text-blue-700 border-blue-200",
  "B+": "bg-violet-50 text-violet-700 border-violet-200",
  B:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  C:    "bg-amber-50 text-amber-700 border-amber-200",
  F:    "bg-rose-50 text-rose-700 border-rose-200",
};

export function MarksheetCard({ results, studentName, rollNumber, department, program, institutionName }: Props) {
  if (results.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
        <TrendingUp size={32} className="mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-500">No results recorded yet</p>
        <p className="text-xs text-slate-400 mt-1">Results will appear here once marks are entered.</p>
      </div>
    );
  }

  // Group by semester
  const bySemester: Record<number, ExamResult[]> = {};
  results.forEach(r => {
    if (!bySemester[r.semester]) bySemester[r.semester] = [];
    bySemester[r.semester].push(r);
  });

  const cgpa      = computeCGPA(results);
  const arrearCount = results.filter(r => r.is_arrear).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {studentName}
            </h2>
            {rollNumber && (
              <p className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Roll: {rollNumber}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {department && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded-full border border-slate-200 dark:border-slate-600">
                  {department}
                </span>
              )}
              {program && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded-full border border-slate-200 dark:border-slate-600">
                  {program}
                </span>
              )}
              {institutionName && (
                <span className="px-2 py-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-semibold rounded-full border border-violet-200 dark:border-violet-800/40">
                  {institutionName}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* CGPA pill */}
            <div className="text-center">
              <div className={`text-2xl font-black leading-none ${cgpa >= 7 ? "text-emerald-600" : cgpa >= 5 ? "text-amber-600" : "text-rose-600"}`}>
                {cgpa.toFixed(2)}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">CGPA</div>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors print:hidden"
            >
              <Printer size={13} />
              Print
            </button>
          </div>
        </div>

        {arrearCount > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg">
            <AlertTriangle size={13} className="text-rose-500 shrink-0" />
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
              {arrearCount} arrear subject{arrearCount !== 1 ? "s" : ""} — clearance required
            </span>
          </div>
        )}
      </div>

      {/* Per-semester tables */}
      {Object.keys(bySemester)
        .map(Number)
        .sort((a, b) => a - b)
        .map(sem => {
          const semResults = bySemester[sem];
          const semCGPA    = computeCGPA(semResults);
          const semArrears = semResults.filter(r => r.is_arrear).length;
          const ayLabel    = semResults[0]?.academic_years?.label ?? null;

          return (
            <div key={sem} className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              {/* Semester header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                    Semester {sem}
                  </span>
                  {ayLabel && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {ayLabel}
                    </span>
                  )}
                  {semArrears > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-[9px] font-bold rounded-full border border-rose-200 dark:border-rose-800/40">
                      {semArrears} arrear
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                  GPA:
                  <span className={semCGPA >= 7 ? "text-emerald-600" : semCGPA >= 5 ? "text-amber-600" : "text-rose-600"}>
                    {semCGPA.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Subject rows */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/60">
                    <th className="text-left px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Subject</th>
                    <th className="text-right px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Marks</th>
                    <th className="text-center px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Max</th>
                    <th className="text-center px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grade</th>
                    <th className="text-center px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">GP</th>
                    <th className="text-center px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                  {semResults.map(r => (
                    <tr key={r.id} className={r.is_arrear ? "bg-rose-50/50 dark:bg-rose-950/10" : ""}>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {r.subject_name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                        {r.marks_scored}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-400 dark:text-slate-500">
                        {r.max_marks}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${GRADE_COLORS[r.grade] ?? ""}`}>
                          {r.grade}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold text-slate-500 dark:text-slate-400">
                        {gradePoint(r.grade)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.is_arrear
                          ? <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Arrear</span>
                          : <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Pass</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
    </div>
  );
}
