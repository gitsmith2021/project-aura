import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FeeStructuresClient } from "@/components/finance/FeeStructuresClient";
import { getFeeStructures } from "@/actions/feeStructures";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FeeStructuresPage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Guard: must be authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch institution name for breadcrumb
  const { data: institution } = await supabase
    .from("institutions")
    .select("name")
    .eq("id", id)
    .single();

  // Fetch fee structures (server action — runs inline on server)
  const result = await getFeeStructures(id);
  const feeStructures = result.success ? result.data : [];

  const breadcrumb = (
    <>
      <Link href="/finance" className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
        Finance
      </Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
        {institution?.name ?? id}
      </span>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">Fee Structures</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden">

        {/* ── Back link + error banner ── */}
        <div className="shrink-0 px-6 pt-3 pb-1 flex flex-col gap-2">
          <Link
            href="/finance"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 uppercase tracking-wider transition-colors w-fit"
          >
            <ArrowLeft size={12} />
            Back to Finance
          </Link>

          {!result.success && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
              Failed to load fee structures: {result.error}
            </p>
          )}
        </div>

        {/* ── Client shell — handles all interactivity ── */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <FeeStructuresClient
            institutionId={id}
            feeStructures={feeStructures}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
