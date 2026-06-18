import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getDepartmentBudgets } from "@/actions/budgets";
import { BudgetsOverview } from "@/components/finance/BudgetsOverview";

type PageProps = { params: Promise<{ id: string }> };

export default async function BudgetsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [ayRes, instRes] = await Promise.all([
    supabase.from("academic_years").select("id, label, is_current").eq("institution_id", id).order("start_date", { ascending: false }),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const academicYears = (ayRes.data ?? []).map((y) => ({ id: y.id as string, label: y.label as string, is_current: y.is_current as boolean }));
  const slug = (instRes.data?.slug as string) ?? id;
  const ayId = academicYears.find((y) => y.is_current)?.id ?? academicYears[0]?.id ?? "";

  const rowsRes = ayId ? await getDepartmentBudgets(id, ayId) : null;

  return (
    <DashboardLayout>
      <BudgetsOverview
        institutionId={id}
        instSlug={slug}
        academicYears={academicYears}
        initialAyId={ayId}
        initialRows={rowsRes?.success ? rowsRes.data : []}
      />
    </DashboardLayout>
  );
}
