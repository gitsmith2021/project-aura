import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { generateWorkloadReport } from "@/actions/appraisals";
import { WorkloadTable } from "@/components/appraisals/WorkloadTable";

type PageProps = { params: Promise<{ id: string }> };

export default async function WorkloadReportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [wlRes, instRes] = await Promise.all([
    generateWorkloadReport({ institutionId: id }),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-5">
        <Link href={`/institutions/${slug}/appraisals`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600">
          <ChevronLeft size={14} /> Appraisals
        </Link>
        <WorkloadTable institutionId={id} initial={wlRes.success ? wlRes.data : []} />
      </div>
    </DashboardLayout>
  );
}
