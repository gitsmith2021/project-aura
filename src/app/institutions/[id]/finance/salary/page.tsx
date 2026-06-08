import { cookies }  from "next/headers";
import { redirect } from "next/navigation";
import Link         from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SalaryClient }    from "@/components/finance/SalaryClient";
import {
  getSalaryStructures, getStaffWithoutSalaryStructure,
  getDisbursements, getSalarySummary,
} from "@/actions/salary";
import { createClient } from "@/utils/supabase/server";
import type { SalarySummary } from "@/types/finance";

type PageProps = { params: Promise<{ id: string }> };

const EMPTY_SUMMARY: SalarySummary = {
  totalStaff: 0, structuresSetup: 0,
  pendingDisbursements: 0, processedDisbursements: 0,
  totalPayroll: 0, totalDisbursed: 0,
};

export default async function SalaryPage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: institution } = await supabase
    .from("institutions").select("name").eq("id", id).single();

  const [structuresResult, staffWithoutResult, disbResult, summaryResult] = await Promise.all([
    getSalaryStructures(id),
    getStaffWithoutSalaryStructure(id),
    getDisbursements(id, currentMonth),
    getSalarySummary(id, currentMonth),
  ]);

  const breadcrumb = (
    <>
      <Link href="/finance" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Finance</Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{institution?.name ?? id}</span>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">Salary</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">

        {(!structuresResult.success || !disbResult.success) && (
          <p className="shrink-0 mx-6 mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
            {!structuresResult.success ? structuresResult.error : disbResult.success ? "" : disbResult.error}
          </p>
        )}

        <div className="flex-1 min-h-0 overflow-hidden">
          <SalaryClient
            institutionId={id}
            initialStructures={structuresResult.success ? structuresResult.data : []}
            initialStaffWithout={staffWithoutResult.success ? staffWithoutResult.data : []}
            initialDisbursements={disbResult.success ? disbResult.data : []}
            summary={summaryResult.success ? summaryResult.data : EMPTY_SUMMARY}
            currentMonth={currentMonth}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
