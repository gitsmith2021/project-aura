import { redirect } from "next/navigation";
import { getStudentProfile, getStudentTimetable } from "@/actions/studentPortal";
import type { StudentScheduleSlot } from "@/types/studentPortal";

const DAYS  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 08–17

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

function slotForCell(slots: StudentScheduleSlot[], day: string, hour: number): StudentScheduleSlot | null {
  return slots.find(s => {
    const start = parseInt(s.start_time.split(":")[0], 10);
    const end   = parseInt(s.end_time.split(":")[0],   10);
    return s.day_of_week === day && hour >= start && hour < end;
  }) ?? null;
}

export default async function TimetablePage() {
  const profileResult = await getStudentProfile();
  if (!profileResult.success) redirect("/login");
  const student = profileResult.data;

  const timetableResult = await getStudentTimetable(student.department_id ?? "");
  const slots = timetableResult.success ? timetableResult.data : [];

  const totalClasses  = new Set(slots.map(s => `${s.day_of_week}_${s.start_time}`)).size;
  const uniqueSubjects = new Set(slots.map(s => s.subject_name)).size;
  const teachingHours  = slots.reduce((sum, s) => {
    const sh = parseInt(s.start_time.split(":")[0], 10);
    const eh = parseInt(s.end_time.split(":")[0],   10);
    return sum + Math.max(0, eh - sh);
  }, 0);

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Weekly Timetable</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {student.departments?.name ?? ""} · {student.student_program ?? ""} Year {student.student_year ?? ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Classes/Week",   value: totalClasses,         cls: "border-indigo-200/60 dark:border-indigo-800/40  text-indigo-700  dark:text-indigo-400" },
          { label: "Weekly Hours",   value: `${teachingHours}h`,  cls: "border-sky-200/60    dark:border-sky-800/40     text-sky-700     dark:text-sky-400" },
          { label: "Subjects",       value: uniqueSubjects,       cls: "border-violet-200/60 dark:border-violet-800/40  text-violet-700  dark:text-violet-400" },
        ].map(s => (
          <div key={s.label} className={`px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-800/60 border backdrop-blur-sm shadow-sm ${s.cls.split("  ").slice(0,2).join(" ")}`}>
            <p className={`text-xl font-black ${s.cls.split("  ").slice(2).join(" ")}`}>{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {slots.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-slate-400 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          No timetable published yet.
        </div>
      ) : (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right w-16">Time</th>
                {DAYS.map(d => (
                  <th key={d} className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">{d.slice(0,3)}</th>
                ))}
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
                          <div className="rounded-md bg-indigo-100/80 dark:bg-indigo-900/30 border border-indigo-200/60 dark:border-indigo-700/40 px-2 py-1.5 text-center">
                            <p className="text-[10px] font-semibold text-indigo-800 dark:text-indigo-200 leading-tight truncate">{slot.subject_name}</p>
                            <p className="text-[9px] text-indigo-400 dark:text-indigo-500 mt-0.5">{fmtTime(slot.start_time)}–{fmtTime(slot.end_time)}</p>
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
