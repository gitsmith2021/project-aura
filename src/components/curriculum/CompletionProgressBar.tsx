"use client";

interface Props {
  completed: number;
  total: number;
  completedHours?: number;
  totalHours?: number;
  size?: "sm" | "md";
}

export function CompletionProgressBar({ completed, total, completedHours, totalHours, size = "md" }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const barColor =
    pct >= 100 ? "bg-emerald-500" :
    pct >= 75  ? "bg-teal-500"   :
    pct >= 50  ? "bg-amber-500"  :
    pct >= 25  ? "bg-orange-500" :
                 "bg-rose-400";

  const labelColor =
    pct >= 100 ? "text-emerald-600" :
    pct >= 75  ? "text-teal-600"    :
    pct >= 50  ? "text-amber-600"   :
                 "text-rose-500";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-bold ${labelColor}`}>{pct}%</span>
        <span className="text-[11px] text-slate-400">
          {completed}/{total} units
          {totalHours != null && totalHours > 0 && (
            <> · {completedHours ?? 0}/{totalHours} hrs</>
          )}
        </span>
      </div>
      <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${size === "sm" ? "h-1.5" : "h-2"}`}>
        <div
          className={`${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%`, height: "100%" }}
        />
      </div>
    </div>
  );
}
