import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getJobPosting, getJobApplications } from "@/actions/recruitment";
import { ApplicationPipeline } from "@/components/recruitment/ApplicationPipeline";
import { AddApplicantPanel } from "@/components/recruitment/AddApplicantPanel";
import {
  JOB_STATUS_COLORS, JOB_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPE_COLORS,
  recruitmentStats,
} from "@/lib/recruitment";

type PageProps = { params: Promise<{ id: string; jobId: string }> };

export default async function JobPipelinePage({ params }: PageProps) {
  const { id, jobId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [postingRes, appsRes] = await Promise.all([
    getJobPosting(jobId),
    getJobApplications(jobId),
  ]);

  if (!postingRes.success) redirect(`/institutions/${id}/recruitment`);
  const posting = postingRes.data;
  const applications = appsRes.success ? appsRes.data : [];
  const stats = recruitmentStats(applications);

  return (
    <DashboardLayout>
      <div className="w-full space-y-6 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
          <Link
            href={`/institutions/${id}/recruitment`}
            className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <ChevronLeft size={14} />
            Recruitment
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">{posting.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${JOB_STATUS_COLORS[posting.status]}`}>
                {JOB_STATUS_LABELS[posting.status]}
              </span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${EMPLOYMENT_TYPE_COLORS[posting.employment_type]}`}>
                {EMPLOYMENT_TYPE_LABELS[posting.employment_type]}
              </span>
              {posting.departments?.name && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {posting.departments.name}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{posting.title}</h1>
            {posting.description && (
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2">{posting.description}</p>
            )}
          </div>

          <AddApplicantPanel
            institutionId={id}
            jobPostingId={jobId}
          />
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Total",     value: stats.total },
            { label: "Active",    value: stats.active },
            { label: "Interview", value: stats.inInterview },
            { label: "Offered",   value: stats.offered },
            { label: "Joined",    value: stats.joined },
            { label: "Rejected",  value: stats.rejected },
          ].map(s => (
            <div key={s.label} className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Kanban */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[900px]">
            <ApplicationPipeline
              applications={applications}
              institutionId={id}
              jobId={jobId}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
