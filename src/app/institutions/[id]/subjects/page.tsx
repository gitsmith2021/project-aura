"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { Plus, BookOpen, UserPlus, Pencil, Trash2, BookOpenCheck, Users } from "lucide-react";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { TeachingAssignmentDrawer } from "@/components/subjects/TeachingAssignmentDrawer";
import { Subject } from "@/actions/subjects";

type College = { id: string; name: string };
type Department = { id: string; name: string };
type AcademicYear = { id: string; label: string };
type StaffMember = { id: string; full_name: string; department_id: string | null };

type TeachingAssignmentWithStaff = {
  id: string;
  staff_id: string;
  subject_id: string;
  academic_year_id: string | null;
  semester: number;
  is_primary: boolean;
  staff: { full_name: string } | null;
  academic_year?: { label: string } | null;
};

const SUBJECT_TYPE_STYLES: Record<string, string> = {
  theory:   "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/40",
  lab:      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40",
  elective: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
  project:  "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
};

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function SubjectsRegistryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const collegeId = resolvedParams.id;

  const [college, setCollege] = useState<College | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignmentWithStaff[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");

  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedSubjectForAssign, setSelectedSubjectForAssign] = useState<Subject | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [
      { data: collegeData },
      { data: deptData },
      { data: ayData },
      { data: staffData },
    ] = await Promise.all([
      supabase.from("institutions").select("id, name").eq("id", collegeId).single(),
      supabase.from("departments").select("id, name").eq("institution_id", collegeId).order("name"),
      supabase.from("academic_years").select("id, label").eq("institution_id", collegeId).order("label", { ascending: false }),
      supabase.from("staff").select("id, full_name, department_id").eq("institution_id", collegeId).order("full_name"),
    ]);

    if (collegeData) setCollege(collegeData);
    if (deptData) setDepartments(deptData);
    if (ayData) setAcademicYears(ayData);
    if (staffData) setStaffList(staffData as StaffMember[]);

    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("*")
      .eq("institution_id", collegeId)
      .eq("is_active", true)
      .order("semester")
      .order("name");

    if (subjectsData) setSubjects(subjectsData as Subject[]);

    const { data: assignmentsData } = await supabase
      .from("teaching_assignments")
      .select(`id, staff_id, subject_id, academic_year_id, semester, is_primary, staff:staff(full_name), academic_year:academic_years(label)`)
      .eq("institution_id", collegeId);

    if (assignmentsData) setAssignments(assignmentsData as unknown as TeachingAssignmentWithStaff[]);

    setLoading(false);
  }, [collegeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Archive this subject? It will be hidden from all views.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("subjects").update({ is_active: false }).eq("id", subjectId);
    if (error) alert("Failed to archive subject: " + error.message);
    else fetchData();
  };

  const filteredSubjects = selectedDeptId === "all"
    ? subjects
    : subjects.filter((s) => s.department_id === selectedDeptId);

  const subjectsBySemester: Record<number, Subject[]> = {};
  filteredSubjects.forEach((s) => {
    const sem = s.semester || 1;
    if (!subjectsBySemester[sem]) subjectsBySemester[sem] = [];
    subjectsBySemester[sem].push(s);
  });

  const getSubjectAssignments = (subjectId: string) =>
    assignments.filter((a) => a.subject_id === subjectId);

  const breadcrumb = (
    <>
      <span className="text-slate-400">Institutions</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-400">{college?.name || "College"}</span>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Subject Registry</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between mb-5 gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/50 flex items-center justify-center shrink-0">
                <BookOpenCheck size={19} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight">
                  Subject & Teaching Registry
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage curriculum subjects and faculty assignments
                </p>
              </div>
            </div>

            <button
              onClick={() => { setSubjectToEdit(null); setSubjectFormOpen(true); }}
              disabled={departments.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add Subject
            </button>
          </div>

          {/* ── Filter Toolbar ── */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl mb-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">Department</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-colors text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {filteredSubjects.length} active subject{filteredSubjects.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              <div className="flex justify-center py-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white/50 dark:bg-slate-800/30 backdrop-blur-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={24} className="text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No subjects registered</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-xs mx-auto">
                  Add subjects to configure curricula and schedule timetables.
                </p>
              </div>
            ) : (
              <div className="space-y-8 pb-6">
                {Object.keys(subjectsBySemester)
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((sem) => (
                    <div key={sem}>
                      {/* Semester divider */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="h-px bg-violet-100 dark:bg-violet-900/40 flex-1" />
                        <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest px-3 py-1 bg-violet-50 dark:bg-violet-950/50 rounded-full border border-violet-200 dark:border-violet-800/50">
                          Semester {sem}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {subjectsBySemester[sem].length} subject{subjectsBySemester[sem].length !== 1 ? "s" : ""}
                        </span>
                        <span className="h-px bg-violet-100 dark:bg-violet-900/40 flex-1" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {subjectsBySemester[sem].map((subject) => {
                          const subjectAssignments = getSubjectAssignments(subject.id);
                          const dept = departments.find((d) => d.id === subject.department_id);
                          const typeStyle = SUBJECT_TYPE_STYLES[subject.subject_type] ?? SUBJECT_TYPE_STYLES.theory;

                          return (
                            <div
                              key={subject.id}
                              className="bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(109,40,217,0.10)] hover:border-violet-200 dark:hover:border-violet-700/50 transition-all duration-200 flex flex-col group"
                            >
                              {/* Card Header */}
                              <div className="p-4 pb-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                        {subject.name}
                                      </h3>
                                      {subject.code && (
                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-mono font-bold rounded border border-slate-200 dark:border-slate-600 shrink-0">
                                          {subject.code}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                                      {dept?.name ?? "—"}
                                    </p>
                                  </div>

                                  {/* Hover actions */}
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      onClick={() => { setSubjectToEdit(subject); setSubjectFormOpen(true); }}
                                      className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubject(subject.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                      title="Archive"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-1.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${typeStyle}`}>
                                    {subject.subject_type}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                    {subject.credits} Credits
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                    {subject.hours_per_week} Hrs/Wk
                                  </span>
                                </div>
                              </div>

                              {/* Teaching Staff */}
                              <div className="mx-4 border-t border-slate-100 dark:border-slate-700/60" />
                              <div className="p-4 pt-3 flex-1 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                    <Users size={11} />
                                    Teaching Staff
                                  </div>
                                  {subjectAssignments.length > 0 && (
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                      {subjectAssignments.length} assigned
                                    </span>
                                  )}
                                </div>

                                {subjectAssignments.length > 0 ? (
                                  <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                    {subjectAssignments.map((a) => (
                                      <div key={a.id} className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/40 flex items-center justify-center shrink-0">
                                          <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400">
                                            {initials(a.staff?.full_name ?? "?")}
                                          </span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
                                          {a.staff?.full_name ?? "Unknown"}
                                        </span>
                                        {a.is_primary && (
                                          <span className="px-1.5 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/40 text-[9px] font-bold rounded-full shrink-0">
                                            Primary
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                                    No instructors assigned yet
                                  </p>
                                )}

                                <button
                                  type="button"
                                  onClick={() => { setSelectedSubjectForAssign(subject); setAssignDrawerOpen(true); }}
                                  className="mt-auto flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:border-violet-300 dark:hover:border-violet-700/60 hover:text-violet-700 dark:hover:text-violet-400 text-slate-500 dark:text-slate-400 text-xs font-semibold rounded-xl transition-colors"
                                >
                                  <UserPlus size={13} />
                                  Assign Teacher
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SubjectForm
        isOpen={subjectFormOpen}
        onClose={() => { setSubjectFormOpen(false); setSubjectToEdit(null); }}
        institutionId={collegeId}
        departmentId={selectedDeptId === "all" ? (departments[0]?.id || "") : selectedDeptId}
        onSuccess={fetchData}
        subjectToEdit={subjectToEdit}
      />

      <TeachingAssignmentDrawer
        isOpen={assignDrawerOpen}
        onClose={() => { setAssignDrawerOpen(false); setSelectedSubjectForAssign(null); }}
        institutionId={collegeId}
        departmentId={selectedSubjectForAssign?.department_id || ""}
        subject={selectedSubjectForAssign}
        staffList={
          selectedSubjectForAssign
            ? staffList.filter((s) => s.department_id === selectedSubjectForAssign.department_id)
            : []
        }
        academicYears={academicYears}
        onSuccess={fetchData}
      />
    </DashboardLayout>
  );
}
