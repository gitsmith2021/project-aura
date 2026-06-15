import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getCards } from "@/actions/smartCards";
import { SmartCardsManager } from "@/components/id-cards/SmartCardsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function SmartCardsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await getCards(id);

  return (
    <DashboardLayout>
      <SmartCardsManager institutionId={id} initial={res.success ? res.data : []} />
    </DashboardLayout>
  );
}
