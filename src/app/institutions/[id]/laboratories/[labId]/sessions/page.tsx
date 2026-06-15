import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getLaboratory, getLabBatches, getLabExperiments, getLabSessions, getLabRoster } from "@/actions/laboratories";
import { SessionLogger } from "@/components/laboratories/SessionLogger";

type PageProps = { params: Promise<{ id: string; labId: string }> };

export default async function LabSessionsPage({ params }: PageProps) {
  const { labId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const labRes = await getLaboratory(labId);
  if (!labRes.success) notFound();
  const lab = labRes.data;

  const [batchRes, expRes, sessRes, rosterRes] = await Promise.all([
    getLabBatches(labId),
    getLabExperiments(labId),
    getLabSessions(labId),
    getLabRoster(lab.institution_id, lab.department_id),
  ]);

  return (
    <DashboardLayout>
      <SessionLogger
        lab={lab}
        batches={batchRes.success ? batchRes.data : []}
        experiments={expRes.success ? expRes.data : []}
        roster={rosterRes.success ? rosterRes.data : []}
        initialSessions={sessRes.success ? sessRes.data : []}
      />
    </DashboardLayout>
  );
}
