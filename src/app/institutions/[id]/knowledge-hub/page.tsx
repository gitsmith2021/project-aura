import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getResources } from "@/actions/knowledgeHub";
import { KnowledgeHubManager } from "@/components/knowledge-hub/KnowledgeHubManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function KnowledgeHubPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getResources(id);

  const [{ data: depts }, { data: member }, { data: staffRow }] = await Promise.all([
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
    supabase.from("institution_members").select("role, department_id").eq("profile_id", user.id).maybeSingle(),
    supabase.from("staff").select("id, department_id").eq("email", user.email ?? "").maybeSingle(),
  ]);

  const isAdmin = ["SUPER_ADMIN", "INST_ADMIN"].includes((member?.role as string) ?? "");
  const canUpload = isAdmin || !!staffRow; // staff (faculty) and admins may upload
  const currentDepartmentId =
    (staffRow?.department_id as string | undefined) ?? (member?.department_id as string | undefined) ?? null;

  if (!res.success) {
    return (
      <DashboardLayout>
        <div className="w-full p-6">
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{res.error}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <KnowledgeHubManager
        institutionId={id}
        initial={res.data}
        departments={(depts ?? []) as { id: string; name: string }[]}
        isAdmin={isAdmin}
        canUpload={canUpload}
        currentStaffId={(staffRow?.id as string | undefined) ?? null}
        currentDepartmentId={currentDepartmentId}
        currentUserId={user.id}
      />
    </DashboardLayout>
  );
}
