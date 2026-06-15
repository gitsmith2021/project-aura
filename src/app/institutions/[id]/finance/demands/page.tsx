import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getDemands, getGenerationTargets } from "@/actions/feeDemands";
import { DemandsManager } from "@/components/finance/DemandsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function FeeDemandsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [demandsRes, targetsRes] = await Promise.all([getDemands(id), getGenerationTargets(id)]);

  return (
    <DashboardLayout>
      <DemandsManager
        institutionId={id}
        initial={demandsRes.success ? demandsRes.data : []}
        targets={targetsRes.success ? targetsRes.data : { structures: [], departments: [] }}
      />
    </DashboardLayout>
  );
}
