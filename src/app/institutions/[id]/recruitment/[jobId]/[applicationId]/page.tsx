import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getJobApplication } from "@/actions/recruitment";
import { ApplicationDetailView } from "@/components/recruitment/ApplicationDetailView";
import { APPLICATION_STATUS_COLORS, APPLICATION_STATUS_LABELS } from "@/lib/recruitment";

type PageProps = { params: Promise<{ id: string; jobId: string; applicationId: string }>; searchParams: Promise<{ action?: string }> };

export default async function ApplicationDetailPage({ params, searchParams }: PageProps) {
  const { id, jobId, applicationId } = await params;
  const { action } = await searchParams;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [appRes, deptRes] = await Promise.all([
    getJobApplication(applicationId),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);

  if (!appRes.success) redirect(`/institutions/${id}/recruitment/${jobId}`);
  const application = appRes.data;
  const departments = (deptRes.data ?? []).map(d => ({ id: d.id as string, name: d.name as string }));

  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl mx-auto space-y-6 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          <Link href={`/institutions/${id}/recruitment`} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Recruitment
          </Link>
          <span>/</span>
          <Link href={`/institutions/${id}/recruitment/${jobId}`} className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {application.job_postings?.title ?? "Pipeline"}
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">{application.applicant_name}</span>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${APPLICATION_STATUS_COLORS[application.status]}`}>
            {APPLICATION_STATUS_LABELS[application.status]}
          </span>
          <ChevronLeft size={14} className="text-slate-400 rotate-180" />
          <span className="text-[13px] text-slate-500 dark:text-slate-400">
            Applied {new Date(application.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>

        <ApplicationDetailView
          application={application}
          institutionId={id}
          departments={departments}
          autoOpenHire={action === "hire"}
        />
      </div>
    </DashboardLayout>
  );
}
