"use client";

import { useState } from "react";
import { Trophy, Download, Filter, RefreshCw } from "lucide-react";
import {
  getAchievements,
  type SportsTeam,
  type SportsAchievement,
} from "@/actions/sports";
import {
  ACHIEVEMENT_LEVELS,
  ACHIEVEMENT_LEVEL_LABEL,
  computeNIRFSportsReport,
  sortAchievements,
  levelBadgeClass,
  positionBadgeClass,
  positionLabel,
  type AchievementLevel,
} from "@/lib/sports";
import { AchievementDrawer } from "./AchievementDrawer";

type Props = {
  institutionId: string;
  initialAchievements: SportsAchievement[];
  teams: SportsTeam[];
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export function AchievementsManager({ institutionId, initialAchievements, teams }: Props) {
  const [achievements, setAchievements] = useState(initialAchievements);
  const [levelFilter, setLevelFilter] = useState<AchievementLevel | "all">("all");
  const [showDrawer, setShowDrawer] = useState(false);

  const filtered = sortAchievements(
    levelFilter === "all" ? achievements : achievements.filter((a) => a.level === levelFilter)
  );

  const nirfReport = computeNIRFSportsReport(achievements);

  const refresh = async () => {
    const res = await getAchievements(institutionId);
    if (res.success) setAchievements(res.data);
  };

  const handleExportNIRF = () => {
    const csv = [
      "Level,Label,Total Achievements,Gold Medals",
      ...nirfReport.map((r) => `${r.level},${r.label},${r.count},${r.goldCount}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NIRF_Sports_${new Date().getFullYear()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sports Achievements</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{achievements.length} records total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <Trophy size={13} /> Log Achievement
          </button>
          <button
            onClick={handleExportNIRF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Download size={13} /> NIRF Export
          </button>
          <button onClick={refresh} className="p-1.5 text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Level filter chips */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Filter size={11} className="text-slate-400 shrink-0" />
        <button
          onClick={() => setLevelFilter("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
            levelFilter === "all"
              ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200"
              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          All
        </button>
        {ACHIEVEMENT_LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
              levelFilter === l
                ? levelBadgeClass(l)
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {ACHIEVEMENT_LEVEL_LABEL[l]}
          </button>
        ))}
      </div>

      {/* NIRF Summary (only when viewing all) */}
      {levelFilter === "all" && nirfReport.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-2">NIRF Summary</p>
          <div className="flex flex-wrap gap-3">
            {nirfReport.map((r) => (
              <div key={r.level} className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelBadgeClass(r.level as AchievementLevel)}`}>
                  {r.label}
                </span>
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">{r.count}</span>
                {r.goldCount > 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400">({r.goldCount} 🥇)</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          {levelFilter === "all" ? "No achievements logged yet." : `No ${ACHIEVEMENT_LEVEL_LABEL[levelFilter]} level achievements.`}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Event</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Level</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Position</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Team / Student</th>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-t border-slate-100 dark:border-slate-800 ${i % 2 !== 0 ? "bg-slate-50/50 dark:bg-slate-800/20" : ""}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800 dark:text-slate-100 leading-snug">{a.event_name}</p>
                    {a.certificate_url && (
                      <a href={a.certificate_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:underline">Certificate ↗</a>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelBadgeClass(a.level)}`}>
                      {ACHIEVEMENT_LEVEL_LABEL[a.level]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${positionBadgeClass(a.position)}`}>
                      {positionLabel(a.position)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                    {a.team ? `${a.team.sport_name}` : a.student?.full_name ?? "—"}
                    {a.student?.roll_no ? <span className="text-slate-400"> · {a.student.roll_no}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtDate(a.event_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDrawer && (
        <AchievementDrawer
          institutionId={institutionId}
          teams={teams}
          onClose={() => setShowDrawer(false)}
          onSaved={async () => {
            setShowDrawer(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
