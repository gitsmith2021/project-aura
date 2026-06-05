import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }     from "@/utils/supabase/server";
import { getStaffSchedule } from "@/actions/staffPortal";
import type { StaffScheduleSlot } from "@/types/staffPortal";

const DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8);

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

function slotForCell(slots: StaffScheduleSlot[], day: string, hour: number): StaffScheduleSlot | null {
  return slots.find(s => {
    const start = parseInt(s.start_time.split(":")[0], 10);
    const end   = parseInt(s.end_time.split(":")[0],   10);
    return s.day_of_week === day && hour >= start && hour < end;
  }) ?? null;
}

export default async function AdminStaffSchedule({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase.from("staff").select("full_name, title, departments(name)").eq("id", staffId).single();
  if (!staff) redirect("/users/staff");

  const result = await getStaffSchedule(staffId);
  const slots  = result.success ? result.data : [];

  const totalClasses   = new Set(slots.map(s => `${s.day_of_week}_${s.start_time}`)).size;
  const teachingHours  = slots.reduce((sum, s) => sum + Math.max(0, parseInt(s.end_time) - parseInt(s.start_time)), 0);
  const uniqueSubjects = new Set(slots.map(s => s.subject_name)).size;

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {staff.title ? `${staff.title} ` : ""}{staff.full_name} — Weekly Schedule
      </h1>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Classes/Week",   value: totalClasses,   cls: "border-violet-200/60 dark:border-violet-800/40", txt: "text-violet-700 dark:text-violet-400" },
          { label: "Teaching Hours", value: `${teachingHours}h`, cls: "border-blue-200/60 dark:border-blue-800/40",   txt: "text-blue-700 dark:text-blue-400" },
          { label: "Subjects",       value: uniqueSubjects, cls: "border-emerald-200/60 dark:border-emerald-800/40", txt: "text-emerald-700 dark:text-emerald-400" },
        ].map(s => (
          <div key={s.label} className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm ${s.cls}`}>
            <p className={`text-xl font-black ${s.txt}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {slots.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">No classes scheduled yet.</div>
      ) : (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right w-16">Time</th>
                {DAYS.map(d => <th key={d} className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">{d.slice(0,3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour} className="border-b border-slate-50 dark:border-slate-800">
                  <td className="px-3 py-1.5 text-[10px] text-slate-400 text-right tabular-nums">{String(hour).padStart(2,"0")}:00</td>
                  {DAYS.map(day => {
                    const slot = slotForCell(slots, day, hour);
                    return (
                      <td key={day} className="px-1.5 py-1">
                        {slot ? (
                          <div className="rounded-md bg-violet-100/80 dark:bg-violet-900/30 border border-violet-200/60 dark:border-violet-700/40 px-2 py-1.5 text-center">
                            <p className="text-[10px] font-semibold text-violet-800 dark:text-violet-200 truncate">{slot.subject_name}</p>
                            <p className="text-[9px] text-violet-500 dark:text-violet-400 mt-0.5 truncate">{slot.departments?.name ?? ""}</p>
                          </div>
                        ) : (
                          <div className="h-8 rounded-md border border-dashed border-slate-200/60 dark:border-slate-700/30" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
