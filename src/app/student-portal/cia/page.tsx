"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getStudentCIAMarks } from "@/actions/cia";
import type { CIAComponent } from "@/actions/cia";
import { ClipboardList, Loader2, AlertCircle, Award } from "lucide-react";

type Entry = { component: CIAComponent; marks_scored: number | null };

const TYPE_LABELS: Record<string, string> = {
  unit_test:        "Unit Test",
  assignment:       "Assignment",
  lab_record:       "Lab Record",
  seminar:          "Seminar",
  attendance_marks: "Attendance Marks",
  viva:             "Viva",
  other:            "Other",
};

const TYPE_COLORS: Record<string, string> = {
  unit_test:        "bg-violet-100 text-violet-700",
  assignment:       "bg-blue-100 text-blue-700",
  lab_record:       "bg-emerald-100 text-emerald-700",
  seminar:          "bg-amber-100 text-amber-700",
  attendance_marks: "bg-slate-100 text-slate-600",
  viva:             "bg-rose-100 text-rose-700",
  other:            "bg-gray-100 text-gray-600",
};

function pctColor(pct: number) {
  if (pct >= 75) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-rose-600";
}

export default function StudentCIAPage() {
  const [entries,  setEntries]  = useState<Entry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data: student } = await supabase
        .from("students")
        .select("id, institution_id")
        .eq("profile_id", user.id)
        .single();
      if (!student) { setError("Student record not found."); setLoading(false); return; }
      const res = await getStudentCIAMarks(student.id, student.institution_id);
      if (!res.success) { setError(res.error); setLoading(false); return; }
      setEntries(res.data);
      setLoading(false);
    });
  }, []);

  // Group by semester
  const bySemester = entries.reduce<Record<number, Entry[]>>((acc, e) => {
    const sem = e.component.semester;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(e);
    return acc;
  }, {});
  const semesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);

  const overall = entries.length > 0 ? (() => {
    const withMarks = entries.filter(e => e.marks_scored !== null);
    const scored = withMarks.reduce((s, e) => s + (e.marks_scored ?? 0), 0);
    const max    = withMarks.reduce((s, e) => s + e.component.max_marks, 0);
    return max > 0 ? Math.round((scored / max) * 100) : null;
  })() : null;

  return (
    <div className="px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
          <ClipboardList size={18} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Internal Assessment (CIA)</h1>
          <p className="text-xs text-slate-500">Your continuous assessment marks</p>
        </div>
        {overall !== null && (
          <div className={`ml-auto text-right`}>
            <p className={`text-2xl font-extrabold ${pctColor(overall)}`}>{overall}%</p>
            <p className="text-[10px] text-slate-400">Overall</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
      ) : error ? (
        <div className="flex items-center gap-2 text-rose-600 text-sm py-8 bg-rose-50 border border-rose-200 rounded-xl px-4">
          <AlertCircle size={15} /> {error}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <Award size={32} className="opacity-25" />
          <p className="text-sm">No CIA records yet.</p>
        </div>
      ) : semesters.map(sem => {
        const semEntries = bySemester[sem];
        const withMarks  = semEntries.filter(e => e.marks_scored !== null);
        const scored     = withMarks.reduce((s, e) => s + (e.marks_scored ?? 0), 0);
        const max        = withMarks.reduce((s, e) => s + e.component.max_marks, 0);
        const pct        = max > 0 ? Math.round((scored / max) * 100) : null;

        return (
          <div key={sem} className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Semester {sem}</h2>
              {pct !== null && (
                <span className={`text-xs font-bold ${pctColor(pct)}`}>{pct}% overall</span>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {semEntries.map(e => {
                const pctEntry = e.marks_scored !== null
                  ? Math.round((e.marks_scored / e.component.max_marks) * 100)
                  : null;
                return (
                  <div key={e.component.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ${TYPE_COLORS[e.component.component_type]}`}>
                        {TYPE_LABELS[e.component.component_type] ?? e.component.component_type}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{e.component.name}</p>
                        {e.component.subjects && (
                          <p className="text-[11px] text-slate-400 truncate">
                            {e.component.subjects.name}
                            {e.component.subjects.code ? ` (${e.component.subjects.code})` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {e.marks_scored !== null ? (
                        <>
                          <p className="text-sm font-bold text-slate-800">
                            {e.marks_scored}
                            <span className="text-slate-400 font-normal text-xs"> / {e.component.max_marks}</span>
                          </p>
                          {pctEntry !== null && (
                            <p className={`text-[11px] font-semibold ${pctColor(pctEntry)}`}>{pctEntry}%</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Pending</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
