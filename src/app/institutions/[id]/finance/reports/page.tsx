import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import Link         from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReportsClient }   from "@/components/finance/ReportsClient";
import { getMonthlyPLReport, getFinancialSummaryReport } from "@/actions/reports";
import { createClient } from "@/utils/supabase/server";
import type { FinancialSummary } from "@/types/finance";

type PageProps = { params: Promise<{ id: string }> };

function currentAcademicYear(): string {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1;
  const sy  = m >= 4 ? y : y - 1;
  return `${sy}-${String(sy + 1).slice(-2)}`;
}

const EMPTY_SUMMARY: FinancialSummary = {
  totalIncome: 0, totalExpenditure: 0, netSurplus: 0,
  feeCollectionRate: 0, payrollPct: 0,
  topExpenseCategories: [], highestIncomeMonth: "—", highestExpenseMonth: "—",
};

export default async function ReportsPage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now          = new Date();
  const currentYear  = String(now.getFullYear());
  const currentMonth = now.toISOString().slice(0, 7);
  const currentAY    = currentAcademicYear();

  const [{ data: institution }, { data: departments }] = await Promise.all([
    supabase.from("institutions").select("name").eq("id", id).single(),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);

  const [plResult, sumResult] = await Promise.all([
    getMonthlyPLReport(id, currentYear),
    getFinancialSummaryReport(id, { from: `${currentYear}-01-01`, to: `${currentYear}-12-31` }),
  ]);

  const breadcrumb = (
    <>
      <Link href="/finance" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Finance</Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{institution?.name ?? id}</span>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">Reports</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">

        <div className="flex-1 min-h-0 overflow-hidden">
          <ReportsClient
            institutionId={id}
            departments={departments ?? []}
            initialPL={plResult.success ? plResult.data : []}
            initialSummary={sumResult.success ? sumResult.data : EMPTY_SUMMARY}
            currentYear={currentYear}
            currentMonth={currentMonth}
            currentAY={currentAY}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
