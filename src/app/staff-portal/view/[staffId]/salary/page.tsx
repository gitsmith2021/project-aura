import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import { createClient }   from "@/utils/supabase/server";
import { getSalarySlips } from "@/actions/staffPortal";

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

const statusCls = (s: string) =>
  s === "processed" ? "bg-emerald-100/80 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/25 dark:text-emerald-300 dark:border-emerald-800/40" :
  s === "pending"   ? "bg-amber-100/80 text-amber-700 border-amber-200/60 dark:bg-amber-900/25 dark:text-amber-300 dark:border-amber-800/40" :
  "bg-slate-100/80 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";

export default async function AdminStaffSalary({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("full_name, title, designation, departments!department_id(name)")
    .eq("id", staffId).single();
  if (!staff) redirect("/users/staff");

  const result   = await getSalarySlips(staffId);
  const slips    = result.success ? result.data : [];
  const current  = result.success ? result.currentStructure : null;

  const gross      = current ? current.basic_salary + current.hra + current.ta + current.da + current.other_allowances : 0;
  const deductions = current ? current.pf_deduction + current.esi_deduction + current.tds_deduction + current.other_deductions : 0;

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {staff.title ? `${staff.title} ` : ""}{staff.full_name} — Salary & Payslips
      </h1>

      {/* Current structure */}
      {current ? (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4">Current Salary Structure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Earnings</p>
              {[["Basic", current.basic_salary], ["HRA", current.hra], ["TA", current.ta], ["DA", current.da], ["Other", current.other_allowances]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-200 tabular-nums">{fmtINR(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 mt-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Gross</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmtINR(gross)}</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Deductions</p>
              {[["PF", current.pf_deduction], ["ESI", current.esi_deduction], ["TDS", current.tds_deduction], ["Other", current.other_deductions]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-xs text-rose-600 dark:text-rose-400 tabular-nums">-{fmtINR(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 mt-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total</span>
                <span className="text-xs font-bold text-rose-500 dark:text-rose-400">-{fmtINR(deductions)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 mt-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Net Salary / Month</span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{fmtINR(current.net_salary)}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-10 text-xs text-slate-400 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          No salary structure configured yet.
        </div>
      )}

      {/* Disbursement history */}
      {slips.length > 0 && (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100/60 dark:border-slate-700/40">
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Disbursement History</h2>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100/80 dark:border-slate-700/60">
                {["Month","Net Salary","Mode","Status","Disbursed","Transaction Ref"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/40">
              {slips.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">{fmtMonth(s.month)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtINR(s.amount_disbursed)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 capitalize">{s.payment_mode.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCls(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                    {s.disbursed_at ? new Date(s.disbursed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">{s.transaction_ref ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
