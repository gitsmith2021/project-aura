import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getMonthlyReport } from "@/actions/staffAttendance";
import { MonthlyReport } from "@/components/staff-attendance/MonthlyReport";

type PageProps = { params: Promise<{ id: string }> };

export default async function StaffAttendanceReportsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const month = new Date().toISOString().slice(0, 7);
  const [repRes, instRes] = await Promise.all([
    getMonthlyReport(id, month),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-5">
        <Link href={`/institutions/${slug}/staff-attendance`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600"><ChevronLeft size={14} /> Daily Register</Link>
        <MonthlyReport institutionId={id} initialMonth={month} initial={repRes.success ? repRes.data : []} />
      </div>
    </DashboardLayout>
  );
}
