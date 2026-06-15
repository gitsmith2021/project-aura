"use client";

import { Trophy, Users, Dumbbell } from "lucide-react";
import {
  TEAM_CATEGORY_LABEL,
  sortAchievements,
  levelBadgeClass,
  positionBadgeClass,
  positionLabel,
  ACHIEVEMENT_LEVEL_LABEL,
  type AchievementLevel,
  type TeamCategory,
} from "@/lib/sports";
import type { SportsAchievement } from "@/actions/sports";

type MyTeam = {
  teamId: string;
  sportName: string;
  teamCategory: TeamCategory;
  position: string | null;
  coachName: string | null;
};

type Props = {
  teams: MyTeam[];
  achievements: SportsAchievement[];
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function MySportsView({ teams, achievements }: Props) {
  const sorted = sortAchievements(achievements);

  if (teams.length === 0 && achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-400">
          <Dumbbell size={26} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No sports activity yet</p>
          <p className="text-xs text-slate-400 mt-1">You haven't been added to any team or achievement record.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* My Teams */}
      {teams.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">My Teams</h2>
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">{teams.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {teams.map((t) => (
              <div key={t.teamId} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-500 shrink-0">
                  <Dumbbell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{t.sportName}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {TEAM_CATEGORY_LABEL[t.teamCategory]}
                    </span>
                    {t.position && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{t.position}</span>
                    )}
                  </div>
                  {t.coachName && (
                    <p className="text-[10px] text-slate-400 mt-1">Coach: {t.coachName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Achievements */}
      {sorted.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-yellow-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">My Achievements</h2>
            <span className="text-[10px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-1.5 py-0.5 rounded-full">{sorted.length}</span>
          </div>
          <div className="space-y-2">
            {sorted.map((a) => (
              <div key={a.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-500 shrink-0 mt-0.5">
                  <Trophy size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{a.event_name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelBadgeClass(a.level as AchievementLevel)}`}>
                      {ACHIEVEMENT_LEVEL_LABEL[a.level as AchievementLevel]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${positionBadgeClass(a.position)}`}>
                      {positionLabel(a.position)}
                    </span>
                    {a.team && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{a.team.sport_name}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{fmtDate(a.event_date)}</p>
                  {a.certificate_url && (
                    <a href={a.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:underline">View Certificate ↗</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
