import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getMeetings } from "@/actions/iqacMeetings";
import { MeetingsManager } from "@/components/iqac/MeetingsManager";
import { meetingStats } from "@/lib/iqac";

type PageProps = { params: Promise<{ id: string }> };

export default async function IqacMeetingsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [meetingsRes, staffRes, yearsRes] = await Promise.all([
    getMeetings(id),
    supabase.from("staff").select("id, full_name").eq("institution_id", id).eq("is_active", true).order("full_name"),
    supabase.from("academic_years").select("id, label, is_current").eq("institution_id", id).order("start_date", { ascending: false }),
  ]);
  const staff = (staffRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string }));
  const years = (yearsRes.data ?? []).map((y) => ({ id: y.id as string, label: y.label as string, is_current: !!y.is_current }));
  const rows = meetingsRes.success ? meetingsRes.data.rows : [];

  return (
    <DashboardLayout>
      <MeetingsManager institutionId={id} initial={rows} stats={meetingsRes.success ? meetingsRes.data.stats : meetingStats([])} staff={staff} years={years} />
    </DashboardLayout>
  );
}
