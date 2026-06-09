"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { Plus, ArrowLeft, BookOpen, UserPlus, Pencil, Trash2, BookOpenCheck } from "lucide-react";
import Link from "next/link";
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
  
  // Modals state
  const [subjectFormOpen, setSubjectFormOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [selectedSubjectForAssign, setSelectedSubjectForAssign] = useState<Subject | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch College, Departments, Academic Years, and Staff
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

    // Fetch Subjects
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("*")
      .eq("institution_id", collegeId)
      .eq("is_active", true)
      .order("semester")
      .order("name");

    if (subjectsData) setSubjects(subjectsData as Subject[]);

    // Fetch Teaching Assignments
    const { data: assignmentsData } = await supabase
      .from("teaching_assignments")
      .select(`
        id,
        staff_id,
        subject_id,
        academic_year_id,
        semester,
        is_primary,
        staff:staff(full_name),
        academic_year:academic_years(label)
      `)
      .eq("institution_id", collegeId);

    if (assignmentsData) {
      setAssignments(assignmentsData as unknown as TeachingAssignmentWithStaff[]);
    }

    setLoading(false);
  }, [collegeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure you want to deactivate this subject? It will be archived and hidden.")) return;
    
    const supabase = createClient();
    const { error } = await supabase
      .from("subjects")
      .update({ is_active: false })
      .eq("id", subjectId);

    if (error) {
      alert("Failed to delete subject: " + error.message);
    } else {
      fetchData();
    }
  };

  // Filter subjects based on department selector
  const filteredSubjects = selectedDeptId === "all"
    ? subjects
    : subjects.filter((s) => s.department_id === selectedDeptId);

  // Group filtered subjects by semester
  const subjectsBySemester: Record<number, Subject[]> = {};
  filteredSubjects.forEach((s) => {
    const sem = s.semester || 1;
    if (!subjectsBySemester[sem]) {
      subjectsBySemester[sem] = [];
    }
    subjectsBySemester[sem].push(s);
  });

  const getSubjectAssignments = (subjectId: string) => {
    return assignments.filter((a) => a.subject_id === subjectId);
  };

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-slate-900 transition-colors">Command Center</Link>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${collegeId}`} className="hover:text-slate-900 transition-colors">
        {college?.name || "College"}
      </Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="text-slate-900 font-semibold">Subject Registry</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Header Area */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 shrink-0">
            <div>
              <Link
                href={`/institutions/${collegeId}`}
                className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-purple-600 mb-1 transition-colors uppercase tracking-wider font-semibold"
              >
                <ArrowLeft size={12} /> Back to College Dashboard
              </Link>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <BookOpenCheck size={22} className="text-purple-600" />
                Subject & Teaching Registry
              </h1>
            </div>

            <button
              onClick={() => {
                setSubjectToEdit(null);
                setSubjectFormOpen(true);
              }}
              disabled={departments.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Subject
            </button>
          </div>

          {/* Filtering toolbar */}
          <div className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-700 p-3 rounded-xl mb-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <label htmlFor="dept-filter" className="text-xs font-semibold text-slate-500">
                Filter by Department:
              </label>
              <select
                id="dept-filter"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="text-[11px] text-slate-500 font-medium">
              Showing {filteredSubjects.length} active subjects
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-250 dark:border-slate-700 rounded-xl bg-white/50 backdrop-blur-sm">
                <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No subjects registered.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Add subjects to configure curricula and schedule timetables.
                </p>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                {Object.keys(subjectsBySemester)
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((sem) => (
                    <div key={sem} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="h-0.5 bg-purple-100 dark:bg-purple-950/40 flex-1"></span>
                        <h2 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest px-3 py-1 bg-purple-50 dark:bg-purple-950/40 rounded-full border border-purple-100 dark:border-purple-900/40">
                          Semester {sem}
                        </h2>
                        <span className="h-0.5 bg-purple-100 dark:bg-purple-950/40 flex-1"></span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {subjectsBySemester[sem].map((subject) => {
                          const subjectAssignments = getSubjectAssignments(subject.id);
                          const dept = departments.find((d) => d.id === subject.department_id);

                          return (
                            <div
                              key={subject.id}
                              className="bg-white/70 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-100 dark:border-slate-750 p-4 rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-purple-100 dark:hover:border-purple-900/40 transition-all flex flex-col gap-3 group relative"
                            >
                              {/* Subject Header */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                      {subject.name}
                                    </h3>
                                    {subject.code && (
                                      <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-350 text-[9px] font-bold rounded">
                                        {subject.code}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                    {dept?.name || "Loading Dept..."}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setSubjectToEdit(subject);
                                      setSubjectFormOpen(true);
                                    }}
                                    className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                    title="Edit Subject"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubject(subject.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                    title="Archive Subject"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              {/* Badges row */}
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950/35 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 capitalize">
                                  {subject.subject_type}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/35 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30">
                                  {subject.credits} Credits
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                  {subject.hours_per_week} Hrs/Wk
                                </span>
                              </div>

                              {/* Teachers assigned */}
                              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-3 flex-1 flex flex-col justify-between gap-3">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Teaching Staff
                                  </p>
                                  {subjectAssignments.length > 0 ? (
                                    <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                      {subjectAssignments.map((a) => (
                                        <div
                                          key={a.id}
                                          className="flex items-center justify-between text-xs py-0.5"
                                        >
                                          <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {a.staff?.full_name || "Unknown Staff"}
                                            {a.is_primary && (
                                              <span className="ml-1 text-[8px] px-1 font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-950/45 dark:text-teal-400 rounded">
                                                Primary
                                              </span>
                                            )}
                                          </span>
                                          {a.academic_year?.label && (
                                            <span className="text-[9px] text-slate-400">
                                              ({a.academic_year.label})
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-slate-400 italic">
                                      No instructors assigned yet
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSubjectForAssign(subject);
                                    setAssignDrawerOpen(true);
                                  }}
                                  className="w-full mt-1.5 flex items-center justify-center gap-1 py-1 px-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-150 dark:border-slate-650 hover:bg-purple-50 hover:border-purple-200 dark:hover:bg-purple-950/30 dark:hover:border-purple-900 hover:text-purple-600 dark:hover:text-purple-400 text-[10px] font-bold rounded-lg transition-colors"
                                >
                                  <UserPlus size={12} />
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

      {/* Forms & Drawers */}
      <SubjectForm
        isOpen={subjectFormOpen}
        onClose={() => {
          setSubjectFormOpen(false);
          setSubjectToEdit(null);
        }}
        institutionId={collegeId}
        departmentId={selectedDeptId === "all" ? (departments[0]?.id || "") : selectedDeptId}
        onSuccess={fetchData}
        subjectToEdit={subjectToEdit}
      />

      <TeachingAssignmentDrawer
        isOpen={assignDrawerOpen}
        onClose={() => {
          setAssignDrawerOpen(false);
          setSelectedSubjectForAssign(null);
        }}
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
