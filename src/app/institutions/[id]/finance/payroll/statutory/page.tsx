import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import Link         from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatutoryConfigPanel }    from "@/components/finance/StatutoryConfigPanel";
import { StatutoryDeductionTable } from "@/components/finance/StatutoryDeductionTable";
import { MonthPicker }             from "@/components/finance/MonthPicker";
import { createClient } from "@/utils/supabase/server";
import {
  getStatutoryConfig,
  getMonthlyDeductions,
  getStatutorySummary,
} from "@/actions/statutoryPayroll";
import type { StatutorySummary } from "@/types/finance";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ month?: string }> };

const EMPTY_SUMMARY: StatutorySummary = {
  totalTds: 0, totalPfEmployee: 0, totalPfEmployer: 0,
  totalEsiEmployee: 0, totalEsiEmployer: 0,
  staffProcessed: 0, staffPending: 0,
};

export default async function StatutoryPayrollPage({ params, searchParams }: PageProps) {
  const { id }   = await params;
  const { month: qMonth } = await searchParams;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentMonth = qMonth ?? new Date().toISOString().slice(0, 7);

  const { data: institution } = await supabase
    .from("institutions").select("name").eq("id", id).single();

  const [configResult, deductionsResult, summaryResult] = await Promise.all([
    getStatutoryConfig(id),
    getMonthlyDeductions(id, currentMonth),
    getStatutorySummary(id, currentMonth),
  ]);

  // Month picker: show last 12 months
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const breadcrumb = (
    <>
      <Link href="/finance" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Finance</Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{institution?.name ?? id}</span>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <Link href={`/institutions/${id}/finance/salary`} className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Salary</Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">Statutory Payroll</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-4 pb-6 space-y-5 w-full">

        {/* Header + month picker + Form 16 link */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Statutory Payroll</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">TDS · EPF · ESI deductions — {institution?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <MonthPicker months={monthOptions} current={currentMonth} />
            <Link
              href={`/institutions/${id}/finance/payroll/statutory/form16`}
              className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
            >
              Form 16
            </Link>
          </div>
        </div>

        {/* Statutory config (collapsible) */}
        <StatutoryConfigPanel
          institutionId={id}
          config={configResult.success ? configResult.data : null}
        />

        {/* Compliance numbers info */}
        {configResult.success && configResult.data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            {[
              { label: "TAN",              val: configResult.data.tan_number ?? "Not set" },
              { label: "PF Registration",  val: configResult.data.pf_number  ?? "Not set" },
              { label: "ESI Code",         val: configResult.data.esi_number  ?? "Not set" },
            ].map(({ label, val }) => (
              <div key={label} className="px-4 py-2.5 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/40">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="font-mono font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Deductions table (client — handles Run button) */}
        <StatutoryDeductionTable
          institutionId={id}
          month={currentMonth}
          rows={deductionsResult.success ? deductionsResult.data : []}
          summary={summaryResult.success ? summaryResult.data : EMPTY_SUMMARY}
        />
      </div>
    </DashboardLayout>
  );
}
