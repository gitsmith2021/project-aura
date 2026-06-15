import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AchievementsManager } from "@/components/sports/AchievementsManager";
import { getAchievements, getTeams } from "@/actions/sports";

export const metadata = { title: "Sports Achievements — Aura Campus" };

type Props = { params: Promise<{ id: string }> };

export default async function SportsAchievementsPage({ params }: Props) {
  const { id } = await params;

  const [achievementsRes, teamsRes] = await Promise.all([
    getAchievements(id),
    getTeams(id),
  ]);

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-6">
        <AchievementsManager
          institutionId={id}
          initialAchievements={achievementsRes.success ? achievementsRes.data : []}
          teams={teamsRes.success ? teamsRes.data : []}
        />
      </div>
    </DashboardLayout>
  );
}
