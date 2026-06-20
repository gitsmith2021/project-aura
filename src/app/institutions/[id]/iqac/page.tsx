import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getIqacOverview } from "@/actions/iqac";
import { IqacDashboard } from "@/components/iqac/IqacDashboard";

type PageProps = { params: Promise<{ id: string }> };

export default async function IqacPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getIqacOverview(id);
  if (!res.success) {
    return (
      <DashboardLayout>
        <div className="w-full p-6"><div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-6 text-[13px] text-rose-600 dark:text-rose-300">{res.error}</div></div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <IqacDashboard institutionId={id} data={res.data} />
    </DashboardLayout>
  );
}
