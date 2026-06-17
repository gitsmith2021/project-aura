import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAlumniAnnouncements } from "@/actions/alumni";
import { AlumniAnnouncementsManager } from "@/components/alumni/AlumniAnnouncementsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function AlumniAnnouncementsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [annRes, instRes] = await Promise.all([
    getAlumniAnnouncements(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <AlumniAnnouncementsManager
        institutionId={id}
        instSlug={slug}
        initial={annRes.success ? annRes.data : []}
      />
    </DashboardLayout>
  );
}
