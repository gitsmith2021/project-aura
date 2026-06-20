"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BulkMarksEntry } from "@/components/results/BulkMarksEntry";
import { createClient } from "@/utils/supabase/client";
import { getResultsByInstitution, ExamResult } from "@/actions/examResults";
import { Award, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

type Department   = { id: string; name: string };
type AcademicYear = { id: string; label: string };
type Subject      = { id: string; name: string; credits: number; hours_per_week: number };
type Student      = { id: string; full_name: string; roll_number: string | null };

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [departments, setDepartments]   = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects]         = useState<Subject[]>([]);
  const [students, setStudents]         = useState<Student[]>([]);
  const [existingResults, setExistingResults] = useState<ExamResult[]>([]);
  const [institutionName, setInstitutionName] = useState("");

  // Filters
  const [deptId,     setDeptId]     = useState("");
  const [ayId,       setAyId]       = useState("");
  const [semester,   setSemester]   = useState("");
  const [subjectId,  setSubjectId]  = useState("");
  const [maxMarks,   setMaxMarks]   = useState(100);
  const [passMarks,  setPassMarks]  = useState(50);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsLoaded,  setStudentsLoaded]  = useState(false);

  // Load institution meta
  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("institutions").select("name").eq("id", institutionId).single(),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id, label").eq("institution_id", institutionId).order("label", { ascending: false }),
    ]).then(([inst, depts, years]) => {
      if (inst.data)  setInstitutionName(inst.data.name);
      if (depts.data) setDepartments(depts.data);
      if (years.data) { setAcademicYears(years.data); if (years.data[0]) setAyId(years.data[0].id); }
    });
  }, [institutionId]);

  // Load subjects when dept + semester change
  useEffect(() => {
    if (!deptId || !semester) { setSubjects([]); setSubjectId(""); return; }
    const supabase = createClient();
    supabase
      .from("subjects")
      .select("id, name, credits, hours_per_week")
      .eq("institution_id", institutionId)
      .eq("department_id", deptId)
      .eq("semester", Number(semester))
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setSubjects(data ?? []);
        setSubjectId("");
      });
  }, [deptId, semester, institutionId]);

  const loadStudents = useCallback(async () => {
    if (!deptId || !semester || !subjectId) return;
    setLoadingStudents(true);
    setStudentsLoaded(false);

    const supabase = createClient();
    const semNum   = Number(semester);
    const yearNum  = Math.ceil(semNum / 2);

    const [{ data: studs }, res] = await Promise.all([
      supabase
        .from("students")
        .select("id, full_name, roll_number")
        .eq("institution_id", institutionId)
        .eq("department_id", deptId)
        .eq("year", yearNum)
        .order("roll_number", { ascending: true, nullsFirst: false }),
      getResultsByInstitution(institutionId, {
        departmentId: deptId,
        semester: semNum,
        subjectName: subjects.find(s => s.id === subjectId)?.name,
      }),
    ]);

    setStudents((studs ?? []) as Student[]);
    setExistingResults(res.success ? res.data : []);
    setLoadingStudents(false);
    setStudentsLoaded(true);
  }, [deptId, semester, subjectId, subjects, institutionId]);

  // Auto-fill max/pass marks from selected subject's preset (or use manual values)
  const selectedSubject = subjects.find(s => s.id === subjectId);

  const breadcrumb = (
    <>
      <span className="text-slate-400">Institutions</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-400">{institutionName}</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Results</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/50 flex items-center justify-center shrink-0">
              <Award size={19} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Results & Marksheets</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter marks and view student marksheets</p>
            </div>
          </div>

          <Link
            href={`/institutions/${institutionId}/results/arrears`}
            className="flex items-center gap-2 px-3 py-2 border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl transition-colors"
          >
            <AlertTriangle size={14} />
            View Arrears
            <ChevronRight size={12} />
          </Link>
        </div>

        {/* Filter bar */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Select Entry Context</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Department</label>
              <select
                value={deptId}
                onChange={e => { setDeptId(e.target.value); setStudentsLoaded(false); }}
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200"
              >
                <option value="">Select…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Semester</label>
              <select
                value={semester}
                onChange={e => { setSemester(e.target.value); setStudentsLoaded(false); }}
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200"
              >
                <option value="">Select…</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Academic Year</label>
              <select
                value={ayId}
                onChange={e => setAyId(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200"
              >
                <option value="">General</option>
                {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Subject</label>
              <select
                value={subjectId}
                onChange={e => { setSubjectId(e.target.value); setStudentsLoaded(false); }}
                disabled={subjects.length === 0}
                className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200 disabled:opacity-50"
              >
                <option value="">{subjects.length === 0 ? "Select dept & sem first" : "Select…"}</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Marks config + Load button */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Max Marks</label>
              <input
                type="number" min={1} max={1000} value={maxMarks}
                onChange={e => setMaxMarks(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pass Marks</label>
              <input
                type="number" min={0} max={maxMarks} value={passMarks}
                onChange={e => setPassMarks(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 dark:text-slate-200"
              />
            </div>

            <button
              onClick={loadStudents}
              disabled={!deptId || !semester || !subjectId || loadingStudents}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-sm transition-colors ml-auto"
            >
              {loadingStudents && <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />}
              {loadingStudents ? "Loading…" : "Load Students"}
            </button>
          </div>
        </div>

        {/* Entry grid */}
        {studentsLoaded && students.length > 0 && selectedSubject && (
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedSubject.name}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Semester {semester} · {departments.find(d => d.id === deptId)?.name}
                  {ayId && academicYears.find(ay => ay.id === ayId) && (
                    <> · {academicYears.find(ay => ay.id === ayId)!.label}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {students.map(s => (
                  <Link
                    key={s.id}
                    href={`/institutions/${institutionId}/results/${s.id}`}
                    className="hidden"
                  />
                ))}
              </div>
            </div>

            <BulkMarksEntry
              institutionId={institutionId}
              students={students}
              subjectName={selectedSubject.name}
              subjectId={subjectId}
              examScheduleId={null}
              maxMarks={maxMarks}
              passMarks={passMarks}
              academicYearId={ayId || null}
              semester={Number(semester)}
              existingResults={existingResults}
              onSaved={loadStudents}
            />
          </div>
        )}

        {studentsLoaded && students.length === 0 && (
          <div className="py-16 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/30">
            <p className="text-sm font-semibold text-slate-500">No students found</p>
            <p className="text-xs text-slate-400 mt-1">
              No year-{semester ? Math.ceil(Number(semester) / 2) : "?"} students in the selected department.
            </p>
          </div>
        )}

        {!studentsLoaded && (
          <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/30">
            <Award size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">Select filters above to begin</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Choose a department, semester, and subject, then click &#34;Load Students&#34;.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
