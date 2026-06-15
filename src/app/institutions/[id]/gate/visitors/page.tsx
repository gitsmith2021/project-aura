import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getVisitors } from "@/actions/gateManagement";
import { VisitorsManager } from "@/components/gate/VisitorsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function GateVisitorsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getVisitors(id);

  return (
    <DashboardLayout>
      <VisitorsManager institutionId={id} initial={res.success ? res.data : []} />
    </DashboardLayout>
  );
}
