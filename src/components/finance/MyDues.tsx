import Link from "next/link";
import { Receipt, CreditCard, AlertTriangle } from "lucide-react";
import {
  DEMAND_STATUS_LABELS, DEMAND_SOURCE_LABELS, demandStatus, balance, daysOverdue, demandTally, inr,
  type FeeDemand,
} from "@/lib/feeDemands";

const badgeCls: Record<string, string> = {
  pending: "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40",
  partial: "bg-blue-100/80 text-blue-700 border-blue-200/60 dark:bg-blue-900/25 dark:text-blue-300 dark:border-blue-800/40",
  paid: "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40",
  overdue: "bg-rose-100/80 text-rose-700 border-rose-200/60 dark:bg-rose-900/25 dark:text-rose-300 dark:border-rose-800/40",
  waived: "bg-violet-100/80 text-violet-700 border-violet-200/60 dark:bg-violet-900/25 dark:text-violet-300 dark:border-violet-800/40",
  cancelled: "bg-slate-200/80 text-slate-600 border-slate-300/60 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

/** Student-facing dues, driven by the per-student fee_demands (with due dates). */
export function MyDues({ demands }: { demands: FeeDemand[] }) {
  if (demands.length === 0) return null;
  const open = demands.filter((d) => d.status !== "cancelled");
  const t = demandTally(demands);

  return (
    <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><Receipt size={13} /> My Dues</h2>
        {t.outstanding > 0 && <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">{inr(t.outstanding)} outstanding</span>}
      </div>
      <div className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
        {open.map((d) => {
          const paid = d.amount_paid ?? 0;
          const live = demandStatus(d, paid);
          const bal = balance(d.net_due, paid);
          const od = live === "overdue" ? daysOverdue(d.due_date) : 0;
          // online pay needs a fee structure; ad-hoc fines/mess are settled at the office
          const payable = bal > 0 && d.status !== "waived" && !!d.fee_structure_id;
          return (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition-colors">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {d.title}
                  {d.source !== "fee_structure" && <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-bold uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{DEMAND_SOURCE_LABELS[d.source]}</span>}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  Due {new Date(d.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {od > 0 && <span className="text-rose-500 font-semibold flex items-center gap-0.5"><AlertTriangle size={9} /> {od}d overdue</span>}
                  {d.concession_amount > 0 && <span className="text-violet-500">· concession {inr(d.concession_amount)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">{bal > 0 ? inr(bal) : inr(d.net_due)}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeCls[live] ?? badgeCls.pending}`}>{DEMAND_STATUS_LABELS[live]}</span>
                </div>
                {payable && (
                  <Link href={`/student-portal/fees/pay?structureId=${d.fee_structure_id}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold rounded-lg border border-violet-700 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm">
                    <CreditCard size={10} /> Pay
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
