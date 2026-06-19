import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getMOUs } from "@/actions/industryConnect";
import { IndustryConnectManager } from "@/components/industry-connect/IndustryConnectManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function IndustryConnectPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getMOUs(id);

  return (
    <DashboardLayout>
      <IndustryConnectManager institutionId={id} initial={res.success ? res.data : []} />
    </DashboardLayout>
  );
}
