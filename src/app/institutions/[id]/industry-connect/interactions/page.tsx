import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getInteractions, getMOUs } from "@/actions/industryConnect";
import { InteractionsManager } from "@/components/industry-connect/InteractionsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function IndustryInteractionsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [interactionsRes, mousRes] = await Promise.all([getInteractions(id), getMOUs(id)]);
  const partners = (mousRes.success ? mousRes.data : []).map((m) => ({ id: m.id, partnerName: m.partnerName }));

  return (
    <DashboardLayout>
      <InteractionsManager institutionId={id} initial={interactionsRes.success ? interactionsRes.data : []} partners={partners} />
    </DashboardLayout>
  );
}
