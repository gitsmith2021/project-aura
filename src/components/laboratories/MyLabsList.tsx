"use client";

import { useMemo } from "react";
import { FlaskConical, Check, X as XIcon, CalendarDays } from "lucide-react";
import { LAB_TYPE_COLORS, labTypeLabel, attendanceRate, averageMarks } from "@/lib/laboratories";
import type { MyLabSession } from "@/actions/laboratories";

export function MyLabsList({ sessions }: { sessions: MyLabSession[] }) {
  // Group sessions by lab.
  const groups = useMemo(() => {
    const byLab = new Map<string, { lab_name: string; lab_type: string; items: MyLabSession[] }>();
    for (const s of sessions) {
      const key = s.lab_name;
      if (!byLab.has(key)) byLab.set(key, { lab_name: s.lab_name, lab_type: s.lab_type, items: [] });
      byLab.get(key)!.items.push(s);
    }
    return Array.from(byLab.values());
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 dark:text-slate-500">
        <FlaskConical size={28} className="opacity-30" />
        <p className="text-xs">No lab sessions recorded for you yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const rate = attendanceRate(g.items.map((i) => ({ is_present: i.is_present })));
        const avg = averageMarks(g.items.map((i) => ({ marks_secured: i.marks_secured })));
        return (
          <div key={g.lab_name}>
            <div className="flex items-center gap-2 mb-2.5">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{g.lab_name}</h2>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${LAB_TYPE_COLORS[g.lab_type as keyof typeof LAB_TYPE_COLORS] ?? LAB_TYPE_COLORS.other}`}>
                {labTypeLabel(g.lab_type)}
              </span>
              <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
                Attendance <span className="font-semibold text-slate-700 dark:text-slate-200">{rate}%</span>
                {avg != null && <> · Avg marks <span className="font-semibold text-slate-700 dark:text-slate-200">{avg}</span></>}
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {g.items.map((s) => (
                <div key={s.session_id + s.experiment_title} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    s.is_present ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-rose-100 dark:bg-rose-950/40"
                  }`}>
                    {s.is_present
                      ? <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                      : <XIcon size={14} className="text-rose-500 dark:text-rose-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{s.experiment_title}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <CalendarDays size={11} /> {s.session_date} · {s.batch_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.marks_secured != null ? (
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{s.marks_secured}</span>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                    <p className="text-[10px] text-slate-400">marks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
