import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAppraisals } from "@/actions/appraisals";
import { AppraisalsOverview } from "@/components/appraisals/AppraisalsOverview";

type PageProps = { params: Promise<{ id: string }> };

export default async function AppraisalsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [apprRes, ayRes, instRes] = await Promise.all([
    getAppraisals(id),
    supabase.from("academic_years").select("id, label, is_current").eq("institution_id", id).order("start_date", { ascending: false }),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const academicYears = (ayRes.data ?? []).map((y) => ({ id: y.id as string, label: y.label as string, is_current: y.is_current as boolean }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <AppraisalsOverview
        institutionId={id}
        instSlug={slug}
        academicYears={academicYears}
        initial={apprRes.success ? apprRes.data : []}
      />
    </DashboardLayout>
  );
}
