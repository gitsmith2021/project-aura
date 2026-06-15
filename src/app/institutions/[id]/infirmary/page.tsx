import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getTodaysVisits, getPendingFollowUps } from "@/actions/infirmary";
import { InfirmaryDashboard } from "@/components/infirmary/InfirmaryDashboard";

type PageProps = { params: Promise<{ id: string }> };

export default async function InfirmaryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [visitsRes, followUpsRes] = await Promise.all([
    getTodaysVisits(id),
    getPendingFollowUps(id),
  ]);

  return (
    <DashboardLayout>
      <InfirmaryDashboard
        institutionId={id}
        initialVisits={visitsRes.success ? visitsRes.data : []}
        initialFollowUps={followUpsRes.success ? followUpsRes.data : []}
      />
    </DashboardLayout>
  );
}
