import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getSchemes, getApplications } from "@/actions/scholarships";
import { ScholarshipsDashboard } from "@/components/scholarships/ScholarshipsDashboard";

type PageProps = { params: Promise<{ id: string }> };

export default async function ScholarshipsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [schemesRes, appsRes, ayRes, instRes] = await Promise.all([
    getSchemes(id),
    getApplications(id),
    supabase.from("academic_years").select("id, label, is_current").eq("institution_id", id).order("start_date", { ascending: false }),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const academicYears = (ayRes.data ?? []).map((y) => ({ id: y.id as string, label: y.label as string, is_current: y.is_current as boolean }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <ScholarshipsDashboard
        institutionId={id}
        instSlug={slug}
        academicYears={academicYears}
        schemes={schemesRes.success ? schemesRes.data : []}
        applications={appsRes.success ? appsRes.data : []}
      />
    </DashboardLayout>
  );
}
