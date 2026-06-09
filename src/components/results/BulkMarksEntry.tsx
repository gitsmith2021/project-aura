"use client";

import { useState, useCallback } from "react";
import { Save, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { bulkEnterResults, BulkResultInput, ExamResult } from "@/actions/examResults";
import { computeGrade } from "@/utils/grading";

type Student = { id: string; full_name: string; roll_number: string | null };

type Props = {
  institutionId: string;
  students: Student[];
  subjectName: string;
  subjectId: string | null;
  examScheduleId: string | null;
  maxMarks: number;
  passMarks: number;
  academicYearId: string | null;
  semester: number;
  existingResults: ExamResult[];
  onSaved: () => void;
};

const GRADE_COLORS: Record<string, string> = {
  O:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  "A+":"bg-teal-100 text-teal-700 border-teal-200",
  A:   "bg-blue-100 text-blue-700 border-blue-200",
  "B+":"bg-violet-100 text-violet-700 border-violet-200",
  B:   "bg-indigo-100 text-indigo-700 border-indigo-200",
  C:   "bg-amber-100 text-amber-700 border-amber-200",
  F:   "bg-rose-100 text-rose-700 border-rose-200",
};

export function BulkMarksEntry({
  institutionId, students, subjectName, subjectId, examScheduleId,
  maxMarks, passMarks, academicYearId, semester, existingResults, onSaved,
}: Props) {
  // Seed from existing results
  const seed: Record<string, string> = {};
  existingResults.forEach(r => { seed[r.student_id] = String(r.marks_scored); });

  const [marks, setMarks]   = useState<Record<string, string>>(seed);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  const handleChange = useCallback((studentId: string, val: string) => {
    setSaved(false);
    setError("");
    setMarks(prev => ({ ...prev, [studentId]: val }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    const rows: BulkResultInput["rows"] = [];
    for (const [studentId, raw] of Object.entries(marks)) {
      if (raw === "" || raw === undefined) continue;
      const n = parseFloat(raw);
      if (isNaN(n) || n < 0 || n > maxMarks) {
        setError(`Invalid marks for a student (must be 0–${maxMarks}).`);
        setSaving(false);
        return;
      }
      rows.push({ student_id: studentId, marks_scored: n });
    }

    const res = await bulkEnterResults({
      institution_id: institutionId,
      academic_year_id: academicYearId,
      semester,
      subject_name: subjectName,
      subject_id: subjectId,
      exam_schedule_id: examScheduleId,
      max_marks: maxMarks,
      pass_marks: passMarks,
      rows,
    });

    setSaving(false);
    if (res.success) {
      setSaved(true);
      onSaved();
    } else {
      setError(res.error ?? "Failed to save results.");
    }
  };

  const filledCount  = Object.values(marks).filter(v => v !== "").length;
  const passCount    = students.filter(s => {
    const v = marks[s.id];
    if (!v) return false;
    return parseFloat(v) >= passMarks;
  }).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Summary bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 rounded-xl text-xs font-semibold text-violet-700 dark:text-violet-300">
        <span>{students.length} students</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span>{filledCount} entered</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="text-emerald-600">{passCount} passing</span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="text-rose-600">{filledCount - passCount} failing</span>
        <span className="ml-auto text-slate-400 dark:text-slate-500 font-normal">
          Max {maxMarks} · Pass {passMarks}
        </span>
      </div>

      {/* Grid */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_6rem_5rem_5rem] gap-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">#</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Student</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Roll No</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-right">Marks</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Grade</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Status</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[420px] overflow-y-auto custom-scrollbar">
          {students.map((s, idx) => {
            const raw   = marks[s.id] ?? "";
            const num   = raw !== "" ? parseFloat(raw) : null;
            const grade = num !== null && !isNaN(num) ? computeGrade(num, maxMarks) : null;
            const pass  = num !== null && !isNaN(num) ? num >= passMarks : null;

            return (
              <div
                key={s.id}
                className="grid grid-cols-[2rem_1fr_1fr_6rem_5rem_5rem] gap-0 items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <span className="text-[10px] text-slate-400 font-medium">{idx + 1}</span>

                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                  {s.full_name}
                </span>

                <span className="text-[11px] text-slate-400 font-mono truncate pr-2">
                  {s.roll_number ?? "—"}
                </span>

                <div className="flex justify-end pr-2">
                  <input
                    type="number"
                    min={0}
                    max={maxMarks}
                    step={0.5}
                    value={raw}
                    onChange={e => handleChange(s.id, e.target.value)}
                    placeholder="—"
                    className="w-20 px-2 py-1 text-right text-sm font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors text-slate-900 dark:text-slate-100 placeholder:text-slate-300"
                  />
                </div>

                <div className="flex justify-center">
                  {grade ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${GRADE_COLORS[grade] ?? ""}`}>
                      {grade}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-[11px]">—</span>
                  )}
                </div>

                <div className="flex justify-center">
                  {pass === true  && <CheckCircle2 size={16} className="text-emerald-500" />}
                  {pass === false && <XCircle      size={16} className="text-rose-500" />}
                  {pass === null  && <span className="text-slate-300 text-[11px]">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-lg text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 size={14} /> Saved successfully
          </span>
        )}
        {!saved && <span />}

        <button
          onClick={handleSave}
          disabled={saving || filledCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          {saving
            ? <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
            : <Save size={14} />
          }
          {saving ? "Saving…" : `Save ${filledCount > 0 ? `(${filledCount})` : "Marks"}`}
        </button>
      </div>
    </div>
  );
}
