"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getStudentMarksheet, ExamResult } from "@/actions/examResults";
import { computeCGPA, gradePoint } from "@/utils/grading";
import { Award, TrendingUp, AlertTriangle } from "lucide-react";

const GRADE_COLORS: Record<string, string> = {
  O:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  "A+": "bg-teal-100 text-teal-700 border-teal-200",
  A:    "bg-blue-100 text-blue-700 border-blue-200",
  "B+": "bg-violet-100 text-violet-700 border-violet-200",
  B:    "bg-indigo-100 text-indigo-700 border-indigo-200",
  C:    "bg-amber-100 text-amber-700 border-amber-200",
  F:    "bg-rose-100 text-rose-700 border-rose-200",
};

export default function StudentResultsPage() {
  const [results,  setResults]  = useState<ExamResult[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [instId,   setInstId]   = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const { data: student } = await supabase
        .from("students")
        .select("id, institution_id")
        .eq("profile_id", user.id)
        .single();

      if (!student) { setLoading(false); return; }
      setInstId(student.institution_id);

      const res = await getStudentMarksheet(student.id, student.institution_id);
      if (res.success) setResults(res.data);
      setLoading(false);
    });
  }, []);

  // Group by semester
  const bySemester: Record<number, ExamResult[]> = {};
  results.forEach(r => {
    if (!bySemester[r.semester]) bySemester[r.semester] = [];
    bySemester[r.semester].push(r);
  });

  const cgpa         = computeCGPA(results);
  const arrearCount  = results.filter(r => r.is_arrear).length;
  const passCount    = results.filter(r => !r.is_arrear).length;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
          <Award size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">My Results</h1>
          <p className="text-xs text-slate-500">Academic performance & marksheet</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-violet-600" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <Award size={32} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-500">No results yet</p>
          <p className="text-xs text-slate-400 mt-1">Your results will appear here once marks are entered by the office.</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
              <div className={`text-2xl font-black ${cgpa >= 7 ? "text-emerald-600" : cgpa >= 5 ? "text-amber-600" : "text-rose-600"}`}>
                {cgpa.toFixed(2)}
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">CGPA</div>
            </div>
            <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-600">{passCount}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Passed</div>
            </div>
            <div className={`border rounded-xl p-3 text-center ${arrearCount > 0 ? "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50" : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"}`}>
              <div className={`text-2xl font-black ${arrearCount > 0 ? "text-rose-600" : "text-slate-400"}`}>{arrearCount}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Arrears</div>
            </div>
          </div>

          {/* Arrear warning */}
          {arrearCount > 0 && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl">
              <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                You have <strong>{arrearCount} arrear subject{arrearCount !== 1 ? "s" : ""}</strong>. Contact your department office to register for supplementary / re-exam.
              </p>
            </div>
          )}

          {/* Per-semester */}
          {Object.keys(bySemester)
            .map(Number)
            .sort((a, b) => a - b)
            .map(sem => {
              const semResults  = bySemester[sem];
              const semCGPA     = computeCGPA(semResults);
              const semArrears  = semResults.filter(r => r.is_arrear).length;

              return (
                <div key={sem} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  {/* Semester header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                        Semester {sem}
                      </span>
                      {semArrears > 0 && (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-[9px] font-bold rounded-full border border-rose-200 dark:border-rose-800/40">
                          {semArrears} arrear
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                      <TrendingUp size={11} className="text-slate-400" />
                      <span className={semCGPA >= 7 ? "text-emerald-600" : semCGPA >= 5 ? "text-amber-600" : "text-rose-600"}>
                        {semCGPA.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Subject list */}
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/40">
                    {semResults.map(r => (
                      <div
                        key={r.id}
                        className={`flex items-center px-4 py-3 gap-3 ${r.is_arrear ? "bg-rose-50/40 dark:bg-rose-950/10" : ""}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{r.subject_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {r.marks_scored}/{r.max_marks} marks · Pass: {r.pass_marks}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${GRADE_COLORS[r.grade] ?? ""}`}>
                            {r.grade}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">{gradePoint(r.grade)} GP</span>
                          {r.is_arrear
                            ? <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Arrear</span>
                            : <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Pass</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
