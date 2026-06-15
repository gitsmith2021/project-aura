import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAssets, getCategories } from "@/actions/assets";
import { AssetsManager } from "@/components/assets/AssetsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function AssetsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [assetsRes, catRes] = await Promise.all([getAssets(id), getCategories(id)]);

  return (
    <DashboardLayout>
      <AssetsManager
        institutionId={id}
        initialAssets={assetsRes.success ? assetsRes.data : []}
        initialCategories={catRes.success ? catRes.data : []}
      />
    </DashboardLayout>
  );
}
