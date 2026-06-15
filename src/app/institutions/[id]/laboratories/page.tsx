import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getLaboratories, getLabAssistants } from "@/actions/laboratories";
import { LaboratoriesManager } from "@/components/laboratories/LaboratoriesManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function LaboratoriesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [labsRes, deptRes, assistRes] = await Promise.all([
    getLaboratories(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
    getLabAssistants(id),
  ]);
  const labs = labsRes.success ? labsRes.data : [];
  const departments = (deptRes.data ?? []) as { id: string; name: string }[];
  const assistants = assistRes.success ? assistRes.data : [];

  return (
    <DashboardLayout>
      <LaboratoriesManager institutionId={id} initial={labs} departments={departments} assistants={assistants} />
    </DashboardLayout>
  );
}
