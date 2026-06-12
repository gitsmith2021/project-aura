"use client";

import { use, useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { getCurriculumOverview, type SubjectWithProgress } from "@/actions/curriculum";
import { CompletionProgressBar } from "@/components/curriculum/CompletionProgressBar";
import Link from "next/link";
import { BookOpen, ChevronRight, Loader2, AlertCircle, GraduationCap } from "lucide-react";

type Department   = { id: string; name: string };
type AcademicYear = { id: string; label: string };

function semesterColor(pct: number) {
  if (pct >= 100) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (pct >= 75)  return "text-teal-600 bg-teal-50 border-teal-200";
  if (pct >= 50)  return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-rose-600 bg-rose-50 border-rose-200";
}

export default function CurriculumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [subjects,      setSubjects]      = useState<SubjectWithProgress[]>([]);

  const [deptId,   setDeptId]   = useState("");
  const [semester, setSemester] = useState("");
  const [ayId,     setAyId]     = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("departments").select("id,name").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id,label").eq("institution_id", institutionId).order("label", { ascending: false }),
    ]).then(([{ data: d }, { data: ay }]) => {
      setDepartments(d ?? []);
      setAcademicYears(ay ?? []);
      if (ay?.[0]) setAyId(ay[0].id);
    });
  }, [institutionId]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getCurriculumOverview(institutionId, {
      departmentId:   deptId  || undefined,
      semester:       semester ? Number(semester) : undefined,
      academicYearId: ayId    || undefined,
    });
    setSubjects(res.success ? res.data : []);
    setLoading(false);
  }, [institutionId, deptId, semester, ayId]);

  useEffect(() => { load(); }, [load]);

  // Group by semester (subjects without a semester set fall back to 0 = "Unassigned")
  const bySemester = subjects.reduce<Record<number, SubjectWithProgress[]>>((acc, s) => {
    const sem = s.semester ?? 0;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(s);
    return acc;
  }, {});
  const semesters = Object.keys(bySemester).map(Number).sort((a, b) => a - b);

  const overallPct = subjects.length > 0
    ? Math.round(subjects.reduce((s, x) => s + x.completion_pct, 0) / subjects.length)
    : null;

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <BookOpen size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Curriculum & Syllabus</h1>
              <p className="text-xs text-slate-500">Track syllabus completion per subject and staff</p>
            </div>
          </div>
          {overallPct !== null && (
            <div className="text-right">
              <p className="text-2xl font-extrabold text-indigo-600">{overallPct}%</p>
              <p className="text-[10px] text-slate-400">Overall Completion</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3">
          <select value={deptId} onChange={e => setDeptId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white">
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <select value={ayId} onChange={e => setAyId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 bg-white">
            <option value="">All Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-indigo-500" /></div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
            <BookOpen size={36} className="opacity-25" />
            <p className="text-sm font-medium">No subjects found. Add subjects first from the Subjects module.</p>
            <Link href={`/institutions/${institutionId}/subjects`}
              className="mt-1 text-xs text-indigo-600 hover:underline font-medium">
              Go to Subjects →
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {semesters.map(sem => {
              const semSubjects = bySemester[sem];
              const semPct = Math.round(semSubjects.reduce((s, x) => s + x.completion_pct, 0) / semSubjects.length);
              return (
                <div key={sem}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{sem === 0 ? "Unassigned" : `Semester ${sem}`}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${semesterColor(semPct)}`}>
                      {semPct}% done
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {semSubjects.map(s => (
                      <Link
                        key={s.subject_id}
                        href={`/institutions/${institutionId}/curriculum/${s.subject_id}${ayId ? `?ay=${ayId}` : ""}`}
                        className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm leading-tight truncate group-hover:text-indigo-700 transition-colors">
                              {s.subject_name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              {s.subject_code && <span className="font-mono">{s.subject_code}</span>}
                              {s.department_name && <span>{s.department_name}</span>}
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 shrink-0 mt-0.5 transition-colors" />
                        </div>

                        <CompletionProgressBar
                          completed={s.completed_units}
                          total={s.total_units}
                          completedHours={s.completed_hours}
                          totalHours={s.total_hours}
                          size="sm"
                        />

                        {s.total_units === 0 && (
                          <p className="mt-2 text-[11px] text-amber-500 flex items-center gap-1">
                            <AlertCircle size={10} /> No units defined yet
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
