import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getIncident, getActions } from "@/actions/disciplinary";
import { IncidentDetail } from "@/components/disciplinary/IncidentDetail";

type PageProps = { params: Promise<{ id: string; incidentId: string }> };

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id, incidentId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [incRes, actsRes, instRes] = await Promise.all([
    getIncident(incidentId),
    getActions(incidentId),
    supabase.from("institutions").select("name, slug").eq("id", id).maybeSingle(),
  ]);
  if (!incRes.success) redirect(`/institutions/${id}/disciplinary`);
  const slug = (instRes.data?.slug as string) ?? id;
  const institutionName = (instRes.data?.name as string | null) ?? "Institution";

  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl mx-auto p-6 space-y-5">
        <Link href={`/institutions/${slug}/disciplinary`} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-purple-600"><ChevronLeft size={14} /> Disciplinary Register</Link>
        <IncidentDetail
          institutionId={id}
          institutionName={institutionName}
          incident={incRes.success ? incRes.data : null}
          actions={actsRes.success ? actsRes.data : []}
        />
      </div>
    </DashboardLayout>
  );
}
