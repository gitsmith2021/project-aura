import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { GradebookView } from "@/components/lms/GradebookView";

type PageProps = { params: Promise<{ id: string }> };

export default async function LmsGradebookPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("subjects").select("id, name").eq("institution_id", id).eq("is_active", true).order("name");
  const subjects = (data ?? []).map((s) => ({ id: s.id as string, name: s.name as string }));

  return (
    <DashboardLayout>
      <GradebookView subjects={subjects} />
    </DashboardLayout>
  );
}
