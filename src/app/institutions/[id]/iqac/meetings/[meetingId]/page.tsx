import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getMeeting } from "@/actions/iqacMeetings";
import { MeetingDetail } from "@/components/iqac/MeetingDetail";

type PageProps = { params: Promise<{ id: string; meetingId: string }> };

export default async function IqacMeetingPage({ params }: PageProps) {
  const { id, meetingId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [meetingRes, staffRes] = await Promise.all([
    getMeeting(meetingId),
    supabase.from("staff").select("id, full_name").eq("institution_id", id).eq("is_active", true).order("full_name"),
  ]);
  if (!meetingRes.success) notFound();
  const staff = (staffRes.data ?? []).map((s) => ({ id: s.id as string, full_name: s.full_name as string }));

  return (
    <DashboardLayout>
      <MeetingDetail institutionId={id} meeting={meetingRes.data} staff={staff} />
    </DashboardLayout>
  );
}
