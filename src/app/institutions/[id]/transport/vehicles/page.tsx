import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getVehicles, getExpiryAlerts } from "@/actions/transport";
import { VehiclesManager } from "@/components/transport/VehiclesManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function VehiclesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [vehiclesRes, alertsRes] = await Promise.all([getVehicles(id), getExpiryAlerts(id)]);

  return (
    <DashboardLayout>
      <VehiclesManager
        institutionId={id}
        initial={vehiclesRes.success ? vehiclesRes.data : []}
        alerts={alertsRes.success ? alertsRes.data : []}
      />
    </DashboardLayout>
  );
}
