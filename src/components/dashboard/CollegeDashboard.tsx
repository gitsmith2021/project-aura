"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Users, BookOpen, GraduationCap, CalendarCheck, Clock, CheckCircle2,
  XCircle, AlertCircle, ChevronLeft, ChevronRight, FileText, Building2,
  ThumbsUp, ThumbsDown, User,
  type LucideIcon,
} from "lucide-react";
import { getDeptColor } from "@/lib/deptColors";
import { fundingTypeShortLabel } from "@/lib/deptFunding";
import { reviewLeaveRequest } from "@/actions/staffPortal";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
type CollegeProps = {
  id: string;
  name: string;
  studentsCount: number;
  staffCount: number;
  departmentsCount: number;
};

type Department = {
  id: string;
  name: string;
  studentsCount: number;
  staffCount: number;
  color: string | null;
  funding_type: string | null;
};

type StaffRecord = {
  id: string;
  full_name: string;
  status: "present" | "absent" | "on_leave";
};

type LeaveRequest = {
  id: string;
  leave_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  staff: { full_name: string; id: string } | null;
};

type Session = {
  id: string;
  subject_name: string;
  start_time: string;
  end_time: string;
  status: string | null;
  staff: { full_name: string } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: Date) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const AURA_COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: LucideIcon; label: string; value: number | string;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-slate-700">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill || p.color }} />
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Staff Attendance Card ─────────────────────────────────────────────────────
function StaffAttendanceCard({ tenantId }: { tenantId: string }) {
  const [date, setDate] = useState(new Date());
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const dateStr = formatDate(date);

    // Fetch all staff for this tenant
    const { data: staffList } = await supabase
      .from("staff")
      .select("id, full_name")
      .eq("institution_id", tenantId)
      .order("full_name");

    if (!staffList) { setLoading(false); return; }

    // Fetch attendance records for the date
    const { data: attendanceRecords } = await supabase
      .from("staff_attendance")
      .select("staff_id, status")
      .eq("institution_id", tenantId)
      .eq("date", dateStr);

    const map: Record<string, "present" | "absent" | "on_leave"> = {};
    (attendanceRecords ?? []).forEach((r: any) => { map[r.staff_id] = r.status; });

    const merged: StaffRecord[] = staffList.map(s => ({
      id: s.id,
      full_name: s.full_name,
      status: map[s.id] ?? "absent",
    }));

    setStaff(merged);
    setLoading(false);
  }, [tenantId, date]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const presentCount  = staff.filter(s => s.status === "present").length;
  const onLeaveCount  = staff.filter(s => s.status === "on_leave").length;
  const absentCount   = staff.filter(s => s.status === "absent").length;

  const isToday = formatDate(date) === formatDate(new Date());
  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    if (d <= new Date()) setDate(d);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <CalendarCheck size={14} className="text-violet-600" />
          Staff Attendance
        </h3>
        {/* Date Navigator */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => shiftDate(-1)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] font-semibold text-slate-700 min-w-[90px] text-center">
            {isToday ? "Today" : formatDisplayDate(date)}
          </span>
          <button
            onClick={() => shiftDate(1)}
            disabled={isToday}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Present</p>
          <p className="text-lg font-bold text-slate-900">{presentCount}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">On Leave</p>
          <p className="text-lg font-bold text-slate-900">{onLeaveCount}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Absent</p>
          <p className="text-lg font-bold text-slate-900">{absentCount}</p>
        </div>
      </div>

      {/* Staff list */}
      <div className="flex-1 overflow-y-auto max-h-40 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
          </div>
        ) : staff.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-5">No staff records found.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {staff.map(s => (
              <div key={s.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                    {s.full_name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                  </div>
                  <span className="text-xs font-medium text-slate-700 truncate">{s.full_name}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  s.status === "present"  ? "bg-emerald-100 text-emerald-700" :
                  s.status === "on_leave" ? "bg-amber-100 text-amber-700"    :
                                            "bg-red-50 text-red-600"
                }`}>
                  {s.status === "on_leave" ? "On Leave" : s.status === "present" ? "Present" : "Absent"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Action Required Card ──────────────────────────────────────────────────────
function ActionRequiredCard({ tenantId }: { tenantId: string }) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("leave_requests")
      .select("id, leave_date, reason, status, staff:staff(full_name, id)")
      .eq("institution_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(10);

    setRequests((data ?? []) as unknown as LeaveRequest[]);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (id: string, newStatus: "approved" | "rejected") => {
    setActionLoading(id);
    // Server Action (not a direct client update) so reviewer identity and
    // before/after state land in the audit trail — Dev Rule 13.
    const result = await reviewLeaveRequest(id, tenantId, { status: newStatus });
    if (result.success) {
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    }
    setActionLoading(null);
  };

  const pending = requests.filter(r => r.status === "pending");
  const resolved = requests.filter(r => r.status !== "pending");

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <AlertCircle size={14} className="text-amber-500" />
          Action Required
          {pending.length > 0 && (
            <span className="ml-1 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {pending.length}
            </span>
          )}
        </h3>
        <span className="text-[10px] text-slate-400">Leave Requests</span>
      </div>

      <div className="flex-1 overflow-y-auto max-h-40 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-5 gap-2 text-slate-400">
            <CheckCircle2 size={24} className="text-emerald-400" />
            <p className="text-xs font-medium text-slate-500">No pending leave requests</p>
            <p className="text-[10px] text-slate-400">All clear!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {pending.map(req => (
              <div key={req.id} className="px-4 py-2 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                      {req.staff?.full_name?.split(" ").map(n => n[0]).join("").substring(0, 2) || "??"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{req.staff?.full_name || "Staff"}</p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(req.leave_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {req.reason && <span className="ml-1 text-slate-400">· {req.reason}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAction(req.id, "approved")}
                      disabled={actionLoading === req.id}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      <ThumbsUp size={10} /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "rejected")}
                      disabled={actionLoading === req.id}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-bold transition-colors"
                    >
                      <ThumbsDown size={10} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {resolved.length > 0 && (
              <div className="px-4 pt-2 pb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Resolved</p>
                {resolved.map(req => (
                  <div key={req.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={12} className="text-slate-300 shrink-0" />
                      <span className="text-[11px] text-slate-500 truncate">{req.staff?.full_name}</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      req.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}>
                      {req.status === "approved" ? "Approved" : "Rejected"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main CollegeDashboard ─────────────────────────────────────────────────────
export function CollegeDashboard({
  college,
  onViewReport,
}: {
  college: CollegeProps;
  onViewReport: (id: string) => void;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchCollegeData = async () => {
      setDataLoading(true);
      const supabase = createClient();
      const today = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];

      const [{ data: depts }, { data: sessionsData }] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name, color, funding_type, students:students!department_id(count), staff:staff!department_id(count)")
          .eq("institution_id", college.id),
        supabase
          .from("schedules")
          // schedules still uses the legacy tenant_id column — filtering on
          // institution_id made PostgREST reject the query, so today's
          // sessions list always rendered empty
          .select("id, subject_name, start_time, end_time, status, staff:staff(full_name)")
          .eq("tenant_id", college.id)
          .eq("day_of_week", today)
          .order("start_time"),
      ]);

      if (depts) {
        setDepartments(depts.map((d: any) => ({
          id: d.id,
          name: d.name,
          color: d.color ?? 'violet',
          funding_type: d.funding_type ?? 'AIDED',
          studentsCount: d.students?.[0]?.count || 0,
          staffCount:    d.staff?.[0]?.count    || 0,
        })));
      }
      if (sessionsData) setSessions(sessionsData as unknown as Session[]);
      setDataLoading(false);
    };

    fetchCollegeData();
  }, [college.id]);

  // Compute active sessions
  const now = new Date();
  const nowStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:00`;
  const activeSessions = sessions.filter(s => s.status !== "completed" && nowStr >= s.start_time && nowStr < s.end_time);
  const completedSessions = sessions.filter(s => s.status === "completed");

  // Chart data
  const deptBarData = [...departments]
    .sort((a, b) => b.studentsCount - a.studentsCount)
    .map(d => {
      const short = d.name.length > 12 ? d.name.substring(0, 12) + "…" : d.name;
      const tag = fundingTypeShortLabel(d.funding_type);
      return {
        name: `${short} · ${tag}`,
        Students: d.studentsCount,
        Staff: d.staffCount,
        color: getDeptColor(d.color).hex,
        staffColor: getDeptColor(d.color).bg2,
      };
    });

  const ratioData = [
    { name: "Students", value: college.studentsCount },
    { name: "Staff",    value: college.staffCount },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto custom-scrollbar px-6 pt-6 pb-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-5 flex-1 min-h-full">

        {/* ── College title + link ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-violet-600" /> {college.name}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Live institutional overview</p>
          </div>
          <Link
            href={`/institutions/${college.id}`}
            className="text-[11px] font-semibold text-violet-600 hover:underline flex items-center gap-1"
          >
            Full Drill-Down →
          </Link>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard icon={GraduationCap} label="Students"    value={college.studentsCount}   color="bg-violet-100 text-violet-600" />
          <KPICard icon={Users}         label="Faculty"     value={college.staffCount}       color="bg-sky-100 text-sky-600" />
          <KPICard icon={BookOpen}      label="Departments" value={college.departmentsCount} color="bg-emerald-100 text-emerald-600" />
          <KPICard icon={CalendarCheck} label="Today's Sessions" value={sessions.length}
            sub={`${activeSessions.length} live · ${completedSessions.length} done`}
            color="bg-amber-100 text-amber-600"
          />
        </div>

        {/* ── Today's Sessions + Staff Attendance + Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Today's Sessions */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" /> Today's Sessions
              </h3>
              <span className="text-[10px] text-slate-400">{sessions.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-40 custom-scrollbar">
              {dataLoading ? (
                <div className="flex items-center justify-center h-16">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-5">No classes today.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {sessions.map(s => {
                    const isLive      = s.status !== "completed" && nowStr >= s.start_time && nowStr < s.end_time;
                    const isDone      = s.status === "completed" || nowStr >= s.end_time;
                    return (
                      <div key={s.id} className="px-4 py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${isDone ? "text-slate-400" : "text-slate-800"}`}>
                            {s.subject_name}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <User size={9} /> {s.staff?.full_name || "—"} · {formatTime(s.start_time)}
                          </p>
                        </div>
                        {isLive && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full animate-pulse shrink-0">LIVE</span>
                        )}
                        {isDone && (
                          <button
                            onClick={() => onViewReport(s.id)}
                            className="text-[10px] font-semibold text-violet-600 hover:underline flex items-center gap-1 shrink-0"
                          >
                            <FileText size={10} /> Report
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Staff Attendance */}
          <StaffAttendanceCard tenantId={college.id} />

          {/* Action Required */}
          <ActionRequiredCard tenantId={college.id} />
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Department breakdown */}
          <div className="lg:col-span-2 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <BookOpen size={13} className="text-violet-600" /> Department Breakdown
            </h3>
            {dataLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
              </div>
            ) : deptBarData.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No department data available.</p>
            ) : (
                  <ResponsiveContainer width="100%" height={180}>
                <BarChart data={deptBarData} barGap={4} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={118} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                  <Bar dataKey="Students" radius={[0,4,4,0]} barSize={10}>
                    {deptBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                  <Bar dataKey="Staff" radius={[0,4,4,0]} barSize={10}>
                    {deptBarData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.4} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Student vs Staff donut */}
          <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Users size={13} className="text-sky-600" /> Composition
            </h3>
            <div className="flex-1 flex items-center justify-center">
              {dataLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600" />
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <PieChart width={120} height={120}>
                    <Pie data={ratioData} cx={55} cy={55} innerRadius={36} outerRadius={52}
                      dataKey="value" strokeWidth={0} cornerRadius={4}>
                      <Cell fill={getDeptColor(departments[0]?.color).hex} />
                      <Cell fill={getDeptColor(departments[1]?.color ?? 'sky').hex} />
                    </Pie>
                  </PieChart>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getDeptColor(departments[0]?.color).hex }} /> Students: <b>{college.studentsCount}</b></span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: getDeptColor(departments[1]?.color ?? 'sky').hex }} /> Staff: <b>{college.staffCount}</b></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-[1px] shrink-0" aria-hidden />
      </div>
    </div>
  );
}
