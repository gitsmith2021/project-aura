import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getVisitors, getOutpasses } from "@/actions/gateManagement";
import { GateDashboard } from "@/components/gate/GateDashboard";

type PageProps = { params: Promise<{ id: string }> };

export default async function GatePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [visitorsRes, outpassRes] = await Promise.all([
    getVisitors(id, { activeOnly: true }),
    getOutpasses(id),
  ]);

  return (
    <DashboardLayout>
      <GateDashboard
        institutionId={id}
        activeVisitors={visitorsRes.success ? visitorsRes.data : []}
        outpasses={outpassRes.success ? outpassRes.data : []}
      />
    </DashboardLayout>
  );
}
