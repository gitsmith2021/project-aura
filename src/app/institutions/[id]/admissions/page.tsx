import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getApplications } from "@/actions/admissions";
import { ApplicationKanban } from "@/components/admissions/ApplicationKanban";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdmissionsAdminPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [appsRes, instRes] = await Promise.all([
    getApplications(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <ApplicationKanban institutionId={id} instSlug={slug} initial={appsRes.success ? appsRes.data : []} />
    </DashboardLayout>
  );
}
