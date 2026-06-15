import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { IssueCardLauncher } from "@/components/id-cards/IssueCardLauncher";

type PageProps = { params: Promise<{ id: string }> };

export default async function IssueCardPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <DashboardLayout>
      <IssueCardLauncher institutionId={id} />
    </DashboardLayout>
  );
}
