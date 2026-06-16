import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link          from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Form16Template }  from "@/components/finance/Form16Template";
import { FyPicker }        from "@/components/finance/FyPicker";
import { createClient } from "@/utils/supabase/server";
import { getStatutoryConfig, getForm16Data } from "@/actions/statutoryPayroll";
import { fyFromMonth } from "@/lib/statutoryPayroll";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ fy?: string }> };

export default async function Form16Page({ params, searchParams }: PageProps) {
  const { id }        = await params;
  const { fy: qFy }   = await searchParams;

  const cookieStore = await cookies();
  const supabase    = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const currentMonth = new Date().toISOString().slice(0, 7);
  const defaultFy    = fyFromMonth(currentMonth);
  const fyStart      = qFy ? parseInt(qFy, 10) : defaultFy;

  const { data: institution } = await supabase
    .from("institutions").select("name").eq("id", id).single();

  const [configResult, dataResult] = await Promise.all([
    getStatutoryConfig(id),
    getForm16Data(id, fyStart),
  ]);

  const tanNumber = configResult.success && configResult.data
    ? configResult.data.tan_number
    : null;
  const pfNumber = configResult.success && configResult.data
    ? configResult.data.pf_number
    : null;

  // Last 5 financial years
  const fyOptions = Array.from({ length: 5 }, (_, i) => defaultFy - i);

  const breadcrumb = (
    <>
      <Link href={`/institutions/${id}/finance/payroll/statutory`} className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors">Statutory Payroll</Link>
      <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
      <span className="font-semibold text-slate-900 dark:text-slate-100">Form 16</span>
    </>
  );

  return (
    <DashboardLayout breadcrumb={breadcrumb}>
      <div className="px-6 pt-4 pb-6 space-y-5 w-full">

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Form 16</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Annual TDS certificate (Sec. 192) — {institution?.name}</p>
          </div>
          <FyPicker fyOptions={fyOptions} current={fyStart} />
        </div>

        {!configResult.success || !configResult.data ? (
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            Statutory payroll configuration not set. Please{" "}
            <Link href={`/institutions/${id}/finance/payroll/statutory`} className="underline font-medium">
              configure TAN and PF/ESI settings
            </Link>{" "}
            before generating Form 16.
          </div>
        ) : null}

        {dataResult.success ? (
          <Form16Template
            institutionName={institution?.name ?? "Institution"}
            tanNumber={tanNumber}
            pfNumber={pfNumber}
            fyStart={fyStart}
            rows={dataResult.data}
          />
        ) : (
          <div className="flex items-center justify-center py-16 text-sm text-rose-400 border-2 border-dashed border-rose-200 dark:border-rose-800 rounded-xl">
            {dataResult.error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
