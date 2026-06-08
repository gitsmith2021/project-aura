"use client";

import { useEffect, useState, useMemo } from "react";
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { Plus, Search, ChevronLeft, ChevronRight, X, Pencil, Upload, LayoutGrid, Table2, Info, User, LogIn, KeyRound, Loader2 } from "lucide-react";
import { AddPersonModal } from "@/components/users/AddPersonModal";
import { EditPersonModal, type PersonEditPayload } from "@/components/users/EditPersonModal";
import { Badge } from "@/components/ui/Badge";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import { formatStudentTrack, studentProgramLabel, type StudentProgram } from "@/lib/studentProgram";
import { BulkUploadModal } from "@/components/users/BulkUploadModal";
import { StudentDeptBreakdown } from "@/components/users/StudentDeptBreakdown";
import { StaffCredentialsModal } from "@/components/users/StaffCredentialsModal";
import { batchGetStaffAuthStatuses, toggleStaffPortalAccess, type StaffAuthStatus } from "@/actions/staffCredentials";
import { useInstitution } from "@/context/InstitutionContext";

const CARD_PALETTES = [
  {
    card: "from-violet-50/80 to-white dark:from-violet-950/30 dark:to-slate-900 border-violet-100/80 dark:border-violet-900/40 hover:border-violet-300/80 dark:hover:border-violet-700/60",
    iconBg: "bg-violet-50 dark:bg-violet-950/50 border-violet-100 dark:border-violet-900/60",
    iconText: "text-violet-600 dark:text-violet-400",
  },
  {
    card: "from-blue-50/80 to-white dark:from-blue-950/30 dark:to-slate-900 border-blue-100/80 dark:border-blue-900/40 hover:border-blue-300/80 dark:hover:border-blue-700/60",
    iconBg: "bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900/60",
    iconText: "text-blue-600 dark:text-blue-400",
  },
  {
    card: "from-teal-50/80 to-white dark:from-teal-950/30 dark:to-slate-900 border-teal-100/80 dark:border-teal-900/40 hover:border-teal-300/80 dark:hover:border-teal-700/60",
    iconBg: "bg-teal-50 dark:bg-teal-950/50 border-teal-100 dark:border-teal-900/60",
    iconText: "text-teal-600 dark:text-teal-400",
  },
  {
    card: "from-rose-50/80 to-white dark:from-rose-950/30 dark:to-slate-900 border-rose-100/80 dark:border-rose-900/40 hover:border-rose-300/80 dark:hover:border-rose-700/60",
    iconBg: "bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-900/60",
    iconText: "text-rose-600 dark:text-rose-400",
  },
  {
    card: "from-amber-50/80 to-white dark:from-amber-950/30 dark:to-slate-900 border-amber-100/80 dark:border-amber-900/40 hover:border-amber-300/80 dark:hover:border-amber-700/60",
    iconBg: "bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-900/60",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  {
    card: "from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-100/80 dark:border-emerald-900/40 hover:border-emerald-300/80 dark:hover:border-emerald-700/60",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900/60",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
] as const;

export type UsersManagementPerson = {
  id: string;
  full_name: string;
  role: "STAFF" | "STUDENT";
  department_id: string | null;
  institution_id: string;
  email?: string | null;
  phone?: string | null;
  student_program?: string | null;
  student_year?: number | null;
  departments: { name: string; funding_type?: string | null } | null;
  institutions: { name: string } | null;
  roll_no?: string;
};

const PAGE_SIZE = 10;

/** DB enum / text variants */
function normalizeProfileRole(r: unknown): "STAFF" | "STUDENT" | null {
  const s = String(r ?? "").toUpperCase();
  if (s === "STAFF" || s === "STUDENT") return s;
  return null;
}

function profileMatchesRole(p: UsersManagementPerson, expected: "STAFF" | "STUDENT"): boolean {
  return normalizeProfileRole(p.role) === expected;
}

export function UsersManagement({ role }: { role: "STAFF" | "STUDENT" }) {
  const [people, setPeople] = useState<UsersManagementPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<PersonEditPayload | null>(null);
  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterDeptOpen, setFilterDeptOpen] = useState(false);
  const [filterProgram, setFilterProgram] = useState<"" | StudentProgram>("");
  const [filterYearNum, setFilterYearNum] = useState<number | null>(null);
  const [segmentActiveKey, setSegmentActiveKey] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{
    id: string;
    name: string;
    institution_id: string;
    funding_type?: string | null;
    color?: string | null;
  }[]>([]);
  const { institutions: tenants, selectedId: selectedTenantId } = useInstitution();
  const [page, setPage] = useState(1);
  /** Students page only: department grid vs roster table */
  const [studentsLayoutMode, setStudentsLayoutMode] = useState<"grid" | "table">("grid");
  /** Staff page only: card grid vs roster table */
  const [staffLayoutMode, setStaffLayoutMode] = useState<"grid" | "table">("grid");
  /** Staff portal credentials */
  const [authStatuses, setAuthStatuses] = useState<Record<string, StaffAuthStatus>>({});
  const [authLoading, setAuthLoading] = useState(false);
  const [credModalPerson, setCredModalPerson] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [blockingEmail, setBlockingEmail] = useState<string | null>(null);
  /** Student portal credentials */
  const [studentAuthStatuses, setStudentAuthStatuses] = useState<Record<string, StaffAuthStatus>>({});
  const [studentAuthLoading, setStudentAuthLoading] = useState(false);
  const [studentCredModalPerson, setStudentCredModalPerson] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [studentBlockingEmail, setStudentBlockingEmail] = useState<string | null>(null);

  const fetchPeople = async () => {
    setLoading(true);
    const supabase = createClient();
    const table = role === "STAFF" ? "staff" : "students";
    const { data, error } = await supabase
      .from(table)
      .select("*, departments(name, funding_type), institutions(name)")
      .order("full_name", { ascending: true });
    if (!error && data) setPeople(data.map(p => ({ ...p, role })) as UsersManagementPerson[]);
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchPeople();
    });

    const supabase = createClient();
    supabase
      .from("departments")
      .select("id, name, institution_id, funding_type, color")
      .order("name")
      .then((res) => {
        if (res?.data) {
          Promise.resolve().then(() => {
            setDepartments(res.data);
          });
        }
      });

    const table = role === "STAFF" ? "staff" : "students";
    const channel = supabase
      .channel(`realtime-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        fetchPeople();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setPage(1);
    });
  }, [search, filterDeptId, selectedTenantId, filterProgram, filterYearNum, role, staffLayoutMode]);

  // Load Supabase auth status for all staff members
  useEffect(() => {
    if (role !== "STAFF" || people.length === 0) return;
    const emails = people.map((p) => p.email).filter(Boolean) as string[];
    if (emails.length === 0) return;
    setAuthLoading(true);
    batchGetStaffAuthStatuses(emails).then((statuses) => {
      setAuthStatuses(statuses);
      setAuthLoading(false);
    });
  }, [people, role]);

  // Load Supabase auth status for all students
  useEffect(() => {
    if (role !== "STUDENT" || people.length === 0) return;
    const emails = people.map((p) => p.email).filter(Boolean) as string[];
    if (emails.length === 0) return;
    setStudentAuthLoading(true);
    batchGetStaffAuthStatuses(emails).then((statuses) => {
      setStudentAuthStatuses(statuses);
      setStudentAuthLoading(false);
    });
  }, [people, role]);

  const filteredDepts = useMemo(
    () => departments.filter((d) => d.institution_id === selectedTenantId),
    [departments, selectedTenantId]
  );

  useEffect(() => {
    if (filterDeptId && !filteredDepts.some((d) => d.id === filterDeptId)) {
      Promise.resolve().then(() => {
        setFilterDeptId("");
        setFilterProgram("");
        setFilterYearNum(null);
        setSegmentActiveKey(null);
      });
    }
  }, [filteredDepts, filterDeptId]);

  /** Cohort filters are per institution — reset when switching college tab */
  useEffect(() => {
    if (!selectedTenantId) return;
    Promise.resolve().then(() => {
      setFilterDeptId("");
      setFilterProgram("");
      setFilterYearNum(null);
      setSegmentActiveKey(null);
    });
  }, [selectedTenantId]);

  const studentsInTenantCount = useMemo(() => {
    if (role !== "STUDENT") return 0;
    return people.filter((p) => p.institution_id === selectedTenantId).length;
  }, [people, selectedTenantId, role]);

  const studentCohortFiltersActive =
    role === "STUDENT" &&
    (Boolean(filterDeptId) || Boolean(filterProgram) || filterYearNum !== null);

  const clearStudentCohortFilters = () => {
    setFilterDeptId("");
    setFilterProgram("");
    setFilterYearNum(null);
    setSegmentActiveKey(null);
  };

  const peopleWithRollNos = useMemo(() => {
    if (role !== "STUDENT") return people;
    
    const maxIndices = new Map<string, number>();
    for (const p of people) {
      if (p.roll_no) {
        const cohortKey = `${p.institution_id}:${p.department_id}:${p.student_program}:${p.student_year}`;
        const match = p.roll_no.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          maxIndices.set(cohortKey, Math.max(maxIndices.get(cohortKey) || 0, num));
        }
      }
    }

    return people.map(p => {
      if (p.roll_no) return p;

      const cohortKey = `${p.institution_id}:${p.department_id}:${p.student_program}:${p.student_year}`;
      const currentCount = (maxIndices.get(cohortKey) || 0) + 1;
      maxIndices.set(cohortKey, currentCount);

      const program = p.student_program || "XX";
      const fundingRaw = p.departments?.funding_type;
      const funding = fundingRaw === "AIDED" ? "A" : fundingRaw === "SF" ? "SF" : "XX";
      
      const deptName = p.departments?.name || "";
      let deptPrefix = "XX";
      if (deptName) {
        const words = deptName.split(/[\s-]+/);
        if (words.length > 1) {
          deptPrefix = words.map(w => w[0].toUpperCase()).join("");
        } else {
          deptPrefix = deptName.substring(0, 2).toUpperCase();
        }
      }
      
      const idxStr = String(currentCount).padStart(3, "0");
      const roll_no = `${program}-${funding}-${deptPrefix}-${idxStr}`;

      return { ...p, roll_no };
    });
  }, [people, role]);

  useEffect(() => {
    if (role !== "STUDENT" || people.length === 0) return;
    
    const missing = people.filter(p => !p.roll_no);
    if (missing.length === 0) return;

    const updates = missing.map(m => {
      const computed = peopleWithRollNos.find(c => c.id === m.id);
      return { 
        id: m.id, 
        roll_no: computed?.roll_no,
        institution_id: m.institution_id,
        full_name: m.full_name,
        department_id: m.department_id
      };
    }).filter(u => u.roll_no);

    if (updates.length > 0) {
      const supabase = createClient();
      supabase
        .from('students')
        .upsert(updates)
        .then((res) => {
          if (res?.error) {
            console.error("Lazy backfill error - Message:", res.error.message, "Details:", res.error.details, "Code:", res.error.code, "Hint:", res.error.hint);
          }
        });
    }
  }, [people, peopleWithRollNos, role]);

  const filtered = useMemo(() => {
    return peopleWithRollNos.filter((p) => {
      if (p.institution_id !== selectedTenantId) return false;
      if (filterDeptId && p.department_id !== filterDeptId) return false;
      if (role === "STUDENT") {
        if (filterProgram && (p.student_program as StudentProgram | null) !== filterProgram) return false;
        if (filterYearNum != null && p.student_year !== filterYearNum) return false;
      }
      const q = search.toLowerCase();
      return (
        p.full_name.toLowerCase().includes(q) ||
        (p.departments?.name ?? "").toLowerCase().includes(q) ||
        (role === "STUDENT" && formatStudentTrack(p.student_program as StudentProgram | null, p.student_year ?? null).toLowerCase().includes(q))
      );
    });
  }, [people, role, filterDeptId, filterProgram, filterYearNum, search, selectedTenantId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeDept = departments.find((d) => d.id === filterDeptId);
  const activeTenantName = tenants.find((t) => t.id === selectedTenantId)?.name ?? "";

  function currentAcademicYear(): string {
    const now = new Date();
    const y = now.getFullYear();
    const startYear = now.getMonth() + 1 >= 7 ? y : y - 1;
    return `${startYear}-${String(startYear + 1).slice(2)}`;
  }

  const yearOptions =
    filterProgram === "PG" ? [1, 2] : filterProgram === "UG" ? [1, 2, 3] : [1, 2, 3];

  const colSpan = role === "STAFF" ? 5 : 7;

  const onBreakdownSelect = (
    key: string | null,
    deptId: string | null,
    program: StudentProgram | null,
    year: number | null
  ) => {
    setSegmentActiveKey(key);
    setFilterDeptId(deptId ?? "");
    setFilterProgram(program ?? "");
    setFilterYearNum(year);
  };

  return (
    <DashboardLayout>
      <div className="px-6 pt-2 pb-4 w-full relative flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">
        {role === "STUDENT" && selectedTenantId && studentsLayoutMode === "grid" ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 shrink-0">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">Students</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <div className="relative group shrink-0 z-40">
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 outline-none hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 dark:hover:text-violet-400 transition-colors border border-transparent hover:border-violet-100 dark:hover:border-violet-900/45 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1"
                  aria-label="About the student grid"
                >
                  <Info size={16} strokeWidth={2} aria-hidden />
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 max-w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-left text-[11px] leading-snug text-slate-600 dark:text-slate-300 shadow-xl opacity-0 transition-opacity duration-150 invisible group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">Department grid</p>
                  <p className="mb-2">
                    Headcount by program and year. Tap a number to filter; tap again to clear.
                  </p>
                  <p className="text-slate-500 dark:text-slate-450">
                    Switch to <span className="font-medium text-slate-700 dark:text-slate-300">Table</span> for search, roster edits, and bulk CSV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                disabled={!selectedTenantId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50 shrink-0"
              >
                <Upload size={14} strokeWidth={2.5} /> Bulk CSV
              </button>
              <div
                className="flex rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-100/90 dark:bg-slate-800/90 p-0.5 shrink-0"
                role="group"
                aria-label="Layout"
              >
                <button
                  type="button"
                  onClick={() => setStudentsLayoutMode("grid")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-450 shadow-sm border border-slate-200/80 dark:border-slate-650"
                >
                  <LayoutGrid size={14} strokeWidth={2.25} />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setStudentsLayoutMode("table")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  <Table2 size={14} strokeWidth={2.25} />
                  Table
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-colors border border-purple-700 shrink-0"
              >
                <Plus size={14} strokeWidth={2.5} /> Add Student
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2 shrink-0">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">{role === "STAFF" ? "Staff" : "Students"}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px] leading-snug">
                {role === "STAFF"
                  ? "Faculty and staff for the selected institution."
                  : "Filters below apply to the table and match grid selections when you use the cohort breakdown."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                disabled={!selectedTenantId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50 shrink-0"
              >
                <Upload size={14} strokeWidth={2.5} /> Bulk CSV
              </button>
              {role === "STUDENT" && (
                <div
                  className="flex rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-100/90 dark:bg-slate-800/90 p-0.5 shrink-0"
                  role="group"
                  aria-label="Layout"
                >
                  <button
                    type="button"
                    onClick={() => setStudentsLayoutMode("grid")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      studentsLayoutMode === "grid"
                        ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-450 shadow-sm border border-slate-200/80 dark:border-slate-650"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <LayoutGrid size={14} strokeWidth={2.25} />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentsLayoutMode("table")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      studentsLayoutMode === "table"
                        ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-450 shadow-sm border border-slate-200/80 dark:border-slate-650"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Table2 size={14} strokeWidth={2.25} />
                    Table
                  </button>
                </div>
              )}
              {role === "STAFF" && (
                <div
                  className="flex rounded-lg border border-slate-200 dark:border-slate-750 bg-slate-100/90 dark:bg-slate-800/90 p-0.5 shrink-0"
                  role="group"
                  aria-label="Layout"
                >
                  <button
                    type="button"
                    onClick={() => setStaffLayoutMode("grid")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      staffLayoutMode === "grid"
                        ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-455 shadow-sm border border-slate-200/80 dark:border-slate-650"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <LayoutGrid size={14} strokeWidth={2.25} />
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffLayoutMode("table")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      staffLayoutMode === "table"
                        ? "bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-455 shadow-sm border border-slate-200/80 dark:border-slate-650"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Table2 size={14} strokeWidth={2.25} />
                    Table
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-md hover:bg-purple-700 transition-colors border border-purple-700 shrink-0"
              >
                <Plus size={14} strokeWidth={2.5} /> Add {role === "STAFF" ? "Staff" : "Student"}
              </button>
            </div>
          </div>
        )}

        {role === "STUDENT" && selectedTenantId && studentsLayoutMode === "grid" && (
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5 gap-3 pb-4">
            <StudentDeptBreakdown
              tenantId={selectedTenantId}
              students={people}
              departments={departments}
              activeKey={segmentActiveKey}
              onSelectSegment={onBreakdownSelect}
            />
            {/* Cohort slide-out drawer has replaced the bottom bar */}
          </div>
        )}

        {(role !== "STUDENT" || studentsLayoutMode === "table") && (
          <>
        <div className="flex flex-wrap items-center gap-2 mb-2 shrink-0">
          {role === "STUDENT" && (
            <>
              <select
                value={filterProgram}
                onChange={(e) => {
                  setSegmentActiveKey(null);
                  const v = e.target.value as "" | StudentProgram;
                  setFilterProgram(v);
                  setFilterYearNum(null);
                }}
                className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 shrink-0"
              >
                <option value="">All programs</option>
                <option value="UG">{studentProgramLabel("UG")}</option>
                <option value="PG">{studentProgramLabel("PG")}</option>
              </select>
              <select
                value={filterYearNum ?? ""}
                onChange={(e) => {
                  setSegmentActiveKey(null);
                  const v = e.target.value;
                  setFilterYearNum(v === "" ? null : Number(v));
                }}
                className="h-8 px-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 shrink-0"
              >
                <option value="">All years</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="relative flex-1 min-w-[min(100%,200px)] max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={role === "STAFF" ? "Search by name or department…" : "Search name, dept, UG/PG…"}
              className="h-8 w-full pl-8 pr-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterDeptOpen((v) => !v)}
              className={`h-8 flex items-center gap-1.5 px-3 border text-xs font-medium rounded-md transition-colors ${
                filterDeptId ? "border-purple-400 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {activeDept ? `${activeDept.name} (${fundingTypeShortLabel(activeDept.funding_type)})` : "Department"}
              {filterDeptId ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterDeptId("");
                    setSegmentActiveKey(null);
                  }}
                  className="ml-1 font-bold leading-none text-purple-400 hover:text-purple-700"
                >
                  ×
                </span>
              ) : (
                <ChevronLeft size={12} className="-rotate-90 ml-0.5 text-slate-400" />
              )}
            </button>

            {filterDeptOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-xl z-30 py-1 max-h-60 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filter by Department</p>
                {filteredDepts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSegmentActiveKey(null);
                      setFilterDeptId(d.id);
                      setFilterDeptOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      filterDeptId === d.id ? "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-medium" : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {d.name}{" "}
                    <span className="text-slate-400 dark:text-slate-500 font-normal">({fundingTypeShortLabel(d.funding_type)})</span>
                  </button>
                ))}
                {filterDeptId && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterDeptId("");
                      setSegmentActiveKey(null);
                      setFilterDeptOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-t border-slate-100 dark:border-slate-700 mt-1"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {!loading && role === "STUDENT" && studentCohortFiltersActive && filtered.length === 0 && studentsInTenantCount > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-950">
            <span>
              No rows match the current filters, but this institution has{" "}
              <strong>{studentsInTenantCount}</strong> student{studentsInTenantCount === 1 ? "" : "s"}. Clear filters to see everyone.
            </span>
            <button
              type="button"
              onClick={clearStudentCohortFilters}
              className="shrink-0 rounded-md bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-800"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading &&
          (role === "STAFF" && staffLayoutMode === "grid" ? (
            <p className="text-[11px] text-slate-400 mb-3">
              {filtered.length} staff
              {filterDeptId && activeDept ? ` · ${activeDept.name}` : ""}
              {search ? ` · matching search` : ""}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 mb-3">
              Showing {paginated.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
              {role === "STAFF" ? "staff" : "students"}
              {role === "STUDENT" && !studentCohortFiltersActive && studentsInTenantCount > 0
                ? ` (${studentsInTenantCount} in this institution)`
                : null}
              {filterDeptId && activeDept ? ` · ${activeDept.name}` : ""}
              {role === "STUDENT" && filterProgram ? ` · ${filterProgram}` : ""}
              {role === "STUDENT" && filterYearNum != null ? ` · Year ${filterYearNum}` : ""}
            </p>
          ))}

        <div className="flex-1 min-h-0 flex flex-col">
          {role === "STAFF" && staffLayoutMode === "grid" ? (
            loading ? (
              <div className="flex-1 flex justify-center py-16">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">
                No staff found{search ? ` matching "${search}"` : ""}.
              </p>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-2">
                  {filtered.map((person, idx) => {
                    const palette = CARD_PALETTES[idx % CARD_PALETTES.length];
                    return (
                    <article
                      key={person.id}
                      className={`rounded-xl border bg-gradient-to-br ${palette.card} p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-3 hover:shadow-md transition-all`}
                    >
                      {/* Card header: avatar + info + portal action icons */}
                      <div className="flex items-start gap-2">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <span className={`w-10 h-10 rounded-lg ${palette.iconBg} border shrink-0 flex items-center justify-center`}>
                            <User size={18} className={palette.iconText} aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">{person.full_name}</p>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                              {person.departments?.name ? (
                                <span className="inline-flex items-center gap-1.5 flex-wrap">
                                  <span>{person.departments.name}</span>
                                  <DepartmentFundingBadge fundingType={person.departments.funding_type} />
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">No department</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-1 truncate">{person.institutions?.name ?? "—"}</p>
                          </div>
                        </div>

                        {/* Portal action icons (staff only) */}
                        {role === "STAFF" && (() => {
                          const email = person.email ?? "";
                          const status = authStatuses[email];
                          const isBlocked = status?.blocked ?? false;
                          const hasAccount = status?.exists ?? false;
                          const isBlockingThis = blockingEmail === email;

                          return (
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {authLoading && !status ? (
                                <Loader2 size={13} className="text-slate-300 dark:text-slate-600 animate-spin" />
                              ) : (
                                <div className="flex items-center gap-2">
                                  {/* View portal button */}
                                  <a
                                    href={`/staff-portal/view/${person.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={isBlocked ? "Access blocked" : !hasAccount ? "No portal account — set credentials first" : `View ${person.full_name}'s portal`}
                                    className={`p-1 rounded-md transition-colors ${
                                      !email || (!hasAccount && !authLoading)
                                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none"
                                        : isBlocked
                                        ? "text-rose-400 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                        : "text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/60 dark:hover:bg-violet-950/30"
                                    }`}
                                    onClick={(e) => { if (!hasAccount || isBlocked) e.preventDefault(); }}
                                  >
                                    <LogIn size={13} />
                                  </a>

                                  {/* Set credentials button */}
                                  <button
                                    type="button"
                                    title={hasAccount ? `Update password for ${person.full_name}` : `Create portal account for ${person.full_name}`}
                                    disabled={!email}
                                    onClick={() => email && setCredModalPerson({ id: person.id, full_name: person.full_name, email })}
                                    className="p-1 rounded-md cursor-pointer text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <KeyRound size={13} />
                                  </button>

                                  {/* Block / Unblock toggle switch */}
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!isBlocked}
                                    title={
                                      !hasAccount ? "No portal account — set credentials first" :
                                      isBlockingThis ? "Updating…" :
                                      isBlocked ? `Unblock ${person.full_name}'s portal access` :
                                      `Block ${person.full_name}'s portal access`
                                    }
                                    disabled={!hasAccount || isBlockingThis}
                                    onClick={async () => {
                                      if (!email || !hasAccount) return;
                                      setBlockingEmail(email);
                                      const res = await toggleStaffPortalAccess(email, !isBlocked);
                                      if (res.success) {
                                        setAuthStatuses((prev) => ({
                                          ...prev,
                                          [email]: { exists: true, blocked: !isBlocked },
                                        }));
                                      } else {
                                        alert(res.error ?? "Failed to update access.");
                                      }
                                      setBlockingEmail(null);
                                    }}
                                    className="disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    {isBlockingThis ? (
                                      <Loader2 size={13} className="text-slate-400 animate-spin" />
                                    ) : (
                                      <span className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                                        !hasAccount
                                          ? "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                          : isBlocked
                                          ? "bg-rose-200 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700"
                                          : "bg-emerald-400 dark:bg-emerald-500 border-emerald-500 dark:border-emerald-400"
                                      }`}>
                                        <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                          (!hasAccount || isBlocked) ? "translate-x-0.5" : "translate-x-3"
                                        }`} />
                                      </span>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <button
                        type="button"
                        disabled={!person.department_id}
                        title={!person.department_id ? "Assign a department before editing" : undefined}
                        onClick={() => {
                          if (!person.department_id) return;
                          setPersonToEdit({
                            id: person.id,
                            full_name: person.full_name,
                            role: person.role,
                            institution_id: person.institution_id,
                            department_id: person.department_id,
                            email: person.email,
                            phone: person.phone,
                            student_program: person.student_program ? (person.student_program as StudentProgram) : null,
                            student_year: person.student_year ?? null,
                          });
                        }}
                        className="mt-auto inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-850 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </article>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm relative border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">{role === "STUDENT" ? "Roll No." : "#"}</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Department</th>
                  {role === "STUDENT" && (
                    <>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Program</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Year</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100">Institution</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-slate-100 w-[160px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
                    </td>
                  </tr>
                ) : paginated.length > 0 ? (
                  paginated.map((person, i) => (
                    <tr key={person.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
                        {role === "STUDENT" ? person.roll_no : (page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 text-xs">{person.full_name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">
                        {person.departments?.name ? (
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <span>{person.departments.name}</span>
                            <DepartmentFundingBadge fundingType={person.departments.funding_type} />
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      {role === "STUDENT" && (
                        <>
                          <td className="px-4 py-3 text-xs">
                            {person.student_program ? (
                              <Badge variant={person.student_program === "UG" ? "active" : "default"}>
                                {person.student_program}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{person.student_year ?? "—"}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{person.institutions?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {role === "STUDENT" && (() => {
                            const email = person.email ?? "";
                            const status = studentAuthStatuses[email];
                            const isBlocked  = status?.blocked ?? false;
                            const hasAccount = status?.exists  ?? false;
                            const isBlockingThis = studentBlockingEmail === email;
                            return (
                              <>
                                {/* View student portal */}
                                <a
                                  href={`/student-portal/view/${person.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={!email ? "No email — cannot view portal" : `View ${person.full_name}'s portal`}
                                  className={`p-1 rounded-md transition-colors ${
                                    !email
                                      ? "text-slate-300 dark:text-slate-600 cursor-not-allowed pointer-events-none"
                                      : "text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30"
                                  }`}
                                >
                                  <LogIn size={13} />
                                </a>

                                {/* Set credentials */}
                                <button
                                  type="button"
                                  title={hasAccount ? `Update password for ${person.full_name}` : `Create portal account for ${person.full_name}`}
                                  disabled={!email}
                                  onClick={() => email && setStudentCredModalPerson({ id: person.id, full_name: person.full_name, email })}
                                  className="p-1 rounded-md cursor-pointer text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <KeyRound size={13} />
                                </button>

                                {/* Block / Unblock toggle */}
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={!isBlocked}
                                  title={
                                    !hasAccount ? "No portal account — set credentials first" :
                                    isBlockingThis ? "Updating…" :
                                    isBlocked ? `Unblock ${person.full_name}'s portal access` :
                                    `Block ${person.full_name}'s portal access`
                                  }
                                  disabled={!hasAccount || isBlockingThis}
                                  onClick={async () => {
                                    if (!email || !hasAccount) return;
                                    setStudentBlockingEmail(email);
                                    const res = await toggleStaffPortalAccess(email, !isBlocked);
                                    if (res.success) {
                                      setStudentAuthStatuses((prev) => ({
                                        ...prev,
                                        [email]: { exists: true, blocked: !isBlocked },
                                      }));
                                    } else {
                                      alert(res.error ?? "Failed to update access.");
                                    }
                                    setStudentBlockingEmail(null);
                                  }}
                                  className="disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  {isBlockingThis ? (
                                    <Loader2 size={13} className="text-slate-400 animate-spin" />
                                  ) : (
                                    <span className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                                      !hasAccount
                                        ? "bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                        : isBlocked
                                        ? "bg-rose-200 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700"
                                        : "bg-emerald-400 dark:bg-emerald-500 border-emerald-500 dark:border-emerald-400"
                                    }`}>
                                      <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                        (!hasAccount || isBlocked) ? "translate-x-0.5" : "translate-x-3"
                                      }`} />
                                    </span>
                                  )}
                                </button>
                              </>
                            );
                          })()}
                          <button
                            type="button"
                            disabled={!person.department_id}
                            title={!person.department_id ? "Assign a department before editing" : undefined}
                            onClick={() => {
                              if (!person.department_id) return;
                              setPersonToEdit({
                                id: person.id,
                                full_name: person.full_name,
                                role: role,
                                institution_id: person.institution_id,
                                department_id: person.department_id,
                                email: person.email,
                                phone: person.phone,
                                student_program: person.student_program ? (person.student_program as StudentProgram) : null,
                                student_year: person.student_year ?? null,
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-violet-300 dark:hover:border-violet-800 hover:text-violet-700 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-10 text-center text-xs text-slate-400 dark:text-slate-550">
                      No {role === "STAFF" ? "staff" : "students"} found{search ? ` matching "${search}"` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
              </div>

          {!loading && totalPages > 1 && !(role === "STAFF" && staffLayoutMode === "grid") && (
            <div className="flex items-center justify-between mt-4 shrink-0">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | "...")[]>((acc, n, idx, arr) => {
                    if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === "..." ? (
                      <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                          page === n ? "bg-purple-600 text-white" : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
          </>
        )}
      </div>

      {/* Cohort Slide-out Drawer */}
      <div
        className={`fixed inset-0 z-[60] flex justify-end transition-opacity duration-200 ${segmentActiveKey ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${segmentActiveKey ? "opacity-100" : "opacity-0"}`}
          onClick={() => {
            setSegmentActiveKey(null);
            setFilterDeptId("");
            setFilterProgram("");
            setFilterYearNum(null);
          }}
        />
        <div
          className={`relative w-full max-w-4xl h-full bg-white flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 ${segmentActiveKey ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">
                {activeDept?.name || "All Departments"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                {activeTenantName} · {currentAcademicYear()}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {filterProgram ? `${filterProgram} ` : ""}
                {filterYearNum ? `Year ${filterYearNum}` : "All Years"}
                {` • ${filtered.length} students`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSegmentActiveKey(null);
                setFilterDeptId("");
                setFilterProgram("");
                setFilterYearNum(null);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name…"
                className="h-8 w-full pl-8 pr-7 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-slate-400 shadow-sm"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 p-4">
            <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg bg-white shadow-sm">
              <table className="w-full text-left text-sm relative">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Roll No.</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Department</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Program</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900">Year</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-900 w-[160px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? (
                    filtered.map((person, i) => (
                      <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 font-mono">{person.roll_no}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 text-xs">{person.full_name}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {person.departments?.name ? (
                            <span className="inline-flex items-center gap-1.5 flex-wrap">
                              <span>{person.departments.name}</span>
                              <DepartmentFundingBadge fundingType={person.departments.funding_type} />
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {person.student_program ? (
                            <Badge variant={person.student_program === "UG" ? "active" : "default"}>
                              {person.student_program}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{person.student_year ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(() => {
                              const email = person.email ?? "";
                              const status = studentAuthStatuses[email];
                              const isBlocked  = status?.blocked ?? false;
                              const hasAccount = status?.exists  ?? false;
                              const isBlockingThis = studentBlockingEmail === email;
                              return (
                                <>
                                  <a
                                    href={`/student-portal/view/${person.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={!email ? "No email" : `View ${person.full_name}'s portal`}
                                    className={`p-1 rounded-md transition-colors ${
                                      !email
                                        ? "text-slate-300 cursor-not-allowed pointer-events-none"
                                        : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60"
                                    }`}
                                  >
                                    <LogIn size={13} />
                                  </a>
                                  <button
                                    type="button"
                                    title={hasAccount ? `Update password for ${person.full_name}` : `Create portal account for ${person.full_name}`}
                                    disabled={!email}
                                    onClick={() => email && setStudentCredModalPerson({ id: person.id, full_name: person.full_name, email })}
                                    className="p-1 rounded-md cursor-pointer text-slate-400 hover:text-amber-600 hover:bg-amber-50/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <KeyRound size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!isBlocked}
                                    title={!hasAccount ? "Set credentials first" : isBlocked ? `Unblock ${person.full_name}` : `Block ${person.full_name}`}
                                    disabled={!hasAccount || isBlockingThis}
                                    onClick={async () => {
                                      if (!email || !hasAccount) return;
                                      setStudentBlockingEmail(email);
                                      const res = await toggleStaffPortalAccess(email, !isBlocked);
                                      if (res.success) {
                                        setStudentAuthStatuses((prev) => ({ ...prev, [email]: { exists: true, blocked: !isBlocked } }));
                                      } else {
                                        alert(res.error ?? "Failed.");
                                      }
                                      setStudentBlockingEmail(null);
                                    }}
                                    className="disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  >
                                    {isBlockingThis ? (
                                      <Loader2 size={13} className="text-slate-400 animate-spin" />
                                    ) : (
                                      <span className={`relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                                        !hasAccount ? "bg-slate-200 border-slate-300" : isBlocked ? "bg-rose-200 border-rose-300" : "bg-emerald-400 border-emerald-500"
                                      }`}>
                                        <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${(!hasAccount || isBlocked) ? "translate-x-0.5" : "translate-x-3"}`} />
                                      </span>
                                    )}
                                  </button>
                                </>
                              );
                            })()}
                            <button
                              type="button"
                              disabled={!person.department_id}
                              title={!person.department_id ? "Assign a department before editing" : undefined}
                              onClick={() => {
                                if (!person.department_id) return;
                                setPersonToEdit({
                                  id: person.id,
                                  full_name: person.full_name,
                                  role: role,
                                  institution_id: person.institution_id,
                                  department_id: person.department_id,
                                  email: person.email,
                                  phone: person.phone,
                                  student_program: person.student_program ? (person.student_program as StudentProgram) : null,
                                  student_year: person.student_year ?? null,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-400">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AddPersonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPeople}
        defaultRole={role}
        defaultTenantId={selectedTenantId}
        defaultDepartmentId={filterDeptId || undefined}
        defaultProgram={(filterProgram as StudentProgram) || undefined}
        defaultYear={filterYearNum ?? undefined}
      />

      <BulkUploadModal
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={fetchPeople}
        role={role}
        tenantId={selectedTenantId}
        tenantName={activeTenantName}
        departments={departments}
      />

      <EditPersonModal isOpen={personToEdit !== null} onClose={() => setPersonToEdit(null)} onSuccess={fetchPeople} person={personToEdit} />

      <StaffCredentialsModal
        isOpen={credModalPerson !== null}
        onClose={() => setCredModalPerson(null)}
        person={credModalPerson}
        hasAccount={credModalPerson ? (authStatuses[credModalPerson.email]?.exists ?? false) : false}
        isBlocked={credModalPerson ? (authStatuses[credModalPerson.email]?.blocked ?? false) : false}
        onSuccess={(email) => {
          setAuthStatuses((prev) => ({
            ...prev,
            [email]: { exists: true, blocked: prev[email]?.blocked ?? false },
          }));
        }}
      />

      <StaffCredentialsModal
        isOpen={studentCredModalPerson !== null}
        onClose={() => setStudentCredModalPerson(null)}
        person={studentCredModalPerson}
        hasAccount={studentCredModalPerson ? (studentAuthStatuses[studentCredModalPerson.email]?.exists ?? false) : false}
        isBlocked={studentCredModalPerson ? (studentAuthStatuses[studentCredModalPerson.email]?.blocked ?? false) : false}
        onSuccess={(email) => {
          setStudentAuthStatuses((prev) => ({
            ...prev,
            [email]: { exists: true, blocked: prev[email]?.blocked ?? false },
          }));
        }}
      />
    </DashboardLayout>
  );
}
