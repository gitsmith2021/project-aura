import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getGrievances } from "@/actions/grievances";
import { GrievanceManager } from "@/components/grievances/GrievanceManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function GrievancesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [grievRes, instRes] = await Promise.all([
    getGrievances(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <GrievanceManager
        institutionId={id}
        instSlug={slug}
        initial={grievRes.success ? grievRes.data : []}
      />
    </DashboardLayout>
  );
}
