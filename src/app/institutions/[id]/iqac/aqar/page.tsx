import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAqar } from "@/actions/iqac";
import { AqarView } from "@/components/iqac/AqarView";

type PageProps = { params: Promise<{ id: string }> };

export default async function AqarPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: inst }, { data: yearsData }] = await Promise.all([
    supabase.from("institutions").select("name").eq("id", id).maybeSingle(),
    supabase.from("academic_years").select("id, label, is_current").eq("institution_id", id).order("start_date", { ascending: false }),
  ]);
  const years = (yearsData ?? []).map((y) => ({ id: y.id as string, label: y.label as string, is_current: !!y.is_current }));
  const currentYearId = years.find((y) => y.is_current)?.id ?? null;
  const aqarRes = await getAqar(id, currentYearId);

  if (!aqarRes.success) {
    return (
      <DashboardLayout>
        <div className="w-full p-6"><div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{aqarRes.error}</div></div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <AqarView institutionId={id} institutionName={(inst?.name as string) ?? "Institution"} years={years} initial={aqarRes.data} />
    </DashboardLayout>
  );
}
