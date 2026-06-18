import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getRoutes, getVehicles } from "@/actions/transport";
import { RoutesManager } from "@/components/transport/RoutesManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function TransportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [routesRes, vehiclesRes] = await Promise.all([getRoutes(id), getVehicles(id)]);
  const vehicles = (vehiclesRes.success ? vehiclesRes.data : []).map((v) => ({
    id: v.id, vehicle_number: v.vehicle_number, capacity: v.capacity,
  }));

  return (
    <DashboardLayout>
      <RoutesManager institutionId={id} initial={routesRes.success ? routesRes.data : []} vehicles={vehicles} />
    </DashboardLayout>
  );
}
