import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getFeedbackForms } from "@/actions/feedback";
import { FeedbackManager } from "@/components/feedback/FeedbackManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function FeedbackPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [formsRes, deptRes, staffRes] = await Promise.all([
    getFeedbackForms(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
    supabase.from("staff").select("id, full_name").eq("institution_id", id).eq("is_active", true).order("full_name"),
  ]);
  const departments = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));
  const staff = (staffRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string }));

  return (
    <DashboardLayout>
      <FeedbackManager institutionId={id} initial={formsRes.success ? formsRes.data : []} departments={departments} staff={staff} />
    </DashboardLayout>
  );
}
