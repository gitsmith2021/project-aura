import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAppraisal, getAppraisalActivities } from "@/actions/appraisals";
import { AppraisalReviewPanel } from "@/components/appraisals/AppraisalReviewPanel";

type PageProps = { params: Promise<{ id: string; appraisalId: string }> };

export default async function AppraisalReviewPage({ params }: PageProps) {
  const { id, appraisalId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [apprRes, actRes, instRes] = await Promise.all([
    getAppraisal(appraisalId),
    getAppraisalActivities(appraisalId),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  if (!apprRes.success) redirect(`/institutions/${id}/appraisals`);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl mx-auto p-6 space-y-5">
        <Link href={`/institutions/${slug}/appraisals`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600">
          <ChevronLeft size={14} /> All Appraisals
        </Link>
        <AppraisalReviewPanel
          institutionId={id}
          appraisal={apprRes.success ? apprRes.data : null}
          activities={actRes.success ? actRes.data : []}
        />
      </div>
    </DashboardLayout>
  );
}
