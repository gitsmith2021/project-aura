"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Briefcase, Users, CalendarClock, UserCheck } from "lucide-react";
import { JobPostingCard } from "./JobPostingCard";
import { JobPostingDrawer } from "./JobPostingDrawer";
import { getJobPostings } from "@/actions/recruitment";
import { jobPostingStats, type JobPosting } from "@/lib/recruitment";

type Dept = { id: string; name: string };

export function RecruitmentBoard({
  institutionId,
  initial,
  departments,
  today,
}: {
  institutionId: string;
  initial: JobPosting[];
  departments: Dept[];
  today: string;
}) {
  const router = useRouter();
  const [postings, setPostings] = useState(initial);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editPosting, setEditPosting] = useState<JobPosting | null>(null);

  const stats = jobPostingStats(postings);
  const totalApps = postings.reduce((acc, p) => acc + (p.application_count ?? 0), 0);

  function openCreate() { setEditPosting(null); setDrawerOpen(true); }
  function openEdit(p: JobPosting) { setEditPosting(p); setDrawerOpen(true); }

  async function onSaved() {
    setDrawerOpen(false);
    const r = await getJobPostings(institutionId);
    if (r.success) setPostings(r.data);
    router.refresh();
  }

  const openPostings   = postings.filter(p => p.status === "open");
  const holdPostings   = postings.filter(p => p.status === "on_hold");
  const closedPostings = postings.filter(p => p.status === "closed");

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recruitment</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
            Manage job postings and the hiring pipeline
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-[13px] font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus size={16} />
          New Job Posting
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Open Roles",         value: stats.open,           icon: <Briefcase size={18} className="text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-950/20" },
          { label: "Total Applications", value: totalApps,            icon: <Users size={18} className="text-blue-500" />,        bg: "bg-blue-50 dark:bg-blue-950/20" },
          { label: "On Hold",            value: stats.on_hold,        icon: <CalendarClock size={18} className="text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-950/20" },
          { label: "Total Vacancies",    value: stats.totalVacancies, icon: <UserCheck size={18} className="text-violet-500" />,   bg: "bg-violet-50 dark:bg-violet-950/20" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
            {s.icon}
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Postings sections */}
      <div className="space-y-6">
        {openPostings.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Open Positions ({openPostings.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPostings.map(p => (
                <JobPostingCard key={p.id} posting={p} institutionId={institutionId} today={today} onEdit={openEdit} />
              ))}
            </div>
          </section>
        )}

        {holdPostings.length > 0 && (
          <section>
            <h2 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              On Hold ({holdPostings.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {holdPostings.map(p => (
                <JobPostingCard key={p.id} posting={p} institutionId={institutionId} today={today} onEdit={openEdit} />
              ))}
            </div>
          </section>
        )}

        {closedPostings.length > 0 && (
          <details>
            <summary className="cursor-pointer text-[13px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider list-none flex items-center gap-2 select-none mb-3">
              Closed / Filled ({closedPostings.length})
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {closedPostings.map(p => (
                <JobPostingCard key={p.id} posting={p} institutionId={institutionId} today={today} onEdit={openEdit} />
              ))}
            </div>
          </details>
        )}

        {postings.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-600">
            <Briefcase size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-[14px] font-medium">No job postings yet</p>
            <p className="text-[12px] mt-1">Create your first posting to start the hiring pipeline.</p>
          </div>
        )}
      </div>

      <JobPostingDrawer
        open={drawerOpen}
        posting={editPosting}
        institutionId={institutionId}
        departments={departments}
        onClose={() => setDrawerOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}
