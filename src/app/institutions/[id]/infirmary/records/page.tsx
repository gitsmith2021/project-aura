import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getMedicalRecords } from "@/actions/infirmary";
import { MedicalRecordsManager } from "@/components/infirmary/MedicalRecordsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function MedicalRecordsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recordsRes = await getMedicalRecords(id);

  return (
    <DashboardLayout>
      <MedicalRecordsManager
        institutionId={id}
        initialRecords={recordsRes.success ? recordsRes.data : []}
      />
    </DashboardLayout>
  );
}
