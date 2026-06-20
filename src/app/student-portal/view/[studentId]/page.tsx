import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { BookOpen, ClipboardCheck, CreditCard, Clock, Calendar } from "lucide-react";
import { createClient }          from "@/utils/supabase/server";
import { getStudentDashboardStats } from "@/actions/studentPortal";

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default async function AdminStudentDashboard({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, roll_no, student_program, student_year, department_id, institution_id, departments(name), institutions(name)")
    .eq("id", studentId)
    .single();

  if (!student) redirect("/users/students");

  const statsResult = await getStudentDashboardStats(
    student.id,
    student.department_id ?? "",
    student.institution_id,
  );
  const stats = statsResult.success ? statsResult.data : null;

  const dept      = (student.departments as unknown as { name: string } | null)?.name ?? "";
  const cardCls   = "px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm";

  return (
    <div className="px-6 pt-4 pb-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {student.full_name} — Dashboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {student.student_program ?? "Student"} · Year {student.student_year ?? "—"} · {dept}
          {student.roll_no ? ` · Roll: ${student.roll_no}` : ""}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className={`${cardCls} border-indigo-200/60 dark:border-indigo-800/40`}>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={13} className="text-indigo-500" />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Today&#39;s Classes</p>
          </div>
          <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{stats?.todaysClasses.length ?? 0}</p>
        </div>
        <div className={`${cardCls} ${(stats?.overallAttendancePct ?? 0) >= 75 ? "border-emerald-200/60 dark:border-emerald-800/40" : "border-amber-200/60 dark:border-amber-800/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck size={13} className={(stats?.overallAttendancePct ?? 0) >= 75 ? "text-emerald-500" : "text-amber-500"} />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Attendance</p>
          </div>
          <p className={`text-2xl font-black ${(stats?.overallAttendancePct ?? 0) >= 75 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {stats?.overallAttendancePct ?? 0}%
          </p>
        </div>
        <div className={`${cardCls} border-sky-200/60 dark:border-sky-800/40`}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={13} className="text-sky-500" />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fees Paid</p>
          </div>
          <p className="text-2xl font-black text-sky-700 dark:text-sky-400">{fmtCurrency(stats?.totalFeesPaid ?? 0)}</p>
        </div>
        <div className={`${cardCls} ${(stats?.totalFeesDue ?? 0) > 0 ? "border-rose-200/60 dark:border-rose-800/40" : "border-emerald-200/60 dark:border-emerald-800/40"}`}>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={13} className={(stats?.totalFeesDue ?? 0) > 0 ? "text-rose-500" : "text-emerald-500"} />
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Fees Due</p>
          </div>
          <p className={`text-2xl font-black ${(stats?.totalFeesDue ?? 0) > 0 ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
            {fmtCurrency(stats?.totalFeesDue ?? 0)}
          </p>
        </div>
      </div>

      {/* Today's timetable */}
      <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Today&#39;s Classes</h2>
          <span className="text-[10px] text-slate-400">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </span>
        </div>
        {!stats?.todaysClasses.length ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
            <BookOpen size={28} className="opacity-30" />
            <p className="text-xs">No classes scheduled today</p>
          </div>
        ) : (
          <div className="px-4 py-3 space-y-2.5">
            {stats.todaysClasses.map(cls => (
              <div key={cls.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-900/15 border border-indigo-100/60 dark:border-indigo-800/30">
                <div className="shrink-0 text-center">
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{fmtTime(cls.start_time)}</p>
                  <p className="text-[9px] text-slate-400">–{fmtTime(cls.end_time)}</p>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{cls.subject_name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats && stats.overallAttendancePct > 0 && stats.overallAttendancePct < 75 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
          <Clock size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Attendance below 75%</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
              This student&#39;s overall attendance is {stats.overallAttendancePct}%.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
