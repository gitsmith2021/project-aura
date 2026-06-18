import { CreditCard, Info } from "lucide-react";
import { getSelectedChild, getChildFees } from "@/actions/parentPortal";
import { feesSummary, formatINR } from "@/lib/parentPortal";

const STATUS_COLORS: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  overdue: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  partial: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
};

export default async function ParentFeesPage() {
  const child = await getSelectedChild();
  if (!child) return <div className="p-6 text-slate-400">No child selected.</div>;

  const res = await getChildFees(child.studentId);
  const demands = res.success ? res.data : [];
  const summary = feesSummary(demands);

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><CreditCard size={22} className="text-amber-600" /> Fees</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
          {child.name} · outstanding <span className={`font-semibold ${summary.totalDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatINR(summary.totalDue)}</span>
        </p>
      </div>

      {demands.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No fee demands raised yet.</div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Demand</th>
                <th className="text-center font-medium px-4 py-2.5">Due date</th>
                <th className="text-right font-medium px-4 py-2.5">Net due</th>
                <th className="text-center font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {demands.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{d.title}</td>
                  <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{d.due_date ? new Date(d.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-900 dark:text-white">{formatINR(d.net_due)}</td>
                  <td className="px-4 py-2.5 text-center"><span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[d.status ?? "pending"] ?? STATUS_COLORS.pending}`}>{d.status ?? "pending"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-[12px] text-amber-700 dark:text-amber-300">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>Online payment on behalf of your child is coming soon. Until then, fees can be paid from the student portal or at the institution office.</span>
      </div>
    </div>
  );
}
