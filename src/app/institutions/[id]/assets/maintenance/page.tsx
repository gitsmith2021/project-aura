import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAssets, getMaintenanceLogs } from "@/actions/assets";
import { MaintenanceBoard } from "@/components/assets/MaintenanceBoard";

type PageProps = { params: Promise<{ id: string }> };

export default async function AssetMaintenancePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [assetsRes, logsRes] = await Promise.all([getAssets(id), getMaintenanceLogs(id)]);

  return (
    <DashboardLayout>
      <MaintenanceBoard
        institutionId={id}
        assets={assetsRes.success ? assetsRes.data : []}
        initialLogs={logsRes.success ? logsRes.data : []}
      />
    </DashboardLayout>
  );
}
