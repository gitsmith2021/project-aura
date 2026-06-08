import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }               from "@/utils/supabase/server";
import { getStudentAttendanceSummary } from "@/actions/studentPortal";

function pctColor(p: number) {
  if (p >= 75) return "text-emerald-700 dark:text-emerald-400";
  if (p >= 60) return "text-amber-700 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}
function barColor(p: number) {
  if (p >= 75) return "bg-emerald-500";
  if (p >= 60) return "bg-amber-500";
  return "bg-rose-500";
}
function ringColor(p: number) {
  if (p >= 75) return "#10b981";
  if (p >= 60) return "#f59e0b";
  return "#ef4444";
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

function AttendanceRing({ pct }: { pct: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-200 dark:text-slate-700" />
      <circle cx="26" cy="26" r={r} fill="none" stroke={ringColor(pct)} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform="rotate(-90 26 26)" />
      <text x="26" y="30" textAnchor="middle" fontSize="10" fontWeight="700" fill={ringColor(pct)}>{pct}%</text>
    </svg>
  );
}

export default async function AdminStudentAttendance({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, departments(name)")
    .eq("id", studentId).single();

  if (!student) redirect("/users/students");

  const dept   = (student.departments as unknown as { name: string } | null)?.name ?? "";
  const result = await getStudentAttendanceSummary(studentId);
  const rows   = result.success ? result.data : [];

  const totalClasses  = rows.reduce((s, r) => s + r.classes_held, 0);
  const totalAttended = rows.reduce((s, r) => s + r.classes_attended, 0);
  const overallPct    = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Attendance — {student.full_name}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Subject-wise breakdown · {dept}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Classes Held",     value: totalClasses,  cls: "border-indigo-200/60 dark:border-indigo-800/40",  txt: "text-indigo-700 dark:text-indigo-400" },
          { label: "Classes Attended", value: totalAttended, cls: "border-sky-200/60    dark:border-sky-800/40",     txt: "text-sky-700   dark:text-sky-400" },
          { label: "Overall",          value: `${overallPct}%`,
            cls: overallPct >= 75 ? "border-emerald-200/60 dark:border-emerald-800/40" : "border-amber-200/60 dark:border-amber-800/40",
            txt: pctColor(overallPct) },
        ].map(s => (
          <div key={s.label} className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm ${s.cls}`}>
            <p className={`text-2xl font-black ${s.txt}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {overallPct > 0 && overallPct < 75 && (
        <div className="px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-700 dark:text-amber-300">
          ⚠️ Attendance is <strong>{overallPct}%</strong> — below the 75% minimum required.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          No attendance records yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map(r => (
            <div key={r.schedule_id} className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center gap-4">
              <AttendanceRing pct={r.attendance_pct} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{r.subject_name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{r.day_of_week} · {fmtTime(r.start_time)}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{r.classes_attended}/{r.classes_held} classes</span>
                    <span className={`font-semibold ${pctColor(r.attendance_pct)}`}>{r.attendance_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor(r.attendance_pct)}`} style={{ width: `${r.attendance_pct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
