// Pure helpers for the Sports & Physical Education module (Phase 4J).
// No Supabase imports — all functions are unit-testable without mocking.

export const ACHIEVEMENT_LEVELS = [
  "inter_class", "inter_college", "district", "state", "national", "international",
] as const;
export type AchievementLevel = (typeof ACHIEVEMENT_LEVELS)[number];

export const TEAM_CATEGORIES = ["men", "women", "mixed"] as const;
export type TeamCategory = (typeof TEAM_CATEGORIES)[number];

export const ACHIEVEMENT_LEVEL_LABEL: Record<AchievementLevel, string> = {
  inter_class:   "Inter-Class",
  inter_college: "Inter-College",
  district:      "District",
  state:         "State",
  national:      "National",
  international: "International",
};

export const TEAM_CATEGORY_LABEL: Record<TeamCategory, string> = {
  men:   "Men's",
  women: "Women's",
  mixed: "Mixed",
};

/** Numeric rank — higher is more prestigious (for sorting). */
export const LEVEL_RANK: Record<AchievementLevel, number> = {
  inter_class: 1, inter_college: 2, district: 3, state: 4, national: 5, international: 6,
};

/** Tailwind colour classes for the achievement level badge. */
export function levelBadgeClass(level: AchievementLevel): string {
  switch (level) {
    case "international": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "national":      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    case "state":         return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "district":      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    case "inter_college": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    case "inter_class":   return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

/** Tailwind colour classes for the position badge (Gold/Silver/Bronze/other). */
export function positionBadgeClass(position: string): string {
  switch (position.toLowerCase()) {
    case "gold":      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "silver":    return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
    case "bronze":    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    case "participant": return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    default:          return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
  }
}

/** Short display label including medal emoji for well-known positions. */
export function positionLabel(position: string): string {
  switch (position.toLowerCase()) {
    case "gold":      return "🥇 Gold";
    case "silver":    return "🥈 Silver";
    case "bronze":    return "🥉 Bronze";
    default:          return position;
  }
}

export type SportsStats = {
  totalAchievements: number;
  internationalCount: number;
  nationalCount: number;
  stateCount: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
};

export function computeSportsStats(
  achievements: Array<{ level: AchievementLevel; position: string }>
): SportsStats {
  return {
    totalAchievements: achievements.length,
    internationalCount: achievements.filter((a) => a.level === "international").length,
    nationalCount:      achievements.filter((a) => a.level === "national").length,
    stateCount:         achievements.filter((a) => a.level === "state").length,
    goldMedals:         achievements.filter((a) => a.position.toLowerCase() === "gold").length,
    silverMedals:       achievements.filter((a) => a.position.toLowerCase() === "silver").length,
    bronzeMedals:       achievements.filter((a) => a.position.toLowerCase() === "bronze").length,
  };
}

/** Sort achievements highest level first, then most recent first. */
export function sortAchievements<T extends { level: AchievementLevel; event_date: string }>(
  achievements: T[]
): T[] {
  return [...achievements].sort((a, b) => {
    const rankDiff = LEVEL_RANK[b.level] - LEVEL_RANK[a.level];
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
  });
}

export type NIRFSportsRow = {
  level: AchievementLevel;
  label: string;
  count: number;
  goldCount: number;
};

/** Level-wise breakdown for NIRF Criterion export. */
export function computeNIRFSportsReport(
  achievements: Array<{ level: AchievementLevel; position: string }>
): NIRFSportsRow[] {
  return ACHIEVEMENT_LEVELS.map((level) => {
    const subset = achievements.filter((a) => a.level === level);
    return {
      level,
      label: ACHIEVEMENT_LEVEL_LABEL[level],
      count: subset.length,
      goldCount: subset.filter((a) => a.position.toLowerCase() === "gold").length,
    };
  }).filter((row) => row.count > 0);
}
