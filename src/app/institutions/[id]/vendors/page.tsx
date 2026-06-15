import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getVendors } from "@/actions/vendors";
import { VendorsManager } from "@/components/vendors/VendorsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function VendorsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getVendors(id);

  return (
    <DashboardLayout>
      <VendorsManager institutionId={id} initial={res.success ? res.data : []} />
    </DashboardLayout>
  );
}
