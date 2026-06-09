"use client";

import { useEffect, useState, useCallback, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  getLessonPlans,
  deleteLessonPlan,
  type LessonPlan,
} from "@/actions/lesson-plans";
import { BookText, Trash2, Loader2, ChevronDown, ChevronUp, Search } from "lucide-react";

type Staff        = { id: string; first_name: string; last_name: string };
type Subject      = { id: string; name: string; code: string | null };
type AcademicYear = { id: string; label: string };
type Department   = { id: string; name: string };

const METHODS = [
  "Lecture", "Demonstration", "Group Discussion", "Case Study",
  "Problem Solving", "Lab / Practical", "Seminar", "Project Work", "Other",
];

export default function LessonPlansAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: institutionId } = use(params);

  const [staffList,     setStaffList]     = useState<Staff[]>([]);
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [plans,         setPlans]         = useState<LessonPlan[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [deleting,      setDeleting]      = useState<string | null>(null);

  // Filters
  const [filterStaff,   setFilterStaff]   = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterAY,      setFilterAY]      = useState("");
  const [filterFrom,    setFilterFrom]    = useState("");
  const [filterTo,      setFilterTo]      = useState("");
  const [filterDept,    setFilterDept]    = useState("");
  const [search,        setSearch]        = useState("");

  // Expanded rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("staff").select("id, first_name, last_name").eq("institution_id", institutionId).order("first_name"),
      supabase.from("subjects").select("id, name, code").eq("institution_id", institutionId).order("name"),
      supabase.from("academic_years").select("id, label").eq("institution_id", institutionId).order("label", { ascending: false }),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name"),
    ]).then(([s, sub, ay, dept]) => {
      setStaffList((s.data ?? []) as Staff[]);
      setSubjects((sub.data ?? []) as Subject[]);
      setAcademicYears((ay.data ?? []) as AcademicYear[]);
      setDepartments((dept.data ?? []) as Department[]);
    });
  }, [institutionId]);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const res = await getLessonPlans(institutionId, {
      staffId:       filterStaff   || undefined,
      subjectId:     filterSubject || undefined,
      academicYearId: filterAY     || undefined,
      fromDate:      filterFrom    || undefined,
      toDate:        filterTo      || undefined,
    });
    setPlans(res.success ? res.data : []);
    setLoading(false);
  }, [institutionId, filterStaff, filterSubject, filterAY, filterFrom, filterTo]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this lesson plan entry?")) return;
    setDeleting(id);
    await deleteLessonPlan(id, institutionId);
    setPlans(p => p.filter(x => x.id !== id));
    setDeleting(null);
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const staffName = (s?: Staff) => s ? `${s.first_name} ${s.last_name}` : "—";

  const filtered = search
    ? plans.filter(p =>
        p.topic_covered.toLowerCase().includes(search.toLowerCase()) ||
        staffName(p.staff as Staff | undefined).toLowerCase().includes(search.toLowerCase()) ||
        (p.subject as Subject | undefined)?.name.toLowerCase().includes(search.toLowerCase())
      )
    : plans;

  const totalHours = filtered.reduce((s, p) => s + Number(p.hours_covered), 0);

  return (
    <DashboardLayout>
    <div className="px-6 py-8 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <BookText size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Lesson Plans</h1>
          <p className="text-xs text-slate-500">Daily teaching diary — all staff</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterStaff(""); }}
          className="col-span-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">All Depts</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
          className="col-span-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">All Staff</option>
          {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
        </select>
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="col-span-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>)}
        </select>
        <select value={filterAY} onChange={e => setFilterAY(e.target.value)}
          className="col-span-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400">
          <option value="">All Years</option>
          {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.label}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
          className="col-span-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
          className="col-span-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400" />
      </div>

      {/* Search + stats */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search topic, staff, subject..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg font-medium">
            {filtered.length} entries
          </span>
          <span className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-lg font-medium">
            {totalHours.toFixed(1)} hrs total
          </span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          No lesson plan entries found for the selected filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(plan => {
            const isOpen = expanded.has(plan.id);
            const subj = plan.subject as Subject | undefined;
            const staff = plan.staff as Staff | undefined;
            const unit = plan.curriculum_unit as { unit_number: number; title: string } | null | undefined;
            const ay   = plan.academic_year as { label: string } | null | undefined;
            return (
              <div key={plan.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => toggleExpand(plan.id)}>
                  {/* Date badge */}
                  <div className="shrink-0 w-14 text-center">
                    <p className="text-lg font-bold text-violet-600 dark:text-violet-400 leading-tight">
                      {new Date(plan.lesson_date).getDate().toString().padStart(2, "0")}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase">
                      {new Date(plan.lesson_date).toLocaleString("default", { month: "short" })}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(plan.lesson_date).getFullYear()}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {plan.topic_covered}
                      </span>
                      <span className="text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-medium">
                        {plan.hours_covered}h
                      </span>
                      {plan.teaching_method && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                          {plan.teaching_method}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{staffName(staff)}</span>
                      {subj && <span>· {subj.name}{subj.code ? ` (${subj.code})` : ""}</span>}
                      {unit  && <span>· Unit {unit.unit_number}: {unit.title}</span>}
                      {ay    && <span>· {ay.label}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleDelete(plan.id); }}
                      disabled={deleting === plan.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {deleting === plan.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Trash2 size={14} />}
                    </button>
                    {isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    {plan.remarks && (
                      <p><span className="font-semibold text-slate-700 dark:text-slate-300">Remarks: </span>{plan.remarks}</p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Logged: {new Date(plan.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
