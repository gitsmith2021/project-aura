import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getNotices } from "@/actions/notices";
import { NoticesManager } from "@/components/notices/NoticesManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function NoticesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getNotices(id);
  const notices = result.success ? result.data : [];

  return (
    <DashboardLayout>
      <NoticesManager institutionId={id} initial={notices} />
    </DashboardLayout>
  );
}
