import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getLendings } from "@/actions/library";
import { LendingsTable } from "@/components/library/LendingsTable";

type PageProps = { params: Promise<{ id: string }> };

export default async function OverduePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getLendings(id, { openOnly: true });
  const lendings = res.success ? res.data : [];

  return (
    <DashboardLayout>
      <div className="px-6 pt-6 pb-6 w-full">
        <Link href={`/institutions/${id}/library`} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-2">
          <ChevronLeft size={14} /> Library
        </Link>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-1">Overdue Books</h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">Books past their due date, with the fine accrued so far (₹2/day).</p>
        <LendingsTable institutionId={id} initial={lendings} overdueOnly />
      </div>
    </DashboardLayout>
  );
}
