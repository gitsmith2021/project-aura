import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getKnowledgeAnalytics } from "@/actions/knowledgeHub";
import { KnowledgeAnalytics } from "@/components/knowledge-hub/KnowledgeAnalytics";

type PageProps = { params: Promise<{ id: string }> };

export default async function KnowledgeAnalyticsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Analytics is leadership-facing — and a non-admin only sees an RLS-scoped
  // subset, which would skew the numbers. Gate to admins / HODs.
  const { data: member } = await supabase.from("institution_members").select("role").eq("profile_id", user.id).maybeSingle();
  const role = (member?.role as string) ?? "";
  if (!["SUPER_ADMIN", "INST_ADMIN", "HOD", "DEPARTMENT_HEAD"].includes(role)) {
    redirect(`/institutions/${id}/knowledge-hub`);
  }

  const res = await getKnowledgeAnalytics(id);
  if (!res.success) {
    return (
      <DashboardLayout>
        <div className="w-full p-6"><div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{res.error}</div></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <KnowledgeAnalytics institutionId={id} resources={res.data.resources} facultyCount={res.data.facultyCount} />
    </DashboardLayout>
  );
}
