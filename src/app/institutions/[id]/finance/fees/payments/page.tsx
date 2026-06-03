import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PaymentsClient }  from "@/components/finance/PaymentsClient";
import { getFeePayments, getPaymentSummary } from "@/actions/feePayments";
import { createClient } from "@/utils/supabase/server";
import type { PaymentSummary } from "@/types/finance";

type PageProps = {
  params: Promise<{ id: string }>;
};

const EMPTY_SUMMARY: PaymentSummary = {
  totalCollected:    0,
  totalPending:      0,
  totalFailed:       0,
  totalTransactions: 0,
  countByMode:       { cash: 0, upi: 0, razorpay: 0, bank_transfer: 0, cheque: 0, dd: 0 },
};

export default async function FeePaymentsPage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch institution name + fee structures in parallel
  const [{ data: institution }, { data: feeStructures }] = await Promise.all([
    supabase.from("institutions").select("name").eq("id", id).single(),
    supabase
      .from("fee_structures")
      .select("id, name, amount")
      .eq("institution_id", id)
      .eq("is_active", true)
      .order("name"),
  ]);

  // Fetch payments + summary in parallel (server actions — run inline on server)
  const [paymentsResult, summaryResult] = await Promise.all([
    getFeePayments(id, { page: 1, pageSize: 10 }),
    getPaymentSummary(id),
  ]);

  const initialPayments = paymentsResult.success ? paymentsResult.data  : [];
  const initialTotal    = paymentsResult.success ? paymentsResult.total : 0;
  const summary         = summaryResult.success  ? summaryResult.data   : EMPTY_SUMMARY;
  const institutionName = institution?.name ?? "Institution";

  const breadcrumb = (
    <>
      <Link href="/finance" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
        Finance
      </Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{institutionName}</span>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <Link
        href={`/institutions/${id}/finance/fees`}
        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
      >
        Fee Structures
      </Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">Payments</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">

        {/* Back link + error banners */}
        <div className="shrink-0 px-6 pt-3 pb-1 flex flex-col gap-2">
          <Link
            href={`/institutions/${id}/finance/fees`}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 uppercase tracking-wider transition-colors w-fit"
          >
            <ArrowLeft size={12} />
            Back to Fee Structures
          </Link>

          {!paymentsResult.success && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
              Failed to load payments: {paymentsResult.error}
            </p>
          )}
        </div>

        {/* Client shell */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <PaymentsClient
            institutionId={id}
            institutionName={institutionName}
            initialPayments={initialPayments}
            initialTotal={initialTotal}
            summary={summary}
            feeStructures={feeStructures ?? []}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
