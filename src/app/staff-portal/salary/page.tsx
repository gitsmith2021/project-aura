import { redirect } from "next/navigation";
import { getStaffProfile, getSalarySlips } from "@/actions/staffPortal";
import { PayslipCard } from "@/components/staff-portal/PayslipCard";

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default async function SalaryPage() {
  const profileResult = await getStaffProfile();
  if (!profileResult.success) redirect("/login");
  const staff = profileResult.data;

  const salaryResult = await getSalarySlips(staff.id);
  const slips      = salaryResult.success ? salaryResult.data : [];
  const current    = salaryResult.success ? salaryResult.currentStructure : null;

  const gross      = current ? current.basic_salary + current.hra + current.ta + current.da + current.other_allowances : 0;
  const deductions = current ? current.pf_deduction + current.esi_deduction + current.tds_deduction + current.other_deductions : 0;

  return (
    <div className="px-6 pt-4 pb-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Salary & Payslips</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {staff.title ? `${staff.title} ` : ""}{staff.full_name} · {staff.designation ?? ""} · {staff.departments?.name ?? ""}
        </p>
      </div>

      {/* Current salary structure */}
      {current ? (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-4">Current Salary Structure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Earnings */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Earnings</p>
              {[["Basic Salary", current.basic_salary], ["HRA", current.hra], ["TA", current.ta], ["DA", current.da], ["Other Allowances", current.other_allowances]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-200 tabular-nums">{fmtINR(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 mt-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Gross</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtINR(gross)}</span>
              </div>
            </div>
            {/* Deductions + Net */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Deductions</p>
              {[["PF", current.pf_deduction], ["ESI", current.esi_deduction], ["TDS", current.tds_deduction], ["Other", current.other_deductions]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-xs text-rose-600 dark:text-rose-400 tabular-nums">-{fmtINR(v as number)}</span>
                </div>
              ))}
              <div className="flex justify-between py-1.5 mt-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Total Deductions</span>
                <span className="text-xs font-bold text-rose-500 dark:text-rose-400 tabular-nums">-{fmtINR(deductions)}</span>
              </div>
            </div>
          </div>

          {/* Net salary */}
          <div className="flex items-center justify-between px-5 py-4 mt-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Net Salary / Month</p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500 mt-0.5">Gross {fmtINR(gross)} − Deductions {fmtINR(deductions)}</p>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{fmtINR(current.net_salary)}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-10 text-xs text-slate-400 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          No salary structure configured yet. Please contact HR.
        </div>
      )}

      {/* Payslip history */}
      {slips.length > 0 && (
        <div className="space-y-2.5">
          <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest">Monthly Payslips</h2>
          {slips.map(slip => (
            <PayslipCard key={slip.id} slip={slip} staff={staff} />
          ))}
        </div>
      )}
    </div>
  );
}
