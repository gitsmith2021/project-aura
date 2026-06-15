import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getLaboratory, getLabExperiments, getLabBatches } from "@/actions/laboratories";
import { LabDetail } from "@/components/laboratories/LabDetail";

type PageProps = { params: Promise<{ id: string; labId: string }> };

export default async function LaboratoryDetailPage({ params }: PageProps) {
  const { labId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [labRes, expRes, batchRes] = await Promise.all([
    getLaboratory(labId),
    getLabExperiments(labId),
    getLabBatches(labId),
  ]);
  if (!labRes.success) notFound();

  return (
    <DashboardLayout>
      <LabDetail
        lab={labRes.data}
        initialExperiments={expRes.success ? expRes.data : []}
        initialBatches={batchRes.success ? batchRes.data : []}
      />
    </DashboardLayout>
  );
}
