import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getAlumniForAdmin } from "@/actions/alumni";
import { AlumniDirectoryView } from "@/components/alumni/AlumniDirectoryView";

type PageProps = { params: Promise<{ id: string }> };

export default async function AlumniAdminPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [alumniRes, deptRes, instRes] = await Promise.all([
    getAlumniForAdmin(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
    supabase.from("institutions").select("slug").eq("id", id).maybeSingle(),
  ]);

  const departments = (deptRes.data ?? []).map((d) => ({ id: d.id as string, name: d.name as string }));
  const slug = (instRes.data?.slug as string) ?? id;

  return (
    <DashboardLayout>
      <AlumniDirectoryView
        institutionId={id}
        instSlug={slug}
        departments={departments}
        initial={alumniRes.success ? alumniRes.data : []}
      />
    </DashboardLayout>
  );
}
