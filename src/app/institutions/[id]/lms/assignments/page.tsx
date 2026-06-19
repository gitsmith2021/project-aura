import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAssignments } from "@/actions/lmsAssignments";
import { AssignmentsManager } from "@/components/lms/AssignmentsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function LmsAssignmentsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [assignmentsRes, subjectsRes] = await Promise.all([
    getAssignments(id),
    supabase.from("subjects").select("id, name").eq("institution_id", id).eq("is_active", true).order("name"),
  ]);
  const subjects = (subjectsRes.data ?? []).map((s) => ({ id: s.id as string, name: s.name as string }));

  return (
    <DashboardLayout>
      <div className="w-full p-6 space-y-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardList size={22} className="text-violet-600" /> Assignments</h1>
        <p className="text-[13px] text-slate-500 dark:text-slate-400">Create assignments, set deadlines and grade submissions across all subjects.</p>
        <div className="pt-4">
          <AssignmentsManager
            institutionId={id}
            subjects={subjects}
            initial={assignmentsRes.success ? assignmentsRes.data : []}
            gradeBase={`/institutions/${id}/lms/assignments`}
            gradeSuffix="/submissions"
            heading="All assignments"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
