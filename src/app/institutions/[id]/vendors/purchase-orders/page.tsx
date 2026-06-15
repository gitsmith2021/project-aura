import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getPurchaseOrders, getPOFormData } from "@/actions/purchaseOrders";
import { PurchaseOrdersList } from "@/components/vendors/PurchaseOrdersList";

type PageProps = { params: Promise<{ id: string }> };

export default async function PurchaseOrdersPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [poRes, formRes] = await Promise.all([getPurchaseOrders(id), getPOFormData(id)]);
  const form = formRes.success ? formRes.data : { vendors: [], departments: [], staff: [] };

  return (
    <DashboardLayout>
      <PurchaseOrdersList institutionId={id} initial={poRes.success ? poRes.data : []} form={form} />
    </DashboardLayout>
  );
}
