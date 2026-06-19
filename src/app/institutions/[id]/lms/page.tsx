import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ClipboardList, Table2, ChevronRight, FileStack } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getLmsSubjects } from "@/actions/studyMaterials";

type PageProps = { params: Promise<{ id: string }> };

export default async function LmsOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getLmsSubjects(id);
  const subjects = res.success ? res.data : [];

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FileStack size={22} className="text-violet-600" /> E-Learning (LMS)</h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">Study materials, assignments and the gradebook — organised by subject.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/institutions/${id}/lms/assignments`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><ClipboardList size={15} /> Assignments</Link>
            <Link href={`/institutions/${id}/lms/gradebook`} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"><Table2 size={15} /> Gradebook</Link>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">No active subjects found.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => (
              <Link key={s.id} href={`/institutions/${id}/lms/${s.id}`}
                className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 dark:text-white group-hover:text-violet-600 truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{[s.code, s.departmentName, s.semester ? `Sem ${s.semester}` : null].filter(Boolean).join(" · ")}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-violet-500 shrink-0" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"><BookOpen size={11} /> {s.materialCount} materials</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"><ClipboardList size={11} /> {s.assignmentCount} assignments</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
