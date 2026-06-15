import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getPurchaseOrder } from "@/actions/purchaseOrders";
import { PurchaseOrderDetail } from "@/components/vendors/PurchaseOrderDetail";

type PageProps = { params: Promise<{ id: string; poId: string }> };

export default async function PurchaseOrderDetailPage({ params }: PageProps) {
  const { id, poId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getPurchaseOrder(poId);
  if (!res.success) notFound();

  return (
    <DashboardLayout>
      <PurchaseOrderDetail institutionId={id} po={res.data} />
    </DashboardLayout>
  );
}
