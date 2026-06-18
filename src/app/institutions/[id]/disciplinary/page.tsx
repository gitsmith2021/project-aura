import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getIncidents } from "@/actions/disciplinary";
import { IncidentRegister } from "@/components/disciplinary/IncidentRegister";

type PageProps = { params: Promise<{ id: string }> };

export default async function DisciplinaryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [incRes, studentsRes, instRes] = await Promise.all([
    getIncidents(id),
    supabase.from("students").select("id, full_name, roll_no").eq("institution_id", id).eq("is_active", true).order("full_name"),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const students = (studentsRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string, roll_no: (s.roll_no as string | null) ?? null }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <IncidentRegister
        institutionId={id}
        instSlug={slug}
        students={students}
        initial={incRes.success ? incRes.data : []}
      />
    </DashboardLayout>
  );
}
