"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { getArrearStudents, ExamResult } from "@/actions/examResults";
import { createClient } from "@/utils/supabase/client";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

type Department   = { id: string; name: string };
type AcademicYear = { id: string; label: string };

type ArrearRow = ExamResult & {
  students: {
    id: string;
    full_name: string;
    roll_number: string | null;
    department_id: string | null;
    year: number | null;
    departments: { name: string } | null;
  } | null;
};

export default function ArrearsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [instName,      setInstName]      = useState("");

  const [deptId,     setDeptId]     = useState("");
  const [ayId,       setAyId]       = useState("");
  const [semester,   setSemester]   = useState("");

  const [arrears,  setArrears]  = useState<ArrearRow[]>([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("institutions").select("name").eq("id", institutionId).single(),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id, label").eq("institution_id", institutionId).order("label", { ascending: false }),
    ]).then(([inst, depts, years]) => {
      if (inst.data)  setInstName(inst.data.name);
      if (depts.data) setDepartments(depts.data);
      if (years.data) setAcademicYears(years.data);
    });
  }, [institutionId]);

  const fetchArrears = useCallback(async () => {
    setLoading(true);
    const res = await getArrearStudents(institutionId, {
      departmentId:   deptId   || undefined,
      semester:       semester ? Number(semester) : undefined,
      academicYearId: ayId     || undefined,
    });
    setArrears(res.success ? (res.data as ArrearRow[]) : []);
    setLoading(false);
  }, [institutionId, deptId, ayId, semester]);

  useEffect(() => { fetchArrears(); }, [fetchArrears]);

  // Group arrears by student
  const byStudent: Record<string, ArrearRow[]> = {};
  arrears.forEach(r => {
    const sid = r.student_id;
    if (!byStudent[sid]) byStudent[sid] = [];
    byStudent[sid].push(r);
  });

  const breadcrumb = (
    <>
      <span className="text-slate-400">Institutions</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-400">{instName}</span>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${institutionId}/results`} className="text-slate-400 hover:text-slate-700 transition-colors">
        Results
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Arrear Students</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center shrink-0">
            <AlertTriangle size={19} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">Arrear Students</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Students with failed subjects requiring clearance</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-6 flex flex-wrap items-center gap-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
          <select
            value={deptId}
            onChange={e => setDeptId(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-800 dark:text-slate-200"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            value={semester}
            onChange={e => setSemester(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-800 dark:text-slate-200"
          >
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>

          <select
            value={ayId}
            onChange={e => setAyId(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-800 dark:text-slate-200"
          >
            <option value="">All Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {Object.keys(byStudent).length} student{Object.keys(byStudent).length !== 1 ? "s" : ""} with arrears
            </span>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : Object.keys(byStudent).length === 0 ? (
          <div className="py-20 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/30">
            <AlertTriangle size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-500">No arrear students found</p>
            <p className="text-xs text-slate-400 mt-1">All results match the passing criteria for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byStudent).map(([studentId, rows]) => {
              const stu     = rows[0]?.students;
              const deptName = stu?.departments?.name ?? "—";

              return (
                <div
                  key={studentId}
                  className="bg-white/90 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-900/30 rounded-2xl shadow-[0_2px_8px_rgba(239,68,68,0.06)] overflow-hidden"
                >
                  {/* Student row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-rose-50/60 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          {stu?.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{stu?.full_name ?? "Unknown"}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {stu?.roll_number && <span className="font-mono">{stu.roll_number} · </span>}
                          {deptName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full border border-rose-200 dark:border-rose-800/40">
                        {rows.length} arrear{rows.length !== 1 ? "s" : ""}
                      </span>
                      <Link
                        href={`/institutions/${institutionId}/results/${studentId}`}
                        className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        Marksheet <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>

                  {/* Arrear subjects */}
                  <div className="px-4 py-2 flex flex-wrap gap-2">
                    {rows.map(r => (
                      <span key={r.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-400">
                        <span>{r.subject_name}</span>
                        <span className="text-rose-400 font-normal">Sem {r.semester}</span>
                        <span className="text-[10px] font-bold bg-rose-200 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 px-1 rounded">
                          {r.marks_scored}/{r.max_marks}
                        </span>
                      </span>
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
