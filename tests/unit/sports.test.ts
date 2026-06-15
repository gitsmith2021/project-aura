import { describe, it, expect } from "vitest";
import {
  levelBadgeClass,
  positionBadgeClass,
  positionLabel,
  computeSportsStats,
  sortAchievements,
  computeNIRFSportsReport,
  LEVEL_RANK,
  ACHIEVEMENT_LEVELS,
  type AchievementLevel,
} from "@/lib/sports";

// ── levelBadgeClass ───────────────────────────────────────────────────────────

describe("levelBadgeClass", () => {
  it("returns yellow classes for international", () => {
    expect(levelBadgeClass("international")).toContain("yellow");
  });

  it("returns orange classes for national", () => {
    expect(levelBadgeClass("national")).toContain("orange");
  });

  it("returns blue classes for state", () => {
    expect(levelBadgeClass("state")).toContain("blue");
  });

  it("returns emerald classes for district", () => {
    expect(levelBadgeClass("district")).toContain("emerald");
  });

  it("returns purple classes for inter_college", () => {
    expect(levelBadgeClass("inter_college")).toContain("purple");
  });

  it("returns slate classes for inter_class", () => {
    expect(levelBadgeClass("inter_class")).toContain("slate");
  });
});

// ── positionBadgeClass ────────────────────────────────────────────────────────

describe("positionBadgeClass", () => {
  it("returns yellow for gold (case-insensitive)", () => {
    expect(positionBadgeClass("Gold")).toContain("yellow");
    expect(positionBadgeClass("gold")).toContain("yellow");
  });

  it("returns slate for silver", () => {
    expect(positionBadgeClass("Silver")).toContain("slate");
  });

  it("returns orange for bronze", () => {
    expect(positionBadgeClass("Bronze")).toContain("orange");
  });

  it("returns slate for participant", () => {
    expect(positionBadgeClass("Participant")).toContain("slate");
  });

  it("returns indigo for unknown positions", () => {
    expect(positionBadgeClass("Runner-up")).toContain("indigo");
    expect(positionBadgeClass("4th Place")).toContain("indigo");
  });
});

// ── positionLabel ─────────────────────────────────────────────────────────────

describe("positionLabel", () => {
  it("returns medal emoji for gold", () => {
    expect(positionLabel("gold")).toBe("🥇 Gold");
    expect(positionLabel("Gold")).toBe("🥇 Gold");
  });

  it("returns medal emoji for silver", () => {
    expect(positionLabel("silver")).toBe("🥈 Silver");
  });

  it("returns medal emoji for bronze", () => {
    expect(positionLabel("bronze")).toBe("🥉 Bronze");
  });

  it("returns raw value for other positions", () => {
    expect(positionLabel("Runner-up")).toBe("Runner-up");
    expect(positionLabel("4th Place")).toBe("4th Place");
    expect(positionLabel("Participant")).toBe("Participant");
  });
});

// ── computeSportsStats ────────────────────────────────────────────────────────

describe("computeSportsStats", () => {
  it("returns zeros for empty list", () => {
    const s = computeSportsStats([]);
    expect(s.totalAchievements).toBe(0);
    expect(s.internationalCount).toBe(0);
    expect(s.goldMedals).toBe(0);
  });

  it("counts by level", () => {
    const achievements = [
      { level: "international" as AchievementLevel, position: "Gold" },
      { level: "national" as AchievementLevel, position: "Silver" },
      { level: "national" as AchievementLevel, position: "Bronze" },
      { level: "state" as AchievementLevel, position: "Gold" },
    ];
    const s = computeSportsStats(achievements);
    expect(s.totalAchievements).toBe(4);
    expect(s.internationalCount).toBe(1);
    expect(s.nationalCount).toBe(2);
    expect(s.stateCount).toBe(1);
  });

  it("counts medals case-insensitively", () => {
    const achievements = [
      { level: "national" as AchievementLevel, position: "gold" },
      { level: "state" as AchievementLevel, position: "Gold" },
      { level: "district" as AchievementLevel, position: "silver" },
      { level: "inter_class" as AchievementLevel, position: "bronze" },
    ];
    const s = computeSportsStats(achievements);
    expect(s.goldMedals).toBe(2);
    expect(s.silverMedals).toBe(1);
    expect(s.bronzeMedals).toBe(1);
  });
});

// ── sortAchievements ──────────────────────────────────────────────────────────

describe("sortAchievements", () => {
  const make = (level: AchievementLevel, date: string) => ({
    level,
    event_date: date,
    id: `${level}-${date}`,
  });

  it("sorts by level rank descending first", () => {
    const input = [
      make("inter_class", "2026-01-01"),
      make("international", "2025-01-01"),
      make("national", "2026-06-01"),
    ];
    const sorted = sortAchievements(input);
    expect(sorted[0].level).toBe("international");
    expect(sorted[1].level).toBe("national");
    expect(sorted[2].level).toBe("inter_class");
  });

  it("breaks level ties by date descending", () => {
    const input = [
      make("national", "2025-03-01"),
      make("national", "2026-01-15"),
      make("national", "2025-09-10"),
    ];
    const sorted = sortAchievements(input);
    expect(sorted[0].event_date).toBe("2026-01-15");
    expect(sorted[1].event_date).toBe("2025-09-10");
    expect(sorted[2].event_date).toBe("2025-03-01");
  });

  it("does not mutate the original array", () => {
    const input = [make("state", "2026-01-01"), make("national", "2026-01-01")];
    const original = [...input];
    sortAchievements(input);
    expect(input[0].level).toBe(original[0].level);
  });
});

// ── LEVEL_RANK ────────────────────────────────────────────────────────────────

describe("LEVEL_RANK", () => {
  it("international has the highest rank", () => {
    const ranks = ACHIEVEMENT_LEVELS.map((l) => LEVEL_RANK[l]);
    expect(LEVEL_RANK["international"]).toBe(Math.max(...ranks));
  });

  it("inter_class has the lowest rank", () => {
    const ranks = ACHIEVEMENT_LEVELS.map((l) => LEVEL_RANK[l]);
    expect(LEVEL_RANK["inter_class"]).toBe(Math.min(...ranks));
  });

  it("all levels have distinct ranks", () => {
    const ranks = ACHIEVEMENT_LEVELS.map((l) => LEVEL_RANK[l]);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
});

// ── computeNIRFSportsReport ───────────────────────────────────────────────────

describe("computeNIRFSportsReport", () => {
  it("returns empty when no achievements", () => {
    expect(computeNIRFSportsReport([])).toEqual([]);
  });

  it("excludes levels with zero count", () => {
    const achievements = [
      { level: "national" as AchievementLevel, position: "Gold" },
      { level: "state" as AchievementLevel, position: "Silver" },
    ];
    const report = computeNIRFSportsReport(achievements);
    const levels = report.map((r) => r.level);
    expect(levels).not.toContain("international");
    expect(levels).not.toContain("inter_class");
    expect(levels).toContain("national");
    expect(levels).toContain("state");
  });

  it("correctly counts golds per level", () => {
    const achievements = [
      { level: "national" as AchievementLevel, position: "Gold" },
      { level: "national" as AchievementLevel, position: "Gold" },
      { level: "national" as AchievementLevel, position: "Silver" },
      { level: "state" as AchievementLevel, position: "Bronze" },
    ];
    const report = computeNIRFSportsReport(achievements);
    const nationalRow = report.find((r) => r.level === "national");
    const stateRow = report.find((r) => r.level === "state");
    expect(nationalRow?.count).toBe(3);
    expect(nationalRow?.goldCount).toBe(2);
    expect(stateRow?.count).toBe(1);
    expect(stateRow?.goldCount).toBe(0);
  });

  it("includes the human-readable label for each level", () => {
    const achievements = [{ level: "international" as AchievementLevel, position: "Gold" }];
    const report = computeNIRFSportsReport(achievements);
    expect(report[0].label).toBe("International");
  });
});
