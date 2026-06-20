"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ScrollableTabBar } from "@/components/layout/ScrollableTabBar";
import { useInstitution } from "@/context/InstitutionContext";
import { createClient } from "@/utils/supabase/client";
import { Plus, BookOpen, Clock, Users, BookMarked, AlertTriangle, Printer, ChevronDown, X, Wand2 } from "lucide-react";
import { AddClassModal } from "@/components/programs/AddClassModal";
import { ScheduleCalendar, type ClassEntry } from "@/components/programs/ScheduleCalendar";
import { CurrentClassWidget } from "@/components/dashboard/CurrentClassWidget";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";
import { AutoSchedulerButton } from "@/components/schedules/AutoSchedulerButton";

type Department = { id: string; name: string; institution_id: string; funding_type?: string | null };

const TAB_ACTIVE = [
  "border-violet-500 text-violet-700",
  "border-blue-500 text-blue-700",
  "border-emerald-500 text-emerald-700",
  "border-amber-500 text-amber-700",
  "border-rose-500 text-rose-700",
  "border-cyan-500 text-cyan-700",
];

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, warn }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; warn?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 bg-white rounded-lg border ${warn ? "border-amber-200 bg-amber-50" : "border-slate-200"} shadow-sm`}>
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${warn ? "bg-amber-100" : "bg-violet-50"}`}>
        <span className={warn ? "text-amber-600" : "text-violet-600"}>{icon}</span>
      </div>
      <div>
        <p className={`text-base font-bold leading-tight ${warn ? "text-amber-700" : "text-slate-900"}`}>{value}</p>
        <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
        {sub && <p className={`text-[10px] mt-0.5 ${warn ? "text-amber-600" : "text-slate-400"}`}>{sub}</p>}
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  const { institutions: tenants, selectedId: selectedTenantId } = useInstitution();
  const [allDepts, setAllDepts] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLivePanelOpen, setIsLivePanelOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<{ day?: string; startTime?: string }>({});
  const [, setEditingClass] = useState<ClassEntry | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const [{ data: dData }, { data: sData }] = await Promise.all([
      supabase.from("departments").select("id, name, institution_id, funding_type").order("name"),
      supabase.from("schedules")
        .select("id, day_of_week, start_time, end_time, department_id, subject_name, staff_id, tenant_id, staff(full_name)")
        .order("start_time"),
    ]);
    if (dData) setAllDepts(dData as Department[]);
    if (sData) setClasses(sData as unknown as ClassEntry[]);
    setLoading(false);
  }, []);

  const fetchClasses = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("schedules")
      .select("id, day_of_week, start_time, end_time, department_id, subject_name, staff_id, tenant_id, staff(full_name)")
      .order("start_time");
    if (data) setClasses(data as unknown as ClassEntry[]);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const departments = useMemo(
    () => selectedTenantId ? allDepts.filter(d => d.institution_id === selectedTenantId) : allDepts,
    [allDepts, selectedTenantId]
  );

  // Reset selected dept when institution changes
  useEffect(() => {
    setSelectedDeptId(departments[0]?.id || "");
  }, [selectedTenantId]);

  // Classes for the selected institution
  const institutionClasses = useMemo(
    () => selectedTenantId ? classes.filter(c => c.tenant_id === selectedTenantId) : classes,
    [classes, selectedTenantId]
  );

  // Classes for selected department
  const deptClasses = useMemo(
    () => selectedDeptId ? institutionClasses.filter(c => c.department_id === selectedDeptId) : institutionClasses,
    [institutionClasses, selectedDeptId]
  );

  // Apply staff filter on top
  const filteredClasses = useMemo(
    () => staffFilter ? deptClasses.filter(c => c.staff_id === staffFilter) : deptClasses,
    [deptClasses, staffFilter]
  );

  // Unique staff for filter dropdown (from institution's classes)
  const staffList = useMemo(() => {
    const seen = new Map<string, string>();
    institutionClasses.forEach(c => {
      if (c.staff_id && !seen.has(c.staff_id))
        seen.set(c.staff_id, (c.staff as { full_name?: string } | null)?.full_name ?? "Unknown");
    });
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [institutionClasses]);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalClasses = deptClasses.length;

  const teachingHours = useMemo(() =>
    deptClasses.reduce((sum, c) => {
      const sh = parseInt(c.start_time), eh = parseInt(c.end_time);
      return sum + (eh - sh);
    }, 0),
    [deptClasses]
  );

  const activeStaffCount = useMemo(() =>
    new Set(deptClasses.map(c => c.staff_id)).size,
    [deptClasses]
  );

  const subjectCount = useMemo(() =>
    new Set(deptClasses.map(c => c.subject_name)).size,
    [deptClasses]
  );

  // Conflict detection: same staff, same day, overlapping times → count UNIQUE STAFF affected
  const conflictingStaff = useMemo(() => {
    const affectedStaff = new Map<string, string>(); // staffId → name
    const byStaffDay: Record<string, ClassEntry[]> = {};
    institutionClasses.forEach(c => {
      const key = `${c.staff_id}__${c.day_of_week}`;
      if (!byStaffDay[key]) byStaffDay[key] = [];
      byStaffDay[key].push(c);
    });
    Object.values(byStaffDay).forEach(entries => {
      entries.sort((a, b) => a.start_time.localeCompare(b.start_time));
      for (let i = 0; i < entries.length - 1; i++) {
        if (entries[i].end_time > entries[i + 1].start_time) {
          const id = entries[i].staff_id;
          const name = (entries[i].staff as { full_name?: string } | null)?.full_name ?? "Unknown";
          affectedStaff.set(id, name);
        }
      }
    });
    return affectedStaff;
  }, [institutionClasses]);

  const conflictCount = conflictingStaff.size;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openAddModal = (day?: string, hour?: number) => {
    setEditingClass(null);
    setModalDefaults({ day, startTime: hour !== undefined ? `${String(hour).padStart(2, "0")}:00` : undefined });
    setIsModalOpen(true);
  };
  const openEditModal = (cls: ClassEntry) => {
    setEditingClass(cls);
    setModalDefaults({ day: cls.day_of_week, startTime: cls.start_time });
    setIsModalOpen(true);
  };

  const handlePrint = () => window.print();

  const selectedDept = departments.find(d => d.id === selectedDeptId);
  const activeStaffName = staffList.find(s => s.id === staffFilter)?.name;

  return (
    <DashboardLayout>
      <div className="relative flex h-[calc(100vh-56px)] min-h-0 min-w-0 max-w-full flex-col overflow-hidden px-6 pt-6 pb-6">

        {/* ── Page Header ── */}
        <div className="mb-2 flex min-w-0 shrink-0 flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Schedules Planner</h1>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {/* AI Auto Scheduler Button */}
            <button
              onClick={() => setIsAiPanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold rounded-md hover:bg-violet-100 transition-colors shadow-sm"
            >
              <Wand2 size={13} />
              AI Auto Scheduler
            </button>

            {/* Live Sessions Button */}
            <button
              onClick={() => setIsLivePanelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-md hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              LIVE SESSIONS
            </button>

            {/* Print */}
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-md hover:bg-slate-50 transition-colors">
              <Printer size={13} /> Print
            </button>

            {/* Add Class */}
            <button onClick={() => openAddModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-md hover:bg-violet-700 transition-colors border border-violet-700 shadow-sm">
              <Plus size={14} strokeWidth={2.5} /> Add Class
            </button>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 lg:flex-row">
          {/* ── Calendar ── */}
          <div className="flex-1 flex flex-col min-w-0 pb-2 min-h-0">
            <div className="mb-3 shrink-0 min-w-0 w-full border-b border-slate-200">
              <ScrollableTabBar
                grow={false}
                innerClassName="items-stretch gap-0"
                trailing={
                  <div className="flex flex-shrink-0 items-center gap-2 border-l border-slate-200 bg-white py-1.5 pl-3 pr-1">
                    {conflictCount > 0 && (
                      <div
                        title={`${Array.from(conflictingStaff.values()).join(", ")} double-booked`}
                        className="flex cursor-default items-center gap-1 whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700"
                      >
                        <AlertTriangle size={11} className="text-amber-500" />
                        {conflictCount} conflict{conflictCount > 1 ? "s" : ""}
                      </div>
                    )}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setStaffDropdownOpen((v) => !v)}
                        className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${staffFilter ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
                      >
                        <Users size={11} />
                        {activeStaffName ?? "All Staff"}
                        {staffFilter ? (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setStaffFilter("");
                            }}
                            className="ml-0.5 font-bold opacity-60 hover:opacity-100"
                          >
                            ×
                          </span>
                        ) : (
                          <ChevronDown size={10} className="ml-0.5 opacity-50" />
                        )}
                      </button>
                      {staffDropdownOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1 max-h-56 w-52 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-xl">
                          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Filter by Staff</p>
                          {staffList.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setStaffFilter(s.id);
                                setStaffDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${staffFilter === s.id ? "bg-violet-50 font-medium text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}
                            >
                              {s.name}
                            </button>
                          ))}
                          {staffList.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No staff assigned yet.</p>}
                          {staffFilter && (
                            <button
                              type="button"
                              onClick={() => {
                                setStaffFilter("");
                                setStaffDropdownOpen(false);
                              }}
                              className="mt-1 w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs text-red-500 hover:bg-red-50"
                            >
                              Clear filter
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                }
              >
                {departments.map((dept, i) => {
                  const isActive = selectedDeptId === dept.id;
                  const classCount = institutionClasses.filter((c) => c.department_id === dept.id).length;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDeptId(dept.id)}
                      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-5 py-2.5 text-xs font-medium transition-all ${
                        isActive
                          ? `${TAB_ACTIVE[i % TAB_ACTIVE.length]} -mb-px`
                          : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                      }`}
                    >
                      <span>{dept.name}</span>
                      <DepartmentFundingBadge fundingType={dept.funding_type} className="shrink-0" />
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold ${isActive ? "bg-current/10" : "bg-slate-100 text-slate-400"}`}
                      >
                        {classCount}
                      </span>
                    </button>
                  );
                })}
              </ScrollableTabBar>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center flex-1 h-full">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                  <BookOpen size={22} className="text-violet-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No classes scheduled</p>
                <p className="text-xs text-slate-400 mt-1">
                  {staffFilter
                    ? `${activeStaffName} has no classes in ${selectedDept?.name ?? "this department"}.`
                    : selectedDept
                    ? `${selectedDept.name} has no classes yet.`
                    : "Select a department."}{" "}
                  {!staffFilter && <button onClick={() => openAddModal()} className="text-violet-600 underline underline-offset-2">Add one →</button>}
                </p>
              </div>
            ) : (
              <ScheduleCalendar
                classes={filteredClasses}
                allInstitutionClasses={institutionClasses}
                onRefresh={fetchClasses}
                onAddSlot={(day, hour) => openAddModal(day, hour)}
                onEdit={openEditModal}
              />
            )}
          </div>

          {/* ── KPI Cards (Right Side Stack) ── */}
          {!loading && (
            <div className="w-full lg:w-56 shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-2">
              {conflictCount > 0 && (
                <KpiCard
                  icon={<AlertTriangle size={16} />}
                  label="Staff Double-Booked"
                  value={conflictCount}
                  sub={Array.from(conflictingStaff.values()).slice(0, 2).join(", ") + (conflictCount > 2 ? ", ..." : "")}
                  warn
                />
              )}
              <KpiCard icon={<BookMarked size={16} />} label="Classes / Week" value={totalClasses} sub={`in ${selectedDept?.name ?? "this dept"}`} />
              <KpiCard icon={<Clock size={16} />} label="Teaching Hours" value={`${teachingHours}h`} sub="total this week" />
              <KpiCard icon={<Users size={16} />} label="Active Staff" value={activeStaffCount} sub="teaching this dept" />
              <KpiCard icon={<BookOpen size={16} />} label="Courses" value={subjectCount} sub="unique this dept" />
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Panel for Live Sessions */}
      {isLivePanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-all">
          <div className="w-full max-w-sm bg-slate-50 h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Live Sessions
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {tenants.find(t => t.id === selectedTenantId)?.name}
                </p>
              </div>
              <button 
                onClick={() => setIsLivePanelOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <CurrentClassWidget tenantId={selectedTenantId} />
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Panel for AI Auto Scheduler */}
      {isAiPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm transition-all">
          <div className="w-full max-w-sm bg-slate-50 h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 text-violet-600 shrink-0">
                    <Wand2 size={15} />
                  </span>
                  AI Auto-Scheduler
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Generates a conflict-free weekly timetable
                </p>
              </div>
              <button
                onClick={() => setIsAiPanelOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <AutoSchedulerButton tenantId={selectedTenantId} onPublished={fetchClasses} />
            </div>
          </div>
        </div>
      )}

      <AddClassModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingClass(null); }}
        onSuccess={fetchClasses}
        defaultDepartmentId={selectedDeptId}
        defaultDay={modalDefaults.day}
        defaultStartTime={modalDefaults.startTime}
        tenantId={selectedTenantId}
      />
    </DashboardLayout>
  );
}