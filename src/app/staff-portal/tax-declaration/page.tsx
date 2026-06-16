import { redirect } from "next/navigation";
import { getStaffProfile } from "@/actions/staffPortal";
import { getStaffStatutoryData } from "@/actions/statutoryPayroll";
import { TaxDeclarationForm } from "@/components/staff-portal/TaxDeclarationForm";

export default async function TaxDeclarationPage() {
  const profileResult = await getStaffProfile();
  if (!profileResult.success) redirect("/login");
  const staff = profileResult.data;

  const statutoryResult = await getStaffStatutoryData(staff.id);
  const deductions  = statutoryResult.success ? statutoryResult.data.deductions  : [];
  const declaration = statutoryResult.success ? statutoryResult.data.declaration : null;

  function fmtINR(n: number) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  }

  return (
    <div className="px-6 pt-4 pb-6 space-y-5 w-full">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Tax Declaration</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {staff.title ? `${staff.title} ` : ""}{staff.full_name} · {staff.departments?.name ?? ""}
        </p>
      </div>

      {/* Tax regime + investments form (Client Component) */}
      <TaxDeclarationForm
        staffId={staff.id}
        institutionId={staff.institution_id}
        currentDeclaration={declaration}
      />

      {/* Monthly deduction history */}
      {deductions.length > 0 && (
        <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 border border-white/40 dark:border-slate-700/50 backdrop-blur-sm shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/40">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Monthly Deduction History</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700/40 bg-slate-50/60 dark:bg-slate-900/30">
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300">Month</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">Gross</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">PF</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">ESI</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">TDS</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-300">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
              {deductions.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">
                    {new Date(d.month + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{fmtINR(d.gross_salary)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtINR(d.pf_employee)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtINR(d.esi_employee)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{fmtINR(d.tds_deducted)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{fmtINR(d.net_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
