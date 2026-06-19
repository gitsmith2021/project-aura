import type { Gradebook, GbAssignment, GbCellStatus } from "@/lib/lms";
import { gradeBand } from "@/lib/lms";

const BAND_CLS: Record<string, string> = {
  pass: "text-emerald-700 dark:text-emerald-300",
  fail: "text-rose-600 dark:text-rose-400",
  submitted: "text-amber-600 dark:text-amber-400",
  missing: "text-slate-300 dark:text-slate-600",
};

function cellText(marks: number | null, status: GbCellStatus): string {
  if (status === "missing") return "—";
  if (status === "submitted") return "•";
  return String(marks);
}

export function GradebookTable({ assignments, gradebook }: { assignments: GbAssignment[]; gradebook: Gradebook }) {
  const avgById = new Map(gradebook.assignmentAverages.map((a) => [a.assignmentId, a.average]));

  if (gradebook.rows.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No students in this subject&apos;s department.</div>;
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <th className="px-4 py-2.5 font-medium sticky left-0 bg-white dark:bg-slate-900">Student</th>
            {assignments.map((a) => <th key={a.id} className="px-3 py-2.5 font-medium text-center whitespace-nowrap" title={a.title}>{a.title.length > 14 ? a.title.slice(0, 12) + "…" : a.title}<br /><span className="text-slate-300 normal-case">/{a.maxMarks}</span></th>)}
            <th className="px-4 py-2.5 font-medium text-center">Avg %</th>
          </tr>
        </thead>
        <tbody>
          {gradebook.rows.map((r) => (
            <tr key={r.student.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
              <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-900 whitespace-nowrap">{r.student.name}{r.student.rollNo && <span className="text-[11px] text-slate-400 ml-1.5">{r.student.rollNo}</span>}</td>
              {r.cells.map((c) => {
                const max = assignments.find((a) => a.id === c.assignmentId)?.maxMarks ?? 0;
                const band = gradeBand(c.marks, max, c.status);
                return <td key={c.assignmentId} className={`px-3 py-2.5 text-center font-semibold ${BAND_CLS[band]}`}>{cellText(c.marks, c.status)}</td>;
              })}
              <td className="px-4 py-2.5 text-center font-bold text-slate-900 dark:text-white">{r.average !== null ? `${r.average}%` : "—"}</td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
            <td className="px-4 py-2.5 font-semibold text-slate-500 sticky left-0 bg-slate-50 dark:bg-slate-800/40">Class avg %</td>
            {assignments.map((a) => <td key={a.id} className="px-3 py-2.5 text-center font-semibold text-slate-600 dark:text-slate-300">{avgById.get(a.id) !== null && avgById.get(a.id) !== undefined ? `${avgById.get(a.id)}%` : "—"}</td>)}
            <td className="px-4 py-2.5" />
          </tr>
        </tbody>
      </table>
      <div className="flex flex-wrap gap-4 px-4 py-2.5 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <span className="text-emerald-700 dark:text-emerald-300">■ pass (≥40%)</span>
        <span className="text-rose-600 dark:text-rose-400">■ below 40%</span>
        <span className="text-amber-600 dark:text-amber-400">• submitted, ungraded</span>
        <span className="text-slate-400">— not submitted</span>
      </div>
    </div>
  );
}
