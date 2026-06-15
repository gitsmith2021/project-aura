import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SportsManager } from "@/components/sports/SportsManager";
import {
  getTeams,
  getFacilities,
  getAchievements,
  getCoachOptions,
  getAcademicYearOptions,
} from "@/actions/sports";

export const metadata = { title: "Sports & Physical Education — Aura Campus" };

type Props = { params: Promise<{ id: string }> };

export default async function SportsPage({ params }: Props) {
  const { id } = await params;

  const [teamsRes, facilitiesRes, achievementsRes, coachesRes, yearsRes] = await Promise.all([
    getTeams(id),
    getFacilities(id),
    getAchievements(id),
    getCoachOptions(id),
    getAcademicYearOptions(id),
  ]);

  return (
    <DashboardLayout>
      <div className="w-full px-6 py-6">
        <SportsManager
          institutionId={id}
          initialTeams={teamsRes.success ? teamsRes.data : []}
          initialFacilities={facilitiesRes.success ? facilitiesRes.data : []}
          initialAchievements={achievementsRes.success ? achievementsRes.data : []}
          coaches={coachesRes.success ? coachesRes.data : []}
          academicYears={yearsRes.success ? yearsRes.data : []}
        />
      </div>
    </DashboardLayout>
  );
}
