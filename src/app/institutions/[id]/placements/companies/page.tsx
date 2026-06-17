import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getCompanies } from "@/actions/placements";
import { CompaniesManager } from "@/components/placements/CompaniesManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function PlacementCompaniesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [companiesRes, instRes] = await Promise.all([
    getCompanies(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <CompaniesManager institutionId={id} instSlug={slug} initial={companiesRes.success ? companiesRes.data : []} />
    </DashboardLayout>
  );
}
