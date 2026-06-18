import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getPublications } from "@/actions/research";
import { PublicationsDirectory } from "@/components/research/PublicationsDirectory";

type PageProps = { params: Promise<{ id: string }> };

export default async function PublicationsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [pubRes, staffRes, instRes] = await Promise.all([
    getPublications(id),
    supabase.from("staff").select("id, full_name").eq("institution_id", id).eq("is_active", true).order("full_name"),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const staff = (staffRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <PublicationsDirectory institutionId={id} instSlug={slug} staff={staff} initial={pubRes.success ? pubRes.data : []} />
    </DashboardLayout>
  );
}
