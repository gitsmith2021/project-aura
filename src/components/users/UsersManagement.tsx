"use client";

import { useEffect, useState, useMemo } from "react";
import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollableTabBar } from "@/components/layout/ScrollableTabBar";
import { createClient } from "@/utils/supabase/client";
import { Plus, Search, ChevronLeft, ChevronRight, X, Pencil, Upload, LayoutGrid, Table2, Info, User } from "lucide-react";
import { AddPersonModal } from "@/components/users/AddPersonModal";
import { EditPersonModal, type PersonEditPayload } from "@/components/users/EditPersonModal";
import { Badge } from "@/components/ui/Badge";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import { formatStudentTrack, studentProgramLabel, type StudentProgram } from "@/lib/studentProgram";
import { BulkUploadModal } from "@/components/users/BulkUploadModal";
import { StudentDeptBreakdown } from "@/components/users/StudentDeptBreakdown";

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
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [page, setPage] = useState(1);
  /** Students page only: department grid vs roster table */
  const [studentsLayoutMode, setStudentsLayoutMode] = useState<"grid" | "table">("grid");
  /** Staff page only: card grid vs roster table */
  const [staffLayoutMode, setStaffLayoutMode] = useState<"grid" | "table">("grid");

  const fetchPeople = async () => {
    setLoading(true);
    const supabase = createClient();
    const table = role === "STAFF" ? "staff" : "students";
    const { data, error } = await supabase
      .from(table)
      .select("*, departments(name, funding_type), institutions(name)")
      .order("full_name", { ascending: true });
    if (!error && data) setPeople(data as UsersManagementPerson[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPeople();
    const supabase = createClient();
    supabase.from("institutions").select("id, name").order("name").then(({ data }) => {
      if (data && data.length > 0) {
        setTenants(data);
        setSelectedTenantId((prev) => prev || data[0].id);
      }
    });
    supabase.from("departments").select("id, name, institution_id, funding_type, color").order("name").then(({ data }) => {
      if (data) setDepartments(data);
    });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterDeptId, selectedTenantId, filterProgram, filterYearNum, role, staffLayoutMode]);

  const filteredDepts = useMemo(
    () => departments.filter((d) => d.institution_id === selectedTenantId),
    [departments, selectedTenantId]
  );

  useEffect(() => {
    if (filterDeptId && !filteredDepts.some((d) => d.id === filterDeptId)) {
      setFilterDeptId("");
      setFilterProgram("");
      setFilterYearNum(null);
      setSegmentActiveKey(null);
    }
  }, [filteredDepts, filterDeptId]);

  /** Cohort filters are per institution — reset when switching college tab */
  useEffect(() => {
    if (!selectedTenantId) return;
    setFilterDeptId("");
    setFilterProgram("");
    setFilterYearNum(null);
    setSegmentActiveKey(null);
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

  const filtered = useMemo(() => {
    return people.filter((p) => {
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
        <div className="mb-3 shrink-0 border-b border-slate-200">
          <ScrollableTabBar innerClassName="items-stretch gap-0">
            {tenants.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTenantId(t.id)}
                className={`shrink-0 whitespace-nowrap px-5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  selectedTenantId === t.id
                    ? "border-violet-600 bg-violet-50/50 text-violet-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                }`}
              >
                {t.name}
              </button>
            ))}
          </ScrollableTabBar>
        </div>

        {role === "STUDENT" && selectedTenantId && studentsLayoutMode === "grid" ? (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 shrink-0">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Students</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              <div className="relative group shrink-0 z-[100]">
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 outline-none hover:text-violet-600 hover:bg-violet-50 transition-colors border border-transparent hover:border-violet-100 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-1"
                  aria-label="About the student grid"
                >
                  <Info size={16} strokeWidth={2} aria-hidden />
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute right-0 top-full z-[100] mt-2 w-72 max-w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-[11px] leading-snug text-slate-600 shadow-xl opacity-0 transition-opacity duration-150 invisible group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                >
                  <p className="font-semibold text-slate-800 mb-1.5">Department grid</p>
                  <p className="mb-2">
                    Headcount by program and year. Tap a number to filter; tap again to clear.
                  </p>
                  <p className="text-slate-500">
                    Switch to <span className="font-medium text-slate-700">Table</span> for search, roster edits, and bulk CSV.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                disabled={!selectedTenantId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 shrink-0"
              >
                <Upload size={14} strokeWidth={2.5} /> Bulk CSV
              </button>
              <div
                className="flex rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 shrink-0"
                role="group"
                aria-label="Layout"
              >
                <button
                  type="button"
                  onClick={() => setStudentsLayoutMode("grid")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors bg-white text-violet-700 shadow-sm border border-slate-200/80"
                >
                  <LayoutGrid size={14} strokeWidth={2.25} />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setStudentsLayoutMode("table")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors text-slate-500 hover:text-slate-800"
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
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{role === "STAFF" ? "Staff" : "Students"}</h1>
              <p className="text-slate-500 mt-0.5 text-[11px] leading-snug">
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors border border-slate-200 disabled:opacity-50 shrink-0"
              >
                <Upload size={14} strokeWidth={2.5} /> Bulk CSV
              </button>
              {role === "STUDENT" && (
                <div
                  className="flex rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 shrink-0"
                  role="group"
                  aria-label="Layout"
                >
                  <button
                    type="button"
                    onClick={() => setStudentsLayoutMode("grid")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      studentsLayoutMode === "grid"
                        ? "bg-white text-violet-700 shadow-sm border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800"
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
                        ? "bg-white text-violet-700 shadow-sm border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Table2 size={14} strokeWidth={2.25} />
                    Table
                  </button>
                </div>
              )}
              {role === "STAFF" && (
                <div
                  className="flex rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 shrink-0"
                  role="group"
                  aria-label="Layout"
                >
                  <button
                    type="button"
                    onClick={() => setStaffLayoutMode("grid")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                      staffLayoutMode === "grid"
                        ? "bg-white text-violet-700 shadow-sm border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800"
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
                        ? "bg-white text-violet-700 shadow-sm border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800"
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
            {segmentActiveKey ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 text-[11px] text-violet-900">
                <span>
                  Cohort filter active — open <strong>Table</strong> to see those students.
                </span>
                <button
                  type="button"
                  onClick={() => setStudentsLayoutMode("table")}
                  className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-violet-700"
                >
                  Show table
                </button>
              </div>
            ) : null}
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
                className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 shrink-0"
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
                className="h-8 px-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 shrink-0"
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
              className="h-8 w-full pl-8 pr-7 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors placeholder:text-slate-400"
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
                filterDeptId ? "border-purple-400 bg-purple-50 text-purple-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-xl z-30 py-1 max-h-60 overflow-y-auto">
                <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filter by Department</p>
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
                      filterDeptId === d.id ? "bg-purple-50 text-purple-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {d.name}{" "}
                    <span className="text-slate-400 font-normal">({fundingTypeShortLabel(d.funding_type)})</span>
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
                    className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 border-t border-slate-100 mt-1"
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
                  {filtered.map((person) => (
                    <article
                      key={person.id}
                      className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col gap-3 hover:border-violet-200/80 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-100 shrink-0 flex items-center justify-center">
                          <User size={18} className="text-violet-600" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{person.full_name}</p>
                          <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {person.departments?.name ? (
                              <span className="inline-flex items-center gap-1.5 flex-wrap">
                                <span>{person.departments.name}</span>
                                <DepartmentFundingBadge fundingType={person.departments.funding_type} />
                              </span>
                            ) : (
                              <span className="text-slate-400">No department</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 truncate">{person.institutions?.name ?? "—"}</p>
                        </div>
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
                        className="mt-auto inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm relative border border-slate-200 rounded-lg overflow-hidden bg-white">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">#</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Department</th>
                  {role === "STUDENT" && (
                    <>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-900">Program</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-900">Year</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900">Institution</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-900 w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
                    </td>
                  </tr>
                ) : paginated.length > 0 ? (
                  paginated.map((person, i) => (
                    <tr key={person.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
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
                          <td className="px-4 py-3 text-slate-600 text-xs">{person.student_year ?? "—"}</td>
                        </>
                      )}
                      <td className="px-4 py-3 text-slate-600 text-xs">{person.institutions?.name || "N/A"}</td>
                      <td className="px-4 py-3 text-right">
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
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 text-[11px] font-medium text-slate-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={colSpan} className="px-4 py-10 text-center text-xs text-slate-400">
                      No {role === "STAFF" ? "staff" : "students"} found{search ? ` matching "${search}"` : ""}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
              </div>

          {!loading && totalPages > 1 && !(role === "STAFF" && staffLayoutMode === "grid") && (
            <div className="flex items-center justify-between mt-4 shrink-0">
              <p className="text-xs text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                      <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-slate-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
                          page === n ? "bg-purple-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
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
    </DashboardLayout>
  );
}
