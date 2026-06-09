"use client";

import { useEffect, useState, use, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { ClipboardCheck, Clock, Video, User, PlayCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { StaffDirectory } from "@/components/dashboard/StaffDirectory";
import { AddDepartmentModal } from "@/components/dashboard/AddDepartmentModal";
import { DepartmentFundingBadge } from "@/components/departments/DepartmentFundingBadge";
import { AttendanceSlideOver } from "@/components/dashboard/AttendanceSlideOver";
import { SessionSummaryModal } from "@/components/analytics/SessionSummaryModal";
import { FileText } from "lucide-react";

type College    = { id: string; name: string };
type Department = {
  id: string;
  name: string;
  institution_id: string;
  session_type?: string | null;
  funding_type?: string | null;
  color?: string | null;
  hod_id?: string | null;
};
type StaffMember = { id: string; full_name: string; email: string | null; phone?: string | null; role: string };
type Schedule   = { id: string; start_time: string; end_time: string; status?: string; subject: { name: string; color: string }; staff: { full_name: string } };

// ─── Helpers ────────────────────────────────────────────────────────────────
function toHHMM(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`;
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function secsUntil(timeStr: string, now: Date): number {
  const [h, m, s = 0] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, s, 0);
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
}

function formatCountdown(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

// ─── Waiting-for-Pulse card ──────────────────────────────────────────────────
function WaitingForPulse({ nextClass, now, formatTimeFn }: {
  nextClass: Schedule | null;
  now: Date;
  formatTimeFn: (t: string) => string;
}) {
  const secs = nextClass ? secsUntil(nextClass.start_time, now) : 0;

  if (!nextClass) {
    return (
      <div className="aura-fade-in relative overflow-hidden rounded-2xl border border-violet-100/60 dark:border-violet-800/30 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.06)_0%,_rgba(255,255,255,0.8)_70%)] dark:bg-slate-800 backdrop-blur-sm p-8 shadow-[0_1px_24px_rgba(109,40,217,0.06)] flex flex-col items-center justify-center text-center gap-3">
        <div className="relative flex items-center justify-center w-16 h-16 mb-2">
          <span className="pulse-ring-1 absolute inset-0 rounded-full bg-violet-300/20" />
          <span className="pulse-ring-2 absolute inset-0 rounded-full bg-violet-300/20" />
          <span className="pulse-ring-3 absolute inset-0 rounded-full bg-violet-300/20" />
          <span className="relative w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 border border-violet-200/60 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-300" />
          </span>
        </div>
        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.18em]">Standby</p>
        <h3 className="text-base font-bold text-slate-500">No more classes today</h3>
        <p className="text-xs text-slate-400">The department is idle. Check back tomorrow.</p>
      </div>
    );
  }

  return (
    <div className="aura-fade-in relative overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/30 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.08)_0%,_rgba(255,255,255,0.82)_65%)] dark:bg-slate-800 backdrop-blur-sm shadow-[0_2px_32px_rgba(109,40,217,0.07)]">
      {/* subtle corner glow */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-violet-300/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 p-6">

        {/* Animated pulse rings + orb */}
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
          <span className="pulse-ring-1 absolute inset-0 rounded-full bg-violet-400/15" />
          <span className="pulse-ring-2 absolute inset-0 rounded-full bg-violet-400/15" />
          <span className="pulse-ring-3 absolute inset-0 rounded-full bg-violet-400/15" />
          <span className="relative w-11 h-11 rounded-full bg-violet-100/80 dark:bg-violet-900/40 border border-violet-300/50 flex items-center justify-center shadow-inner">
            <Clock className="w-5 h-5 text-violet-500" strokeWidth={1.8} />
          </span>
        </div>

        {/* "Up Next" details */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-[9px] font-bold text-violet-400/80 uppercase tracking-[0.18em] mb-1">Up Next</p>
          <h3 className="text-xl font-bold text-slate-800 truncate">{nextClass.subject.name}</h3>
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><User size={12} className="text-slate-400" /> {nextClass.staff.full_name}</span>
            <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" /> {formatTimeFn(nextClass.start_time)}</span>
          </div>
        </div>

        {/* Live countdown */}
        <div className="text-center shrink-0 sm:border-l sm:border-violet-100 sm:pl-6">
          <p className="text-[9px] font-bold text-violet-400/80 uppercase tracking-[0.18em] mb-1">Starts in</p>
          <p className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight leading-none">
            {formatCountdown(secs)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Active Session card ─────────────────────────────────────────────────────
function ActiveSessionCard({ 
  activeClass, 
  formatTimeFn, 
  checkedInCount, 
  totalStudents 
}: { 
  activeClass: Schedule; 
  formatTimeFn: (t: string) => string;
  checkedInCount: number;
  totalStudents: number;
}) {
  return (
    <div className="aura-fade-in relative overflow-hidden bg-gradient-to-br from-emerald-900 to-teal-950 rounded-2xl p-6 shadow-lg shadow-emerald-900/20 border border-emerald-800/50">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active Session</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{activeClass.subject.name}</h2>
          <div className="flex items-center gap-4 text-emerald-100 text-xs mb-4">
            <span className="flex items-center gap-1.5"><User size={14} /> {activeClass.staff.full_name}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {formatTimeFn(activeClass.start_time)} – {formatTimeFn(activeClass.end_time)}</span>
          </div>
          
          {/* Live Attendance Counter */}
          <div className="bg-black/20 rounded-lg p-3 border border-emerald-500/20 inline-flex items-center gap-4">
            <div>
              <p className="text-[9px] text-emerald-300/80 uppercase tracking-wider mb-0.5">Live Attendance</p>
              <p className="text-lg font-bold text-white leading-none">
                {checkedInCount} <span className="text-sm text-emerald-400/60 font-medium">/ {totalStudents} Students Present</span>
              </p>
            </div>
            <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full transition-all duration-500" 
                style={{ width: `${totalStudents > 0 ? (checkedInCount / totalStudents) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        <Link
          href={`/session/${activeClass.id}`}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-emerald-900 font-bold text-sm rounded-xl hover:bg-emerald-50 hover:scale-105 transition-all shadow-lg shadow-white/10 shrink-0"
        >
          <Video size={18} /> Join Session
        </Link>
      </div>
    </div>
  );
}

type StudentMember = { id: string; full_name: string };

// ─── Page ────────────────────────────────────────────────────────────────────
export default function DepartmentPage({ params }: { params: Promise<{ id: string; dept_id: string }> }) {
  const { id: collegeId, dept_id: deptId } = use(params);

  const [college, setCollege]       = useState<College | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [students, setStudents]     = useState<StudentMember[]>([]);
  const [schedules, setSchedules]   = useState<Schedule[]>([]);
  const [loading, setLoading]       = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [justScannedId, setJustScannedId] = useState<string | null>(null);
  
  // Summary Modal State
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);

  // Tick every second for countdown precision
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [{ data: collegeData }, { data: deptData }, { data: staffData }, { data: studentData }] = await Promise.all([
      supabase.from('institutions').select('id, name').eq('id', collegeId).single(),
      supabase.from('departments').select('*').eq('id', deptId).single(),
      supabase.from('staff').select('*').eq('department_id', deptId).order('full_name'),
      supabase.from('students').select('id, full_name').eq('department_id', deptId).order('full_name'),
    ]);

    if (collegeData) setCollege(collegeData);
    if (deptData)    setDepartment(deptData);
    if (staffData)   setStaff(staffData);
    if (studentData) setStudents(studentData);

    const today = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('id, start_time, end_time, status, subject_name, staff:staff(full_name)')
      .eq('department_id', deptId)
      .eq('day_of_week', today)
      .order('start_time');

    if (scheduleData) {
      // Map the old structure to the new expected one for the UI
      const mappedSchedules = scheduleData.map(s => ({
        ...s,
        subject: { name: s.subject_name, color: '#7c3aed' }
      }));
      setSchedules(mappedSchedules as unknown as Schedule[]);
    }
    setLoading(false);
  }, [collegeId, deptId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derive active / next from currentTime (recomputed every second).
  // Using const + find() instead of let + for-loop so TypeScript's control-flow
  // analysis keeps the Schedule | null type stable inside map/filter callbacks.
  const nowStr = toHHMM(currentTime);
  const activeClass: Schedule | null = schedules.find(
    s => s.status !== 'completed' && nowStr >= s.start_time && nowStr < s.end_time,
  ) ?? null;
  const nextClass: Schedule | null = schedules.find(
    s => s.status !== 'completed' && nowStr < s.start_time,
  ) ?? null;

  // Fetch attendance for active class
  useEffect(() => {
    if (!activeClass?.id) {
      setCheckedInIds(new Set());
      return;
    }

    const supabase = createClient();
    
    // Initial fetch
    supabase.from('attendance')
      .select('student_id')
      .eq('schedule_id', activeClass.id)
      .eq('status', 'present')
      .then(({ data }) => {
        if (data) {
          setCheckedInIds(new Set(data.map(r => r.student_id)));
        }
      });

    // Realtime subscription
    const channel = supabase.channel(`attendance_${activeClass.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'attendance', filter: `schedule_id=eq.${activeClass.id}` },
        (payload) => {
          if (payload.new.status === 'present') {
            setCheckedInIds(prev => {
              const next = new Set(prev);
              next.add(payload.new.student_id);
              return next;
            });
            setJustScannedId(payload.new.student_id);
            setTimeout(() => setJustScannedId(null), 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeClass?.id]);

  const breadcrumb = (
    <>
      <Link href="/" className="hover:text-slate-900 transition-colors">Command Center</Link>
      <span className="mx-2 text-slate-300">/</span>
      <Link href={`/institutions/${collegeId}`} className="hover:text-slate-900 transition-colors">{college?.name || "College"}</Link>
      <span className="mx-2 text-slate-300">/</span>
      <span className="inline-flex items-center gap-1.5 text-slate-900 font-semibold min-w-0">
        <span className="truncate">{department?.name || "Loading..."}</span>
        {department?.name ? <DepartmentFundingBadge fundingType={department.funding_type} /> : null}
      </span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-6 pb-6 w-full h-[calc(100vh-56px)] min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

          <div className="flex items-center justify-between mb-4 shrink-0 gap-3">
            <div className="min-w-0">
              {loading ? (
                <div className="h-6 bg-slate-200 rounded w-48 animate-pulse mt-1" />
              ) : (
                <div className="flex items-center gap-2 min-w-0 mt-0.5">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{department?.name}</h1>
                  {department ? <DepartmentFundingBadge fundingType={department.funding_type} className="shrink-0" /> : null}
                  <button
                    type="button"
                    onClick={() => setDeptModalOpen(true)}
                    disabled={!department}
                    title="Edit department"
                    aria-label="Edit department"
                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <Pencil size={16} strokeWidth={2.25} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setAttendanceOpen(true)}
              className="inline-flex items-center gap-2 shrink-0 rounded-xl border border-violet-200 bg-white px-3.5 py-2 text-xs font-semibold text-violet-700 shadow-sm hover:border-violet-300 hover:bg-violet-50/80 transition-colors"
            >
              <ClipboardCheck size={15} className="text-violet-600" strokeWidth={2} />
              Attendance
            </button>
          </div>

          <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto pb-4 pr-1.5">
            {loading ? (
              <div className="flex justify-center py-20 min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : department ? (
              <div className="min-h-full grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 gap-5 lg:items-stretch lg:auto-rows-[minmax(0,1fr)]">

                {/* Left column */}
                <div className="lg:col-span-2 flex flex-col gap-5 min-h-0 lg:h-full">

                  {/* Hero card — transitions via key swap + aura-fade-in */}
                  <div className="shrink-0">
                    {activeClass
                      ? <ActiveSessionCard key="active" activeClass={activeClass} formatTimeFn={formatTime} checkedInCount={checkedInIds.size} totalStudents={students.length} />
                      : <WaitingForPulse key="idle" nextClass={nextClass} now={currentTime} formatTimeFn={formatTime} />
                    }
                  </div>

                  {/* Today's schedule — grows to fill remaining column height */}
                  <div className="bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex flex-col flex-1 min-h-[200px] lg:min-h-0 overflow-hidden">
                    <h2 className="text-sm font-semibold text-slate-900 shrink-0 px-5 pt-5 pb-3 flex items-center gap-2 border-b border-slate-100/80">
                      <Clock className="w-4 h-4 text-purple-600" /> Today's Schedule
                    </h2>

                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-3">
                      {schedules.length > 0 ? schedules.map(schedule => {
                        const isActive = schedule.id === activeClass?.id;
                        const isPast   = schedule.status === 'completed' || nowStr >= schedule.end_time;

                        return (
                          <div
                            key={schedule.id}
                            className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 ${
                              isActive ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                                       : isPast  ? 'bg-slate-50/50 border-transparent opacity-60 hover:opacity-100'
                                                 : 'bg-white border-slate-100 hover:border-violet-100'
                            }`}
                          >
                            <div className="w-24 shrink-0 text-right">
                              <p className={`text-xs font-bold ${isActive ? 'text-emerald-700' : 'text-slate-700'}`}>{formatTime(schedule.start_time)}</p>
                              <p className="text-[10px] text-slate-400">{formatTime(schedule.end_time)}</p>
                            </div>

                            <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: schedule.subject.color || '#7c3aed' }} />

                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-bold truncate ${isActive ? 'text-emerald-900' : isPast ? 'text-slate-500' : 'text-slate-800'}`}>
                                {schedule.subject.name}
                              </p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <User size={12} /> {schedule.staff.full_name}
                              </p>
                            </div>

                            {isActive && (
                              <Link href={`/session/${schedule.id}`} className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shrink-0">
                                <PlayCircle size={16} />
                              </Link>
                            )}
                            
                            {isPast && (
                              <button 
                                onClick={() => setSelectedScheduleId(schedule.id)}
                                className="p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 text-xs font-semibold"
                              >
                                <FileText size={14} />
                                <span className="hidden sm:inline">Report</span>
                              </button>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                          <p className="text-xs text-slate-500">No classes scheduled for today.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column: Staff Directory */}
                <div className="lg:col-span-1 flex flex-col min-h-[320px] lg:min-h-0 lg:h-full min-w-0">
                  <StaffDirectory
                    staff={staff}
                    departmentId={deptId}
                    institutionId={collegeId}
                    hodId={department?.hod_id}
                    onRefresh={fetchData}
                  />
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-sm">Department not found.</div>
            )}
          </div>

        </div>
      </div>
      <AttendanceSlideOver isOpen={attendanceOpen} onClose={() => setAttendanceOpen(false)} />

      <AddDepartmentModal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        tenantId={collegeId}
        onSuccess={fetchData}
        departmentToEdit={
          department
            ? {
                id: department.id,
                name: department.name,
                session_type: department.session_type ?? null,
                funding_type: department.funding_type ?? null,
                color: department.color ?? null,
              }
            : null
        }
      />

      {/* Session Summary Modal Overlay */}
      {selectedScheduleId && (
        <SessionSummaryModal
          scheduleId={selectedScheduleId}
          onClose={() => setSelectedScheduleId(null)}
        />
      )}
    </DashboardLayout>
  );
}
