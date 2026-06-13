import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }               from "@/utils/supabase/server";
import { getStaffAttendanceSummary }  from "@/actions/staffPortal";

function pctColor(p: number) {
  return p >= 75 ? "text-emerald-700 dark:text-emerald-400" : p >= 60 ? "text-amber-700 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";
}
function barColor(p: number) {
  return p >= 75 ? "bg-emerald-500" : p >= 60 ? "bg-amber-500" : "bg-rose-500";
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

export default async function AdminStaffAttendance({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase.from("staff").select("full_name, title, departments!department_id(name)").eq("id", staffId).single();
  if (!staff) redirect("/users/staff");

  const result = await getStaffAttendanceSummary(staffId);
  const rows   = result.success ? result.data : [];

  const totalHeld    = rows.reduce((s, r) => s + r.classes_held, 0);
  const totalMarked  = rows.reduce((s, r) => s + r.total_marked, 0);
  const totalPresent = rows.reduce((s, r) => s + r.total_present, 0);
  const overallPct   = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {staff.title ? `${staff.title} ` : ""}{staff.full_name} — Attendance Summary
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Last 30 days</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Classes Conducted", value: totalHeld,         cls: "border-violet-200/60 dark:border-violet-800/40", txt: "text-violet-700 dark:text-violet-400" },
          { label: "Students Marked",   value: totalMarked,       cls: "border-blue-200/60 dark:border-blue-800/40",   txt: "text-blue-700 dark:text-blue-400" },
          { label: "Avg Attendance",    value: `${overallPct}%`,  cls: overallPct >= 75 ? "border-emerald-200/60 dark:border-emerald-800/40" : "border-amber-200/60 dark:border-amber-800/40", txt: pctColor(overallPct) },
        ].map(s => (
          <div key={s.label} className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm ${s.cls}`}>
            <p className={`text-2xl font-black ${s.txt}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">No attendance records in the last 30 days.</div>
      ) : (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                {["Subject","Day & Time","Classes","Present","Total","Attendance %"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
              {rows.map(r => (
                <tr key={r.schedule_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">{r.subject_name}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.day_of_week} · {fmtTime(r.start_time)}–{fmtTime(r.end_time)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">{r.classes_held}</td>
                  <td className="px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">{r.total_present}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 tabular-nums">{r.total_marked}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden max-w-[80px]">
                        <div className={`h-full rounded-full ${barColor(r.attendance_pct)}`} style={{ width: `${r.attendance_pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold tabular-nums ${pctColor(r.attendance_pct)}`}>{r.attendance_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
