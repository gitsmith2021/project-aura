import { Users, Award, TrendingUp, IndianRupee } from "lucide-react";
import { formatLPA, type PlacementStats } from "@/lib/placements";

function Card({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function PlacementStatsCards({ stats }: { stats: PlacementStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={<Users size={18} className="text-purple-600" />} label="Students Placed" value={`${stats.placedStudents}/${stats.registeredStudents}`} accent="bg-purple-100 dark:bg-purple-950/40" />
      <Card icon={<TrendingUp size={18} className="text-emerald-600" />} label="Placement Rate" value={`${stats.placementRate}%`} accent="bg-emerald-100 dark:bg-emerald-950/40" />
      <Card icon={<IndianRupee size={18} className="text-blue-600" />} label="Average CTC" value={formatLPA(stats.avgCTC)} accent="bg-blue-100 dark:bg-blue-950/40" />
      <Card icon={<Award size={18} className="text-amber-600" />} label="Highest Package" value={formatLPA(stats.highestCTC)} accent="bg-amber-100 dark:bg-amber-950/40" />
    </div>
  );
}
