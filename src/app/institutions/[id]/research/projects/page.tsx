import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getProjects } from "@/actions/research";
import { ProjectsRegistry } from "@/components/research/ProjectsRegistry";

type PageProps = { params: Promise<{ id: string }> };

export default async function ResearchProjectsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projRes, staffRes, deptRes, instRes] = await Promise.all([
    getProjects(id),
    supabase.from("staff").select("id, full_name").eq("institution_id", id).eq("is_active", true).order("full_name"),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const staff = (staffRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string }));
  const departments = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <ProjectsRegistry institutionId={id} instSlug={slug} staff={staff} departments={departments} initial={projRes.success ? projRes.data : []} />
    </DashboardLayout>
  );
}
