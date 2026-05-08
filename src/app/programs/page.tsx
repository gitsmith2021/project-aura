"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import {
  Plus, ChevronLeft, ChevronRight, BookOpen,
  Building2, Clock, Users, BookMarked, AlertTriangle, Printer, ChevronDown, X,
} from "lucide-react";
import { AddClassModal } from "@/components/programs/AddClassModal";
import { ScheduleCalendar, type ClassEntry } from "@/components/programs/ScheduleCalendar";
import { CurrentClassWidget } from "@/components/dashboard/CurrentClassWidget";

type Tenant = { id: string; name: string };
type Department = { id: string; name: string; tenant_id: string };

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

export default function ProgramsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [allDepts, setAllDepts] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [staffFilter, setStaffFilter] = useState("");
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLivePanelOpen, setIsLivePanelOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<{ day?: string; startTime?: string }>({});
  const [editingClass, setEditingClass] = useState<ClassEntry | null>(null);

  const tabsRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const masterTabsRef = useRef<HTMLDivElement>(null);
  const [showMasterLeft, setShowMasterLeft] = useState(false);
  const [showMasterRight, setShowMasterRight] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    const [{ data: tData }, { data: dData }, { data: sData }] = await Promise.all([
      supabase.from("tenants").select("id, name").order("name"),
      supabase.from("departments").select("id, name, tenant_id").order("name"),
      supabase.from("schedules")
        .select("id, day_of_week, start_time, end_time, department_id, subject_name, staff_id, tenant_id, profiles(full_name)")
        .order("start_time"),
    ]);
    if (tData?.length) { setTenants(tData); setSelectedTenantId(p => p || tData[0].id); }
    if (dData) setAllDepts(dData as Department[]);
    if (sData) setClasses(sData as unknown as ClassEntry[]);
    setLoading(false);
  }, []);

  const fetchClasses = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("schedules")
      .select("id, day_of_week, start_time, end_time, department_id, subject_name, staff_id, tenant_id, profiles(full_name)")
      .order("start_time");
    if (data) setClasses(data as unknown as ClassEntry[]);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const departments = useMemo(
    () => selectedTenantId ? allDepts.filter(d => d.tenant_id === selectedTenantId) : allDepts,
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
        seen.set(c.staff_id, (c.profiles as any)?.full_name ?? "Unknown");
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
          const name = (entries[i].profiles as any)?.full_name ?? "Unknown";
          affectedStaff.set(id, name);
        }
      }
    });
    return affectedStaff;
  }, [institutionClasses]);

  const conflictCount = conflictingStaff.size;

  // ── Tab scroll ─────────────────────────────────────────────────────────────
  const checkScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const checkMasterScroll = useCallback(() => {
    const el = masterTabsRef.current;
    if (!el) return;
    setShowMasterLeft(el.scrollLeft > 4);
    setShowMasterRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tabsRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => { el?.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [departments, checkScroll]);

  useEffect(() => {
    checkMasterScroll();
    const el = masterTabsRef.current;
    el?.addEventListener("scroll", checkMasterScroll);
    window.addEventListener("resize", checkMasterScroll);
    return () => { el?.removeEventListener("scroll", checkMasterScroll); window.removeEventListener("resize", checkMasterScroll); };
  }, [tenants, checkMasterScroll]);

  const scrollTabs = (dir: "left" | "right") =>
    tabsRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });

  const scrollMasterTabs = (dir: "left" | "right") =>
    masterTabsRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });

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
      <div className="px-6 pt-3 pb-2 w-full relative flex flex-col h-[calc(100vh-56px)] overflow-hidden">

        {/* Master Tabs for Institutions */}
        <div className="relative flex items-stretch border-b border-slate-200 mb-4 shrink-0">
          {/* Left scroll arrow */}
          {showMasterLeft && (
            <button onClick={() => scrollMasterTabs("left")}
              className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent">
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <ChevronLeft size={12} className="text-slate-600" />
              </div>
            </button>
          )}

          <div ref={masterTabsRef} className="flex overflow-x-auto flex-1 custom-scrollbar" style={{ scrollbarWidth: "none" }}>
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTenantId(t.id)}
                className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  selectedTenantId === t.id
                    ? "border-violet-600 text-violet-700 bg-violet-50/50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Right scroll arrow */}
          {showMasterRight && (
            <button onClick={() => scrollMasterTabs("right")}
              className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-3 bg-gradient-to-l from-slate-50/90 to-transparent">
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <ChevronRight size={12} className="text-slate-600" />
              </div>
            </button>
          )}
        </div>

        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Programs &amp; Schedules</h1>
          </div>

          <div className="flex items-center gap-2">
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

        {/* ── Tabs + Staff Filter (single row) ── */}
        <div className="relative flex items-stretch border-b border-slate-200 mb-4 shrink-0">
          {/* Left scroll arrow */}
          {showLeft && (
            <button onClick={() => scrollTabs("left")}
              className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-3 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent">
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <ChevronLeft size={12} className="text-slate-600" />
              </div>
            </button>
          )}

          {/* Scrollable department tabs */}
          <div ref={tabsRef} className="flex overflow-x-auto flex-1" style={{ scrollbarWidth: "none" }}>
            {departments.map((dept, i) => {
              const isActive = selectedDeptId === dept.id;
              const classCount = institutionClasses.filter(c => c.department_id === dept.id).length;
              return (
                <button key={dept.id} onClick={() => setSelectedDeptId(dept.id)}
                  className={`flex-shrink-0 px-5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${isActive ? `${TAB_ACTIVE[i % TAB_ACTIVE.length]} -mb-px` : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}`}>
                  {dept.name}
                  <span className={`px-1.5 py-px rounded-full text-[10px] font-semibold ${isActive ? "bg-current/10" : "bg-slate-100 text-slate-400"}`}>
                    {classCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right scroll arrow */}
          {showRight && (
            <button onClick={() => scrollTabs("right")}
              className="absolute right-[120px] top-0 bottom-0 z-10 flex items-center pl-3 bg-gradient-to-l from-slate-50/90 to-transparent">
              <div className="w-5 h-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                <ChevronRight size={12} className="text-slate-600" />
              </div>
            </button>
          )}

          {/* Right side: Staff filter + optional conflict badge */}
          <div className="flex items-center gap-2 pl-3 pr-1 py-1.5 border-l border-slate-200 bg-white flex-shrink-0">
            {/* Conflict badge (compact) */}
            {conflictCount > 0 && (
              <div title={`${Array.from(conflictingStaff.values()).join(", ")} double-booked`}
                className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[10px] font-semibold text-amber-700 cursor-default whitespace-nowrap">
                <AlertTriangle size={11} className="text-amber-500" />
                {conflictCount} conflict{conflictCount > 1 ? "s" : ""}
              </div>
            )}

            {/* Staff filter pill */}
            <div className="relative">
              <button
                onClick={() => setStaffDropdownOpen(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 border rounded text-[11px] font-medium transition-colors whitespace-nowrap ${staffFilter ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}
              >
                <Users size={11} />
                {activeStaffName ?? "All Staff"}
                {staffFilter
                  ? <span onClick={e => { e.stopPropagation(); setStaffFilter(""); }} className="ml-0.5 font-bold opacity-60 hover:opacity-100">×</span>
                  : <ChevronDown size={10} className="opacity-50 ml-0.5" />
                }
              </button>
              {staffDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-md shadow-xl z-40 py-1 max-h-56 overflow-y-auto">
                  <p className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filter by Staff</p>
                  {staffList.map(s => (
                    <button key={s.id} onClick={() => { setStaffFilter(s.id); setStaffDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${staffFilter === s.id ? "bg-violet-50 text-violet-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                      {s.name}
                    </button>
                  ))}
                  {staffList.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No staff assigned yet.</p>}
                  {staffFilter && (
                    <button onClick={() => { setStaffFilter(""); setStaffDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 border-t border-slate-100 mt-1">
                      Clear filter
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-6">
          {/* ── Calendar ── */}
          <div className="flex-1 flex flex-col min-w-0 pb-2 min-h-0">
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