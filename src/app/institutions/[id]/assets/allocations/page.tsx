import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAllocations } from "@/actions/assets";
import { AllocationsTable } from "@/components/assets/AllocationsTable";

type PageProps = { params: Promise<{ id: string }> };

export default async function AssetAllocationsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getAllocations(id);

  return (
    <DashboardLayout>
      <AllocationsTable institutionId={id} initial={res.success ? res.data : []} />
    </DashboardLayout>
  );
}
