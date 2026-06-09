"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { bulkSaveCIAMarks, type CIAComponent } from "@/actions/cia";
import { Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type Student = { id: string; full_name: string; roll_number: string | null };
type MarksRow = { student_id: string; marks_scored: string; original: number | null; dirty: boolean };

interface Props {
  component: CIAComponent;
  institutionId: string;
  departmentId: string;
}

export function CIAMarksGrid({ component, institutionId, departmentId }: Props) {
  const [students, setStudents]   = useState<Student[]>([]);
  const [rows, setRows]           = useState<MarksRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const supabase = createClient();

      const [{ data: studs }, { data: marks }] = await Promise.all([
        supabase.from("students").select("id, full_name, roll_number")
          .eq("institution_id", institutionId)
          .eq("department_id", departmentId)
          .order("full_name"),
        supabase.from("cia_marks").select("student_id, marks_scored")
          .eq("cia_component_id", component.id),
      ]);

      const marksMap = new Map((marks ?? []).map(m => [m.student_id, m.marks_scored]));
      const studList = studs ?? [];
      setStudents(studList);
      setRows(studList.map(s => ({
        student_id:   s.id,
        marks_scored: marksMap.has(s.id) ? String(marksMap.get(s.id)) : "",
        original:     marksMap.get(s.id) ?? null,
        dirty:        false,
      })));
      setLoading(false);
    };
    load();
  }, [component.id, institutionId, departmentId]);

  const handleChange = useCallback((studentId: string, value: string) => {
    setRows(prev => prev.map(r =>
      r.student_id === studentId
        ? { ...r, marks_scored: value, dirty: true }
        : r
    ));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const validRows = rows
      .filter(r => r.dirty && r.marks_scored !== "")
      .map(r => ({ student_id: r.student_id, marks_scored: parseFloat(r.marks_scored) }))
      .filter(r => !isNaN(r.marks_scored) && r.marks_scored >= 0 && r.marks_scored <= component.max_marks);

    if (!validRows.length) {
      setSaving(false);
      setError("No valid changes to save.");
      return;
    }

    const res = await bulkSaveCIAMarks({
      institution_id:   institutionId,
      cia_component_id: component.id,
      subject_id:       component.subject_id,
      rows:             validRows,
    });

    setSaving(false);
    if (!res.success) {
      setError(res.error);
    } else {
      setSaved(true);
      setRows(prev => prev.map(r => ({ ...r, dirty: false, original: r.marks_scored ? parseFloat(r.marks_scored) : r.original })));
    }
  };

  const dirtyCount = rows.filter(r => r.dirty && r.marks_scored !== "").length;
  const invalidCount = rows.filter(r => {
    if (!r.dirty || r.marks_scored === "") return false;
    const v = parseFloat(r.marks_scored);
    return isNaN(v) || v < 0 || v > component.max_marks;
  }).length;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={22} className="animate-spin text-violet-500" />
    </div>
  );

  return (
    <div className="flex flex-col gap-3">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{students.length} students</span>
          {dirtyCount > 0 && <span className="text-violet-600">· {dirtyCount} unsaved</span>}
          {invalidCount > 0 && (
            <span className="text-rose-500 flex items-center gap-1">
              <AlertCircle size={12} /> {invalidCount} invalid (max {component.max_marks})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
          {error && <span className="text-xs text-rose-500">{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0 || invalidCount > 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save Marks
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 text-slate-500 font-semibold w-12">#</th>
              <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">Student</th>
              <th className="text-left px-4 py-2.5 text-slate-500 font-semibold">Roll No.</th>
              <th className="text-right px-4 py-2.5 text-slate-500 font-semibold w-36">
                Marks <span className="text-slate-400 font-normal">/ {component.max_marks}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 text-slate-400">
                  No students found in this department.
                </td>
              </tr>
            ) : students.map((s, i) => {
              const row = rows.find(r => r.student_id === s.id);
              const val = row?.marks_scored ?? "";
              const num = parseFloat(val);
              const isInvalid = row?.dirty && val !== "" && (isNaN(num) || num < 0 || num > component.max_marks);
              return (
                <tr key={s.id} className={`border-b border-slate-100 last:border-0 ${row?.dirty ? "bg-violet-50/40" : ""}`}>
                  <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{s.full_name}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono">{s.roll_number ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={component.max_marks}
                      step="0.5"
                      value={val}
                      onChange={e => handleChange(s.id, e.target.value)}
                      placeholder="—"
                      className={`w-24 px-2.5 py-1 text-right rounded-lg border text-xs font-semibold focus:outline-none focus:ring-2 transition-colors ${
                        isInvalid
                          ? "border-rose-300 bg-rose-50 text-rose-700 focus:ring-rose-300"
                          : row?.dirty
                          ? "border-violet-300 bg-white text-slate-800 focus:ring-violet-300"
                          : "border-slate-200 bg-white text-slate-700 focus:ring-violet-200"
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
