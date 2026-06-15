"use client";

import { useState } from "react";
import { Trophy, Users, Building2, Plus, ToggleLeft, ToggleRight, RefreshCw } from "lucide-react";
import {
  getTeams,
  getFacilities,
  getAchievements,
  getCoachOptions,
  getAcademicYearOptions,
  setFacilityActive,
  addFacility,
  type SportsTeam,
  type SportsFacility,
  type SportsAchievement,
} from "@/actions/sports";
import { computeSportsStats, TEAM_CATEGORY_LABEL, levelBadgeClass, ACHIEVEMENT_LEVEL_LABEL } from "@/lib/sports";
import { AchievementCard } from "./AchievementCard";
import { AchievementDrawer } from "./AchievementDrawer";
import { TeamDrawer } from "./TeamDrawer";

type Tab = "overview" | "teams" | "facilities";

type Props = {
  institutionId: string;
  initialTeams: SportsTeam[];
  initialFacilities: SportsFacility[];
  initialAchievements: SportsAchievement[];
  coaches: Array<{ id: string; full_name: string; title: string | null }>;
  academicYears: Array<{ id: string; label: string }>;
};

export function SportsManager({
  institutionId,
  initialTeams,
  initialFacilities,
  initialAchievements,
  coaches,
  academicYears,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [teams, setTeams] = useState(initialTeams);
  const [facilities, setFacilities] = useState(initialFacilities);
  const [achievements, setAchievements] = useState(initialAchievements);

  const [showTeamDrawer, setShowTeamDrawer] = useState(false);
  const [showAchievementDrawer, setShowAchievementDrawer] = useState(false);
  const [showFacilityForm, setShowFacilityForm] = useState(false);

  // Facility inline form state
  const [facName, setFacName] = useState("");
  const [facSportType, setFacSportType] = useState("");
  const [facCapacity, setFacCapacity] = useState("");
  const [facBusy, setFacBusy] = useState(false);
  const [facError, setFacError] = useState<string | null>(null);

  const stats = computeSportsStats(achievements);

  const refresh = async () => {
    const [tr, fr, ar] = await Promise.all([
      getTeams(institutionId),
      getFacilities(institutionId),
      getAchievements(institutionId),
    ]);
    if (tr.success) setTeams(tr.data);
    if (fr.success) setFacilities(fr.data);
    if (ar.success) setAchievements(ar.data);
  };

  const handleToggleFacility = async (id: string, current: boolean) => {
    const res = await setFacilityActive(id, !current, institutionId);
    if (res.success) setFacilities((prev) => prev.map((f) => f.id === id ? { ...f, is_active: !current } : f));
  };

  const handleAddFacility = async () => {
    if (!facName.trim() || !facSportType.trim()) { setFacError("Name and sport type are required."); return; }
    setFacBusy(true); setFacError(null);
    const res = await addFacility({
      institutionId,
      name: facName,
      sportType: facSportType,
      capacity: facCapacity ? parseInt(facCapacity) : undefined,
    });
    setFacBusy(false);
    if (!res.success) { setFacError(res.error); return; }
    const fr = await getFacilities(institutionId);
    if (fr.success) setFacilities(fr.data);
    setFacName(""); setFacSportType(""); setFacCapacity(""); setShowFacilityForm(false);
  };

  const statCards = [
    { label: "Total Achievements", value: stats.totalAchievements, color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300" },
    { label: "International", value: stats.internationalCount, color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300" },
    { label: "National", value: stats.nationalCount, color: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300" },
    { label: "Gold Medals", value: stats.goldMedals, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
  ];

  const inputCls = "h-8 px-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sports & Physical Education</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">{teams.length} teams · {achievements.length} achievements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTeamDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={13} /> Add Team
          </button>
          <button
            onClick={() => setShowAchievementDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors"
          >
            <Trophy size={13} /> Log Achievement
          </button>
          <button onClick={refresh} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-0">
        {([
          { key: "overview", label: "Overview", icon: Trophy },
          { key: "teams", label: "Teams", icon: Users },
          { key: "facilities", label: "Facilities", icon: Building2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === key
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl border border-slate-100 dark:border-slate-800 p-4 ${color}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Recent achievements trophy wall */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Recent Achievements</h2>
              <a href={`/institutions/${institutionId}/sports/achievements`} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">View all →</a>
            </div>
            {achievements.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No achievements logged yet. Log your first achievement above.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {achievements.slice(0, 6).map((a) => (
                  <AchievementCard
                    key={a.id}
                    eventName={a.event_name}
                    level={a.level}
                    position={a.position}
                    eventDate={a.event_date}
                    sportName={a.team?.sport_name ?? null}
                    teamCategory={a.team?.team_category ?? null}
                    studentName={a.student?.full_name ?? null}
                    rollNo={a.student?.roll_no ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Teams ── */}
      {tab === "teams" && (
        <div>
          {teams.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">No teams yet. Click "Add Team" to get started.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.map((t) => (
                <div key={t.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.sport_name}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {TEAM_CATEGORY_LABEL[t.team_category]}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{t.member_count}</p>
                      <p className="text-[10px] text-slate-400">players</p>
                    </div>
                  </div>
                  {t.coach && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Coach: <span className="font-medium text-slate-700 dark:text-slate-300">{t.coach.title ? `${t.coach.title} ` : ""}{t.coach.full_name}</span>
                    </p>
                  )}
                  {t.academic_year && (
                    <p className="text-[10px] text-slate-400">{t.academic_year.label}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Facilities ── */}
      {tab === "facilities" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowFacilityForm(!showFacilityForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              <Plus size={13} /> Add Facility
            </button>
          </div>

          {showFacilityForm && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">New Facility</p>
              <div className="grid grid-cols-3 gap-2">
                <input value={facName} onChange={(e) => setFacName(e.target.value)} placeholder="Facility name" className={`${inputCls} col-span-1`} />
                <input value={facSportType} onChange={(e) => setFacSportType(e.target.value)} placeholder="Sport type (e.g. Cricket)" className={inputCls} />
                <input type="number" value={facCapacity} onChange={(e) => setFacCapacity(e.target.value)} placeholder="Capacity" className={inputCls} />
              </div>
              {facError && <p className="text-xs text-red-600">{facError}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowFacilityForm(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100">Cancel</button>
                <button onClick={handleAddFacility} disabled={facBusy} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">{facBusy ? "Saving…" : "Save"}</button>
              </div>
            </div>
          )}

          {facilities.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">No facilities recorded yet.</div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Name</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Sport</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Capacity</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((f, i) => (
                    <tr key={f.id} className={i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/20"}>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-100">{f.name}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{f.sport_type}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{f.capacity ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleToggleFacility(f.id, f.is_active)}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {f.is_active
                            ? <><ToggleRight size={16} className="text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span></>
                            : <><ToggleLeft size={16} className="text-slate-400" /><span className="text-slate-400">Inactive</span></>
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Drawers */}
      {showAchievementDrawer && (
        <AchievementDrawer
          institutionId={institutionId}
          teams={teams}
          onClose={() => setShowAchievementDrawer(false)}
          onSaved={async () => {
            setShowAchievementDrawer(false);
            const ar = await getAchievements(institutionId);
            if (ar.success) setAchievements(ar.data);
          }}
        />
      )}

      {showTeamDrawer && (
        <TeamDrawer
          institutionId={institutionId}
          coaches={coaches}
          academicYears={academicYears}
          onClose={() => setShowTeamDrawer(false)}
          onSaved={async () => {
            setShowTeamDrawer(false);
            const tr = await getTeams(institutionId);
            if (tr.success) setTeams(tr.data);
          }}
        />
      )}
    </div>
  );
}
