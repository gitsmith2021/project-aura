import { redirect }        from "next/navigation";
import { Calendar, Users, ClipboardCheck, Clock, BookOpen } from "lucide-react";
import { getStaffProfile, getStaffDashboardStats, getLeaveRequests } from "@/actions/staffPortal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix  = h >= 12 ? "PM" : "AM";
  const hour    = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StaffDashboard() {
  const profileResult = await getStaffProfile();
  if (!profileResult.success) redirect("/login");
  const staff = profileResult.data;

  const [statsResult, leavesResult] = await Promise.all([
    getStaffDashboardStats(staff.id, staff.institution_id),
    getLeaveRequests(staff.id),
  ]);

  const stats       = statsResult.success ? statsResult.data : null;
  const recentLeaves = (leavesResult.success ? leavesResult.data : []).slice(0, 3);

  const cardCls = "px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm";

  const leaveStatusCls = (s: string) =>
    s === "approved" ? "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" :
    s === "rejected" ? "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40" :
    "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40";

  return (
    <div className="px-6 pt-6 pb-8 max-w-5xl mx-auto space-y-6">

      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {greeting()}, {staff.title ? `${staff.title} ` : ""}{staff.full_name.split(" ")[0]} 👋
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {staff.designation ?? "Staff"} · {staff.departments?.name ?? ""} · {staff.institutions?.name ?? ""}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className={`${cardCls} border-violet-200/60 dark:border-violet-800/40`}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={13} className="text-violet-500" />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Today's Classes</p>
          </div>
          <p className="text-2xl font-black text-violet-700 dark:text-violet-400">{stats?.todaysClasses.length ?? 0}</p>
        </div>
        <div className={`${cardCls} border-blue-200/60 dark:border-blue-800/40`}>
          <div className="flex items-center gap-2 mb-1">
            <Users size={13} className="text-blue-500" />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Students</p>
          </div>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{stats?.totalStudents ?? 0}</p>
        </div>
        <div className={`${cardCls} ${(stats?.thisMonthAttendance ?? 0) >= 75 ? "border-emerald-200/60 dark:border-emerald-800/40" : "border-amber-200/60 dark:border-amber-800/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={13} className={(stats?.thisMonthAttendance ?? 0) >= 75 ? "text-emerald-500" : "text-amber-500"} />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Avg Attendance</p>
          </div>
          <p className={`text-2xl font-black ${(stats?.thisMonthAttendance ?? 0) >= 75 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {stats?.thisMonthAttendance ?? 0}%
          </p>
        </div>
        <div className={`${cardCls} border-amber-200/60 dark:border-amber-800/40`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock size={13} className="text-amber-500" />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Pending Leaves</p>
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats?.pendingLeaves ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's schedule */}
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Today's Schedule</h2>
            <span className="text-[10px] text-slate-400">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</span>
          </div>

          {!stats?.todaysClasses.length ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
              <BookOpen size={28} className="opacity-30" />
              <p className="text-xs">No classes today</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2.5">
              {stats.todaysClasses.map(cls => (
                <div key={cls.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-violet-50/60 dark:bg-violet-900/15 border border-violet-100/60 dark:border-violet-800/30">
                  <div className="shrink-0 text-center">
                    <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400">{fmtTime(cls.start_time)}</p>
                    <p className="text-[9px] text-slate-400">–{fmtTime(cls.end_time)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{cls.subject_name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{cls.departments?.name ?? ""}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next class countdown */}
          {stats?.nextClass && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-100/60 dark:border-emerald-800/30">
                <Clock size={11} className="text-emerald-500 shrink-0" />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Next: <strong>{stats.nextClass.subject_name}</strong> at {fmtTime(stats.nextClass.start_time)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent leaves */}
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Recent Leave Requests</h2>
          </div>
          {recentLeaves.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-xs text-slate-400">No leave requests yet</div>
          ) : (
            <div className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
              {recentLeaves.map(lr => (
                <div key={lr.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200 capitalize">{lr.leave_type} Leave</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(lr.from_date)} → {fmtDate(lr.to_date)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${leaveStatusCls(lr.status)}`}>
                    {lr.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
