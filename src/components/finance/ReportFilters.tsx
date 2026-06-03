"use client";

import { Filter, X } from "lucide-react";

type FilterDef =
  | { type: "year";     key: string; label: string; value: string; options: string[] }
  | { type: "month";    key: string; label: string; value: string }
  | { type: "select";   key: string; label: string; value: string; options: { value: string; label: string }[] }
  | { type: "status";   key: string; label: string; value: string; options: { value: string; label: string }[] };

type Props = {
  filters:  FilterDef[];
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
};

const inp = "px-2.5 py-1.5 bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-400 backdrop-blur-sm appearance-none cursor-pointer";

export function ReportFilters({ filters, onChange, onReset }: Props) {
  const hasActive = filters.some(f => {
    if (f.type === "month") return !!f.value;
    if (f.type === "select" || f.type === "status") return !!f.value;
    return false;
  });

  return (
    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
      <Filter size={12} className="text-slate-400 shrink-0" />

      {filters.map(f => {
        if (f.type === "year") {
          return (
            <select key={f.key} value={f.value} onChange={e => onChange(f.key, e.target.value)} className={inp} title={f.label}>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        }
        if (f.type === "month") {
          return (
            <input key={f.key} type="month" value={f.value} onChange={e => onChange(f.key, e.target.value)}
              title={f.label} className={inp} />
          );
        }
        if (f.type === "select" || f.type === "status") {
          return (
            <select key={f.key} value={f.value} onChange={e => onChange(f.key, e.target.value)} className={inp} title={f.label}>
              <option value="">{f.label}: All</option>
              {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          );
        }
        return null;
      })}

      {hasActive && onReset && (
        <button type="button" onClick={onReset}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
          <X size={11} /> Reset
        </button>
      )}
    </div>
  );
}
