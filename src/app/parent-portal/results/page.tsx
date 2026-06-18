import { Award } from "lucide-react";
import { getSelectedChild, getChildResults } from "@/actions/parentPortal";
import { resultsSummary } from "@/lib/parentPortal";

export default async function ParentResultsPage() {
  const child = await getSelectedChild();
  if (!child) return <div className="p-6 text-slate-400">No child selected.</div>;

  const res = await getChildResults(child.studentId);
  const results = res.success ? res.data : [];
  const summary = resultsSummary(results);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Award size={22} className="text-amber-600" /> Results</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          {child.name}{summary.avgPercentage != null && <> · average <span className="font-semibold text-slate-700 dark:text-slate-300">{summary.avgPercentage}%</span></>}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No published results yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Semester</th>
                <th className="text-center font-medium px-4 py-2.5">CIA %</th>
                <th className="text-center font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">Semester {r.semester ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-slate-900 dark:text-white">{r.final_percentage != null ? `${r.final_percentage}%` : "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 capitalize">{r.status}</span>
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
