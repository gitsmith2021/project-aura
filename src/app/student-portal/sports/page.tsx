import { MySportsView } from "@/components/sports/MySportsView";
import { getMyTeams, getMyAchievements } from "@/actions/sports";

export const metadata = { title: "My Sports — Aura Student Portal" };

export default async function StudentSportsPage() {
  const [teamsRes, achievementsRes] = await Promise.all([
    getMyTeams(),
    getMyAchievements(),
  ]);

  return (
    <div className="w-full">
      <MySportsView
        teams={teamsRes.success ? teamsRes.data : []}
        achievements={achievementsRes.success ? achievementsRes.data : []}
      />
    </div>
  );
}
