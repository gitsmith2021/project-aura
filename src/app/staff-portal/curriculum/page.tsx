"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getCurriculumUnits, getMyCompletionForSubject, markUnitComplete,
  type CurriculumUnit,
} from "@/actions/curriculum";
import { SyllabusCard } from "@/components/curriculum/SyllabusCard";
import { CompletionProgressBar } from "@/components/curriculum/CompletionProgressBar";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";

type Subject      = { id: string; name: string; code: string | null; semester: number };
type AcademicYear = { id: string; label: string };

export default function StaffCurriculumPage() {
  const [staffId,       setStaffId]       = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [ayId,          setAyId]          = useState("");
  const [selectedSub,   setSelectedSub]   = useState("");
  const [units,         setUnits]         = useState<CurriculumUnit[]>([]);
  const [completionMap, setCompletionMap] = useState<Record<string, boolean>>({});
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const { data: staffRow } = await supabase
        .from("staff")
        .select("id, institution_id, department_id")
        .eq("profile_id", user.id)
        .single();

      if (!staffRow) { setLoading(false); return; }
      setStaffId(staffRow.id);
      setInstitutionId(staffRow.institution_id);

      const [{ data: subs }, { data: ay }] = await Promise.all([
        supabase
          .from("teaching_assignments")
          .select("subject_id, subjects(id, name, code, semester)")
          .eq("staff_id", staffRow.id)
          .eq("institution_id", staffRow.institution_id),
        supabase
          .from("academic_years")
          .select("id, label")
          .eq("institution_id", staffRow.institution_id)
          .order("label", { ascending: false }),
      ]);

      const subjectList: Subject[] = (subs ?? [])
        .map(r => r.subjects as unknown as Subject | null)
        .filter((s): s is Subject => s !== null);

      setSubjects(subjectList);
      setAcademicYears(ay ?? []);
      if (ay?.[0]) setAyId(ay[0].id);
      if (subjectList[0]) setSelectedSub(subjectList[0].id);
      setLoading(false);
    });
  }, []);

  const loadUnits = useCallback(async () => {
    if (!staffId || !institutionId || !selectedSub) return;
    setLoading(true);
    const [ur, cr] = await Promise.all([
      getCurriculumUnits(institutionId, selectedSub),
      getMyCompletionForSubject(staffId, institutionId, selectedSub, ayId || undefined),
    ]);
    setUnits(ur.success ? ur.data : []);
    setCompletionMap(cr.success ? cr.data : {});
    setLoading(false);
  }, [staffId, institutionId, selectedSub, ayId]);

  useEffect(() => { if (staffId) loadUnits(); }, [loadUnits, staffId]);

  const handleToggle = async (unitId: string, current: boolean) => {
    await markUnitComplete({
      curriculum_unit_id: unitId,
      staff_id:           staffId,
      institution_id:     institutionId,
      academic_year_id:   ayId || null,
      is_completed:       !current,
    });
    await loadUnits();
  };

  const completedCount = units.filter(u => completionMap[u.id]).length;
  const totalHours     = units.reduce((s, u) => s + u.hours_allocated, 0);
  const completedHours = units.filter(u => completionMap[u.id]).reduce((s, u) => s + u.hours_allocated, 0);

  const currentSubject = subjects.find(s => s.id === selectedSub);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <BookOpen size={18} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">My Curriculum</h1>
          <p className="text-xs text-slate-500">Mark syllabus units as completed for each subject</p>
        </div>
      </div>

      {/* Filters */}
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
          <p className="text-xs font-semibold text-slate-600 mb-2">{currentSubject.name} — Progress</p>
          <CompletionProgressBar
            completed={completedCount}
            total={units.length}
            completedHours={completedHours}
            totalHours={totalHours}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
      ) : !selectedSub ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
          <AlertCircle size={14} /> Select a subject to view its syllabus.
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-slate-400 text-sm py-8">
          No teaching assignments found. Contact admin to assign subjects to you.
        </div>
      ) : units.length === 0 ? (
        <div className="text-slate-400 text-sm py-8 text-center">
          No curriculum units defined for this subject yet.
        </div>
      ) : (
        <div className="space-y-2">
          {units.map(u => {
            const isCompleted = completionMap[u.id] ?? false;
            const fakeCompletion = isCompleted
              ? { id: "", curriculum_unit_id: u.id, staff_id: staffId, institution_id: institutionId, academic_year_id: ayId || null, completed_at: null, completion_notes: null, is_completed: true, updated_at: "" }
              : null;
            return (
              <SyllabusCard
                key={u.id}
                unit={u}
                completion={fakeCompletion}
                canComplete={true}
                canEdit={false}
                onToggleComplete={handleToggle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
