import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import Link         from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ExpensesClient }  from "@/components/finance/ExpensesClient";
import {
  getExpenses, getExpenseSummary, getBudgets, getBudgetVsActuals, currentAY,
} from "@/actions/expenses";
import { createClient } from "@/utils/supabase/server";
import type { ExpenseSummary } from "@/types/finance";

type PageProps = { params: Promise<{ id: string }> };

const EMPTY_SUMMARY: ExpenseSummary = {
  totalExpenses: 0, totalExpensesAllTime: 0,
  byCategory: { utilities: 0, maintenance: 0, vendor: 0, events: 0, stationery: 0, infrastructure: 0, it: 0, other: 0 },
  byDepartment: [], topVendors: [],
};

export default async function ExpensesPage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now          = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const ay           = await currentAY();

  const [{ data: institution }, { data: departments }] = await Promise.all([
    supabase.from("institutions").select("name").eq("id", id).single(),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);

  const [expResult, sumResult, budResult, bvaResult] = await Promise.all([
    getExpenses(id, { page: 1, pageSize: 10, month: currentMonth }),
    getExpenseSummary(id, currentMonth),
    getBudgets(id, ay),
    getBudgetVsActuals(id, ay),
  ]);

  const breadcrumb = (
    <>
      <Link href="/finance" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Finance</Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{institution?.name ?? id}</span>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">Expenses</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">

        {!expResult.success && (
          <p className="shrink-0 mx-6 mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
            Failed to load expenses: {expResult.error}
          </p>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <ExpensesClient
            institutionId={id}
            initialExpenses={expResult.success ? expResult.data : []}
            initialTotal={expResult.success ? expResult.total : 0}
            summary={sumResult.success ? sumResult.data : EMPTY_SUMMARY}
            departments={departments ?? []}
            initialBudgets={budResult.success ? budResult.data : []}
            initialBudgetVsActuals={bvaResult.success ? bvaResult.data : []}
            currentMonth={currentMonth}
            currentAY={ay}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
