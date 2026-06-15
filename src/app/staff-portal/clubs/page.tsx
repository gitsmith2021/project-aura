import { Award } from "lucide-react";
import { getAssignedCoordinatorClubs } from "@/actions/clubs";
import StaffClubsConsole from "@/components/clubs/StaffClubsConsole";

export const metadata = { title: "Clubs & Groups — Staff Portal" };

export default async function StaffClubsPage() {
  const res = await getAssignedCoordinatorClubs();
  const clubs = res.success ? res.data : [];

  return (
    <div className="px-6 pt-6 pb-6 w-full">
      <div className="flex items-center gap-2">
        <Award size={18} className="text-violet-500" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Clubs & Organizations</h1>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-4">
        Manage student rosters, log events/camps, and compile participation reports for groups you coordinate.
      </p>
      <StaffClubsConsole clubs={clubs} />
    </div>
  );
}
