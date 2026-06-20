"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { getCurriculumUnits, getSyllabusCompletion, type CurriculumUnit, type SyllabusCompletion } from "@/actions/curriculum";
import { SyllabusCard } from "@/components/curriculum/SyllabusCard";
import { CompletionProgressBar } from "@/components/curriculum/CompletionProgressBar";
import { BookOpen, Loader2 } from "lucide-react";

type Subject      = { id: string; name: string; code: string | null; semester: number };
type AcademicYear = { id: string; label: string };

export default function StudentCurriculumPage() {
  const [institutionId, setInstitutionId] = useState("");
  const [,              setSemester]      = useState("");
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [ayId,          setAyId]          = useState("");
  const [selectedSub,   setSelectedSub]   = useState("");
  const [units,         setUnits]         = useState<CurriculumUnit[]>([]);
  const [completions,   setCompletions]   = useState<SyllabusCompletion[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data: student } = await supabase
        .from("students")
        .select("id, institution_id, department_id, student_year")
        .eq("profile_id", user.id)
        .single();
      if (!student) { setLoading(false); return; }
      setInstitutionId(student.institution_id);

      // Guess current semesters from student year (each year = 2 semesters)
      const year = student.student_year ?? 1;
      const sem1 = (year - 1) * 2 + 1;
      const sem2 = year * 2;
      const defaultSem = String(sem1);
      setSemester(defaultSem);

      const [{ data: subs }, { data: ay }] = await Promise.all([
        supabase
          .from("subjects")
          .select("id, name, code, semester")
          .eq("institution_id", student.institution_id)
          .eq("department_id", student.department_id)
          .in("semester", [sem1, sem2])
          .order("semester").order("name"),
        supabase
          .from("academic_years")
          .select("id, label")
          .eq("institution_id", student.institution_id)
          .order("label", { ascending: false }),
      ]);

      setSubjects((subs ?? []) as Subject[]);
      setAcademicYears(ay ?? []);
      if (ay?.[0]) setAyId(ay[0].id);
      if (subs?.[0]) setSelectedSub(subs[0].id);
      setLoading(false);
    });
  }, []);

  const loadUnits = useCallback(async () => {
    if (!institutionId || !selectedSub) return;
    setLoading(true);
    const [ur, cr] = await Promise.all([
      getCurriculumUnits(institutionId, selectedSub),
      getSyllabusCompletion(institutionId, selectedSub, ayId || undefined),
    ]);
    setUnits(ur.success ? ur.data : []);
    setCompletions(cr.success ? cr.data : []);
    setLoading(false);
  }, [institutionId, selectedSub, ayId]);

  useEffect(() => { if (institutionId) loadUnits(); }, [loadUnits, institutionId]);

  const completionMap = new Map(completions.map(c => [c.curriculum_unit_id, c]));
  const completedCount = units.filter(u => completionMap.get(u.id)?.is_completed).length;
  const totalHours     = units.reduce((s, u) => s + u.hours_allocated, 0);
  const completedHours = units.filter(u => completionMap.get(u.id)?.is_completed).reduce((s, u) => s + u.hours_allocated, 0);

  const currentSubject = subjects.find(s => s.id === selectedSub);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <BookOpen size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Syllabus</h1>
          <p className="text-xs text-slate-500">Subjects, units, topics, and teacher progress</p>
        </div>
      </div>

      {/* Subject selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <select value={selectedSub} onChange={e => setSelectedSub(e.target.value)}
          className="flex-1 min-w-[160px] px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white">
          <option value="">Select Subject...</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}{s.code ? ` (${s.code})` : ""} — Sem {s.semester}
            </option>
          ))}
        </select>
        <select value={ayId} onChange={e => setAyId(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white">
          <option value="">All Years</option>
          {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
        </select>
      </div>

      {selectedSub && currentSubject && units.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Teacher Progress — {currentSubject.name}
          </p>
          <CompletionProgressBar
            completed={completedCount}
            total={units.length}
            completedHours={completedHours}
            totalHours={totalHours}
          />
          {completedCount === units.length && units.length > 0 && (
            <p className="mt-2 text-xs text-emerald-600 font-semibold">✓ Syllabus fully completed</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
      ) : !selectedSub ? (
        <p className="text-slate-400 text-sm py-8 text-center">Select a subject to view its syllabus.</p>
      ) : units.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">
          No syllabus defined for this subject yet.
        </p>
      ) : (
        <div className="space-y-2">
          {units.map(u => (
            <SyllabusCard
              key={u.id}
              unit={u}
              completion={completionMap.get(u.id) ?? null}
              canComplete={false}
              canEdit={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
