import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getClassrooms } from "@/actions/classrooms";
import { ClassroomsManager } from "@/components/classrooms/ClassroomsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClassroomsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [res, { data: departments }] = await Promise.all([
    getClassrooms(id),
    supabase.from("departments").select("id, name").eq("institution_id", id).order("name"),
  ]);

  return (
    <DashboardLayout>
      <ClassroomsManager
        institutionId={id}
        initial={res.success ? res.data : []}
        departments={departments ?? []}
      />
    </DashboardLayout>
  );
}
