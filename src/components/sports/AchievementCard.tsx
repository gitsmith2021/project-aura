"use client";

import { Trophy, Calendar } from "lucide-react";
import {
  levelBadgeClass,
  positionBadgeClass,
  positionLabel,
  ACHIEVEMENT_LEVEL_LABEL,
  type AchievementLevel,
  type TeamCategory,
  TEAM_CATEGORY_LABEL,
} from "@/lib/sports";

type Props = {
  eventName: string;
  level: AchievementLevel;
  position: string;
  eventDate: string;
  sportName?: string | null;
  teamCategory?: TeamCategory | null;
  studentName?: string | null;
  rollNo?: string | null;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function AchievementCard({
  eventName, level, position, eventDate,
  sportName, teamCategory, studentName, rollNo,
}: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400 shrink-0">
            <Trophy size={14} />
          </div>
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{eventName}</p>
        </div>
        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${levelBadgeClass(level)}`}>
          {ACHIEVEMENT_LEVEL_LABEL[level]}
        </span>
      </div>

      <span className={`self-start inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${positionBadgeClass(position)}`}>
        {positionLabel(position)}
      </span>

      <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
        <span className="flex items-center gap-1">
          <Calendar size={10} /> {fmtDate(eventDate)}
        </span>
        {sportName && (
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {sportName}
            {teamCategory && ` (${TEAM_CATEGORY_LABEL[teamCategory]})`}
          </span>
        )}
      </div>

      {(studentName || rollNo) && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {studentName}{rollNo ? ` · ${rollNo}` : ""}
        </p>
      )}
    </div>
  );
}
