"use client";

import { type CIAStudentSummary } from "@/actions/cia";
import { Award, AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  summaries: CIAStudentSummary[];
  componentNames: string[];
}

export function CIAReportCard({ summaries, componentNames }: Props) {
  if (!summaries.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
      <Award size={32} className="opacity-30" />
      <p className="text-sm">No data yet. Enter marks to see the report.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 text-slate-500 font-semibold sticky left-0 bg-slate-50 z-10 w-8">#</th>
            <th className="text-left px-4 py-2.5 text-slate-500 font-semibold sticky left-8 bg-slate-50 z-10 min-w-[180px]">Student</th>
            {componentNames.map(name => (
              <th key={name} className="text-center px-3 py-2.5 text-slate-500 font-semibold min-w-[90px]">
                {name}
              </th>
            ))}
            <th className="text-center px-4 py-2.5 text-slate-500 font-semibold min-w-[80px]">Total</th>
            <th className="text-center px-4 py-2.5 text-slate-500 font-semibold min-w-[70px]">%</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s, i) => {
            const pct = s.percentage;
            const pctColor = pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600";
            return (
              <tr key={s.student_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-2 text-slate-400 sticky left-0 bg-white">{i + 1}</td>
                <td className="px-4 py-2 sticky left-8 bg-white">
                  <p className="font-semibold text-slate-800 leading-tight">{s.full_name}</p>
                  {s.roll_number && <p className="text-slate-400 font-mono text-[10px]">{s.roll_number}</p>}
                </td>
                {s.components.map(c => (
                  <td key={c.component_id} className="px-3 py-2 text-center">
                    {c.marks_scored !== null ? (
                      <span className={`font-semibold ${c.marks_scored >= c.max_marks * 0.5 ? "text-slate-800" : "text-rose-500"}`}>
                        {c.marks_scored}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2 text-center font-bold text-slate-800">
                  {s.total_scored} <span className="text-slate-400 font-normal text-[10px]">/{s.total_max}</span>
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`font-bold ${pctColor}`}>{pct}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary footer */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 px-4">
        <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-emerald-500" /> ≥75%: {summaries.filter(s => s.percentage >= 75).length}</span>
        <span className="flex items-center gap-1"><AlertCircle size={11} className="text-amber-500" /> 50–74%: {summaries.filter(s => s.percentage >= 50 && s.percentage < 75).length}</span>
        <span className="flex items-center gap-1"><AlertCircle size={11} className="text-rose-500" /> &lt;50%: {summaries.filter(s => s.percentage < 50).length}</span>
      </div>
    </div>
  );
}
