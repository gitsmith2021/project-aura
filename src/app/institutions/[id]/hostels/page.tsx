import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getHostels } from "@/actions/hostels";
import { HostelsManager } from "@/components/hostels/HostelsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function HostelsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getHostels(id);
  const hostels = res.success ? res.data : [];

  return (
    <DashboardLayout>
      <HostelsManager institutionId={id} initial={hostels} />
    </DashboardLayout>
  );
}
