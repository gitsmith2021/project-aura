import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getGrievance } from "@/actions/grievances";
import { GrievanceDetail } from "@/components/grievances/GrievanceDetail";

type PageProps = { params: Promise<{ id: string; grievanceId: string }> };

export default async function GrievanceDetailPage({ params }: PageProps) {
  const { id, grievanceId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [grievRes, staffRes, instRes] = await Promise.all([
    getGrievance(grievanceId),
    supabase.from("staff").select("id, full_name").eq("institution_id", id).eq("is_active", true).order("full_name"),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);
  if (!grievRes.success) notFound();

  const staffOptions = (staffRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <GrievanceDetail
        institutionId={id}
        instSlug={slug}
        staffOptions={staffOptions}
        initial={grievRes.data}
      />
    </DashboardLayout>
  );
}
