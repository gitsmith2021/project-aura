import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { createClient } from "@/utils/supabase/server";
import { getClubs, getCoordinatorOptions, getSecretaryOptions, getNAACReport } from "@/actions/clubs";
import ClubsManager from "@/components/clubs/ClubsManager";

type PageProps = { params: Promise<{ id: string }> };

export default async function ClubsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch all required data in parallel
  const [clubsRes, coordRes, secRes, naacRes] = await Promise.all([
    getClubs(id),
    getCoordinatorOptions(id),
    getSecretaryOptions(id),
    getNAACReport(id),
  ]);

  const clubs = clubsRes.success ? clubsRes.data : [];
  const coordinators = coordRes.success ? coordRes.data : [];
  const secretaries = secRes.success ? secRes.data : [];
  const naacReport = naacRes.success ? naacRes.data : null;

  return (
    <DashboardLayout>
      <ClubsManager
        institutionId={id}
        initialClubs={clubs}
        coordinators={coordinators}
        secretaries={secretaries}
        initialNaacReport={naacReport}
      />
    </DashboardLayout>
  );
}
