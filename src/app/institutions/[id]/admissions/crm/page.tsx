import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getEnquiries } from "@/actions/admissionsCRM";
import { CrmBoard } from "@/components/admissions/CrmBoard";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdmissionsCRMPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [enqRes, instRes, deptRes] = await Promise.all([
    getEnquiries(id),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);
  const slug = (instRes.data?.slug as string) ?? id;
  const departments = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <DashboardLayout>
      <CrmBoard
        institutionId={id}
        instSlug={slug}
        departments={departments}
        initial={enqRes.success ? enqRes.data : []}
        today={today}
      />
    </DashboardLayout>
  );
}
