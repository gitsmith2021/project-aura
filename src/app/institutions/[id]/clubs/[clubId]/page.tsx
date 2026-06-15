import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getClub, getClubMembers, getClubActivities, getSecretaryOptions } from "@/actions/clubs";
import ClubDetail from "@/components/clubs/ClubDetail";

type PageProps = { params: Promise<{ id: string; clubId: string }> };

export default async function ClubDetailPage({ params }: PageProps) {
  const { id, clubId } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [clubRes, membersRes, actsRes, studentsRes] = await Promise.all([
    getClub(clubId),
    getClubMembers(clubId),
    getClubActivities(clubId),
    getSecretaryOptions(id),
  ]);

  if (!clubRes.success) {
    redirect(`/institutions/${id}/clubs`);
  }

  const club = clubRes.data;
  const members = membersRes.success ? membersRes.data : [];
  const activities = actsRes.success ? actsRes.data : [];
  const students = studentsRes.success ? studentsRes.data : [];

  return (
    <DashboardLayout>
      <ClubDetail
        institutionId={id}
        club={club}
        initialMembers={members}
        initialActivities={activities}
        students={students}
      />
    </DashboardLayout>
  );
}
