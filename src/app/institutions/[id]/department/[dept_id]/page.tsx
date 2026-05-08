"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Clock, Video, User, PlayCircle, Terminal, X, CheckCircle2, Wifi } from "lucide-react";
import Link from "next/link";
import { StaffDirectory } from "@/components/dashboard/StaffDirectory";
import { SessionSummaryModal } from "@/components/analytics/SessionSummaryModal";
import { FileText } from "lucide-react";

// ─── Web Audio success chime ─────────────────────────────────────────────────
function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [
      { freq: 783.99, start: 0,    dur: 0.12 }, // G5
      { freq: 987.77, start: 0.09, dur: 0.14 }, // B5
      { freq: 1318.5, start: 0.18, dur: 0.22 }, // E6
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch { /* unsupported */ }
}

// ─── Tap Card Button ─────────────────────────────────────────────────────────
type TapState = 'idle' | 'scanning' | 'success';
type Ripple   = { id: number; x: number; y: number };

function TapCardButton({ studentId, scheduleId, tenantId, isCheckedIn, justScanned }: {
  studentId: string;
  scheduleId: string;
  tenantId: string;
  isCheckedIn: boolean;
  justScanned: boolean;
}) {
  const [status, setStatus] = useState<TapState>(isCheckedIn ? 'success' : 'idle');
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Sync if realtime marks this student as checked-in before they tap locally
  useEffect(() => {
    if (isCheckedIn && status === 'idle') setStatus('success');
  }, [isCheckedIn]);

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn  = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const id   = Date.now();
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (status !== 'idle') return;
    addRipple(e);
    setStatus('scanning');
    try {
      await fetch('/api/attendance/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, schedule_id: scheduleId, tenant_id: tenantId }),
      });
      playSuccessChime();
      setStatus('success');
    } catch {
      setStatus('idle'); // roll back on error
    }
  };

  if (status === 'success') {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-500 select-none ${
        justScanned
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
          : 'bg-emerald-100 text-emerald-700'
      }`}>
        <CheckCircle2 size={12} />
        {justScanned ? 'Just Scanned!' : 'Present'}
      </div>
    );
  }

  return (
    <button
      ref={btnRef}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={handleClick}
      disabled={status === 'scanning'}
      className={`relative overflow-hidden px-3 py-1.5 text-[10px] font-bold rounded-lg border select-none transition-all duration-150
        ${status === 'scanning'
          ? 'border-slate-300 bg-slate-50 text-slate-400 cursor-wait'
          : 'border-slate-300 bg-white text-slate-700 hover:border-purple-400 hover:text-purple-700 hover:bg-purple-50/40 hover:shadow-sm'
        }
        ${pressed ? 'scale-95' : 'scale-100'}
      `}
    >
      {/* Ripple layer */}
      {ripples.map(r => (
        <span key={r.id} className="ripple-effect" style={{ left: r.x, top: r.y }} />
      ))}
      {status === 'scanning' ? (
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          Scanning…
        </span>
      ) : (
        <span className="flex items-center gap-1.5"><Wifi size={11} /> Tap Card</span>
      )}
    </button>
  );
}

type College    = { id: string; name: string };
type Department = { id: string; name: string; tenant_id: string };
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
      <div className="aura-fade-in relative overflow-hidden rounded-2xl border border-violet-100/60 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.06)_0%,_rgba(255,255,255,0.8)_70%)] backdrop-blur-sm p-8 shadow-[0_1px_24px_rgba(109,40,217,0.06)] flex flex-col items-center justify-center text-center gap-3">
        <div className="relative flex items-center justify-center w-16 h-16 mb-2">
          <span className="pulse-ring-1 absolute inset-0 rounded-full bg-violet-300/20" />
          <span className="pulse-ring-2 absolute inset-0 rounded-full bg-violet-300/20" />
          <span className="pulse-ring-3 absolute inset-0 rounded-full bg-violet-300/20" />
          <span className="relative w-8 h-8 rounded-full bg-violet-100 border border-violet-200/60 flex items-center justify-center">
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
    <div className="aura-fade-in relative overflow-hidden rounded-2xl border border-violet-200/50 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,0.08)_0%,_rgba(255,255,255,0.82)_65%)] backdrop-blur-sm shadow-[0_2px_32px_rgba(109,40,217,0.07)]">
      {/* subtle corner glow */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-violet-300/10 blur-3xl" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 p-6">

        {/* Animated pulse rings + orb */}
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
          <span className="pulse-ring-1 absolute inset-0 rounded-full bg-violet-400/15" />
          <span className="pulse-ring-2 absolute inset-0 rounded-full bg-violet-400/15" />
          <span className="pulse-ring-3 absolute inset-0 rounded-full bg-violet-400/15" />
          <span className="relative w-11 h-11 rounded-full bg-violet-100/80 border border-violet-300/50 flex items-center justify-center shadow-inner">
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
  
  // Hardware Bridge State
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [justScannedId, setJustScannedId] = useState<string | null>(null);
  
  // Summary Modal State
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // Tick every second for countdown precision
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [{ data: collegeData }, { data: deptData }, { data: staffData }, { data: studentData }] = await Promise.all([
      supabase.from('tenants').select('id, name').eq('id', collegeId).single(),
      supabase.from('departments').select('*').eq('id', deptId).single(),
      supabase.from('profiles').select('*').eq('department_id', deptId).eq('role', 'STAFF').order('full_name'),
      supabase.from('profiles').select('id, full_name').eq('department_id', deptId).eq('role', 'STUDENT').order('full_name'),
    ]);

    if (collegeData) setCollege(collegeData);
    if (deptData)    setDepartment(deptData);
    if (staffData)   setStaff(staffData);
    if (studentData) setStudents(studentData);

    const today = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
    const { data: scheduleData } = await supabase
      .from('schedules')
      .select('id, start_time, end_time, status, subject_name, staff:profiles(full_name)')
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

  // Derive active / next from currentTime (recomputed every second)
  const nowStr = toHHMM(currentTime);
  let activeClass: Schedule | null = null;
  let nextClass:   Schedule | null = null;
  for (const s of schedules) {
    if (s.status !== 'completed' && nowStr >= s.start_time && nowStr < s.end_time) { activeClass = s; }
    else if (s.status !== 'completed' && nowStr < s.start_time && !nextClass)       { nextClass = s; }
  }

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
      <span className="text-slate-900 font-semibold">{department?.name || "Loading..."}</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-5 pt-4 pb-2 w-full h-[calc(100vh-56px)] flex flex-col overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">

          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <Link href={`/institutions/${collegeId}`} className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-purple-600 mb-1 transition-colors uppercase tracking-wider font-semibold">
                <ArrowLeft size={12} /> Back to {college?.name || "College"}
              </Link>
              {loading
                ? <div className="h-6 bg-slate-200 rounded w-48 animate-pulse mt-1" />
                : <h1 className="text-xl font-bold text-slate-900 tracking-tight">{department?.name}</h1>
              }
            </div>
            
            <button
              onClick={() => setIsDevToolsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors shrink-0 shadow-sm"
            >
              <Terminal size={13} strokeWidth={2.5} /> Dev Tools
            </button>
          </div>

          <div className="custom-scrollbar flex-1 pb-4 pr-1.5 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : department ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Left column */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                  {/* Hero card — transitions via key swap + aura-fade-in */}
                  {activeClass
                    ? <ActiveSessionCard key="active" activeClass={activeClass} formatTimeFn={formatTime} checkedInCount={checkedInIds.size} totalStudents={students.length} />
                    : <WaitingForPulse key="idle" nextClass={nextClass} now={currentTime} formatTimeFn={formatTime} />
                  }

                  {/* Today's schedule */}
                  <div className="bg-white/75 backdrop-blur-sm rounded-xl border border-slate-100/90 p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-600" /> Today's Schedule
                    </h2>

                    <div className="space-y-3">
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
                <div className="lg:col-span-1 h-[600px] lg:h-auto">
                  <StaffDirectory staff={staff} />
                </div>

              </div>
            ) : (
              <div className="text-center py-20 text-slate-500 text-sm">Department not found.</div>
            )}
          </div>

        </div>
      </div>
      {/* Dev Tools Drawer */}
      {isDevToolsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setIsDevToolsOpen(false)} />
          <div className="relative w-80 bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Terminal size={16} className="text-purple-600" /> Hardware Simulator</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Simulate ESP32 RFID taps</p>
              </div>
              <button onClick={() => setIsDevToolsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {!activeClass ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="text-slate-400 w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">No Active Session</p>
                  <p className="text-xs text-slate-500 mt-1">Wait for a class to start before simulating attendance.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Target Session</p>
                    <p className="text-sm font-bold text-emerald-900">{activeClass.subject.name}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">{activeClass.id}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-900">Student Roster</p>
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        {checkedInIds.size} / {students.length} in
                      </span>
                    </div>
                    <div className="space-y-2">
                      {students.map(student => {
                        const isCheckedIn  = checkedInIds.has(student.id);
                        const justScanned  = justScannedId === student.id;
                        return (
                          <div
                            key={student.id}
                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors duration-300 ${
                              justScanned
                                ? 'scan-highlight border-emerald-300'
                                : isCheckedIn
                                  ? 'bg-slate-50/80 border-slate-200'
                                  : 'bg-white border-slate-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-3">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors duration-300 ${
                                isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {student.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-semibold truncate transition-colors ${isCheckedIn ? 'text-slate-500' : 'text-slate-800'}`}>{student.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-mono">…{student.id.split('-')[0]}</p>
                              </div>
                            </div>
                            <TapCardButton
                              studentId={student.id}
                              scheduleId={activeClass.id}
                              tenantId={collegeId}
                              isCheckedIn={isCheckedIn}
                              justScanned={justScanned}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
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
