import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getCertificateRequests } from "@/actions/certificates";
import { CertificatesManager } from "@/components/certificates/CertificatesManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function CertificatesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [reqRes, staffRes] = await Promise.all([
    getCertificateRequests(id),
    supabase.from("staff").select("id, full_name, employee_id").eq("institution_id", id).eq("is_active", true).order("full_name"),
  ]);
  const staff = (staffRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string, employee_id: (s.employee_id as string | null) ?? null }));

  return (
    <DashboardLayout>
      <CertificatesManager institutionId={id} initial={reqRes.success ? reqRes.data : []} staff={staff} />
    </DashboardLayout>
  );
}
