import { describe, it, expect } from "vitest";
import {
  toAcademicEventType,
  eventTypeBadgeClass,
  budgetStatus,
  budgetUtilisation,
  budgetBarWidth,
  budgetStatusClass,
  formatBudget,
  computeEventStats,
  sortEvents,
  computeNaacEventsReport,
  parsePhotoUrls,
  parseCommittee,
  isToday,
  isUpcoming,
  EVENT_TYPES,
  type CampusEventType,
} from "@/lib/campusEvents";

// ── toAcademicEventType ───────────────────────────────────────────────────────

describe("toAcademicEventType", () => {
  it("maps annual_day → annual_day", () => {
    expect(toAcademicEventType("annual_day")).toBe("annual_day");
  });
  it("maps sports_day → sports_day", () => {
    expect(toAcademicEventType("sports_day")).toBe("sports_day");
  });
  it("maps cultural_fest → cultural", () => {
    expect(toAcademicEventType("cultural_fest")).toBe("cultural");
  });
  it("maps tech_fest → expo", () => {
    expect(toAcademicEventType("tech_fest")).toBe("expo");
  });
  it("maps everything else → other", () => {
    expect(toAcademicEventType("convocation")).toBe("other");
    expect(toAcademicEventType("orientation")).toBe("other");
    expect(toAcademicEventType("other")).toBe("other");
  });
});

// ── eventTypeBadgeClass ───────────────────────────────────────────────────────

describe("eventTypeBadgeClass", () => {
  it("returns violet for annual_day", () => {
    expect(eventTypeBadgeClass("annual_day")).toContain("violet");
  });
  it("returns emerald for sports_day", () => {
    expect(eventTypeBadgeClass("sports_day")).toContain("emerald");
  });
  it("returns pink for cultural_fest", () => {
    expect(eventTypeBadgeClass("cultural_fest")).toContain("pink");
  });
  it("returns blue for tech_fest", () => {
    expect(eventTypeBadgeClass("tech_fest")).toContain("blue");
  });
  it("returns slate for other", () => {
    expect(eventTypeBadgeClass("other")).toContain("slate");
  });
  it("returns a string for every defined event type", () => {
    for (const t of EVENT_TYPES) {
      expect(typeof eventTypeBadgeClass(t)).toBe("string");
    }
  });
});

// ── budgetStatus ──────────────────────────────────────────────────────────────

describe("budgetStatus", () => {
  it("returns no_budget when allocated is null", () => {
    expect(budgetStatus(null, 5000)).toBe("no_budget");
    expect(budgetStatus(undefined, 0)).toBe("no_budget");
  });
  it("returns over when actual > allocated", () => {
    expect(budgetStatus(10000, 11000)).toBe("over");
  });
  it("returns on_track when utilisation is 90–100%", () => {
    expect(budgetStatus(10000, 9000)).toBe("on_track");
    expect(budgetStatus(10000, 10000)).toBe("on_track");
  });
  it("returns under when utilisation is below 90%", () => {
    expect(budgetStatus(10000, 5000)).toBe("under");
    expect(budgetStatus(10000, 0)).toBe("under");
  });
});

// ── budgetUtilisation ─────────────────────────────────────────────────────────

describe("budgetUtilisation", () => {
  it("returns 0 when no allocated", () => {
    expect(budgetUtilisation(null, 5000)).toBe(0);
    expect(budgetUtilisation(0, 5000)).toBe(0);
  });
  it("returns percentage rounded", () => {
    expect(budgetUtilisation(10000, 5000)).toBe(50);
    expect(budgetUtilisation(10000, 9000)).toBe(90);
    expect(budgetUtilisation(10000, 3333)).toBe(33);
  });
  it("can exceed 100 when over budget", () => {
    expect(budgetUtilisation(10000, 12000)).toBe(120);
  });
});

// ── budgetBarWidth ────────────────────────────────────────────────────────────

describe("budgetBarWidth", () => {
  it("caps at 100 even when over budget", () => {
    expect(budgetBarWidth(10000, 15000)).toBe(100);
  });
  it("returns the utilisation percentage when under 100", () => {
    expect(budgetBarWidth(10000, 6000)).toBe(60);
  });
});

// ── budgetStatusClass ─────────────────────────────────────────────────────────

describe("budgetStatusClass", () => {
  it("returns red for over", () => {
    expect(budgetStatusClass("over")).toContain("red");
  });
  it("returns amber for on_track", () => {
    expect(budgetStatusClass("on_track")).toContain("amber");
  });
  it("returns emerald for under", () => {
    expect(budgetStatusClass("under")).toContain("emerald");
  });
  it("returns slate for no_budget", () => {
    expect(budgetStatusClass("no_budget")).toContain("slate");
  });
});

// ── formatBudget ──────────────────────────────────────────────────────────────

describe("formatBudget", () => {
  it("returns em dash for null/undefined", () => {
    expect(formatBudget(null)).toBe("—");
    expect(formatBudget(undefined)).toBe("—");
  });
  it("formats with ₹ symbol", () => {
    expect(formatBudget(50000)).toContain("₹");
    expect(formatBudget(50000)).toContain("50");
  });
  it("formats 0 correctly", () => {
    expect(formatBudget(0)).toBe("₹0");
  });
});

// ── computeEventStats ─────────────────────────────────────────────────────────

describe("computeEventStats", () => {
  const TODAY = "2026-06-15";

  it("returns zeros for empty list", () => {
    const s = computeEventStats([], TODAY);
    expect(s.total).toBe(0);
    expect(s.upcoming).toBe(0);
    expect(s.past).toBe(0);
    expect(s.totalBudgetAllocated).toBe(0);
    expect(s.totalActualSpend).toBe(0);
    expect(s.overBudgetCount).toBe(0);
  });

  it("counts upcoming and past correctly", () => {
    const events = [
      { event_date: "2026-06-20", budget_allocated: 10000, actual_spend: 5000 },
      { event_date: "2026-06-15", budget_allocated: null, actual_spend: 0 },
      { event_date: "2026-06-10", budget_allocated: 5000, actual_spend: 6000 },
    ];
    const s = computeEventStats(events, TODAY);
    expect(s.total).toBe(3);
    expect(s.upcoming).toBe(2); // 2026-06-15 and 2026-06-20
    expect(s.past).toBe(1);    // 2026-06-10
  });

  it("sums budget and spend", () => {
    const events = [
      { event_date: "2026-07-01", budget_allocated: 10000, actual_spend: 4000 },
      { event_date: "2026-08-01", budget_allocated: 20000, actual_spend: 25000 },
    ];
    const s = computeEventStats(events, TODAY);
    expect(s.totalBudgetAllocated).toBe(30000);
    expect(s.totalActualSpend).toBe(29000);
  });

  it("counts over-budget events", () => {
    const events = [
      { event_date: "2026-07-01", budget_allocated: 10000, actual_spend: 12000 },
      { event_date: "2026-08-01", budget_allocated: 5000, actual_spend: 3000 },
      { event_date: "2026-09-01", budget_allocated: null, actual_spend: 8000 },
    ];
    const s = computeEventStats(events, TODAY);
    expect(s.overBudgetCount).toBe(1);
  });
});

// ── sortEvents ────────────────────────────────────────────────────────────────

describe("sortEvents", () => {
  const future1 = "2099-01-01";
  const future2 = "2099-06-15";
  const past1   = "2000-01-01";
  const past2   = "2000-06-15";

  it("puts upcoming events before past events", () => {
    const events = [
      { event_date: past1, id: "a" },
      { event_date: future1, id: "b" },
    ];
    const sorted = sortEvents(events);
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("a");
  });

  it("sorts upcoming events ascending (nearest first)", () => {
    const events = [
      { event_date: future2, id: "far" },
      { event_date: future1, id: "near" },
    ];
    const sorted = sortEvents(events);
    expect(sorted[0].id).toBe("near");
  });

  it("sorts past events descending (most recent first)", () => {
    const events = [
      { event_date: past1, id: "older" },
      { event_date: past2, id: "newer" },
    ];
    const sorted = sortEvents(events);
    expect(sorted[0].id).toBe("newer");
  });

  it("does not mutate the original array", () => {
    const events = [{ event_date: future1 }, { event_date: past1 }];
    const original0 = events[0].event_date;
    sortEvents(events);
    expect(events[0].event_date).toBe(original0);
  });
});

// ── computeNaacEventsReport ───────────────────────────────────────────────────

describe("computeNaacEventsReport", () => {
  it("returns empty when no events", () => {
    expect(computeNaacEventsReport([])).toEqual([]);
  });

  it("excludes types with zero events", () => {
    const events = [
      { event_type: "annual_day" as CampusEventType, participantCount: 300 },
      { event_type: "annual_day" as CampusEventType, participantCount: 250 },
    ];
    const report = computeNaacEventsReport(events);
    expect(report.length).toBe(1);
    expect(report[0].eventType).toBe("annual_day");
    expect(report[0].count).toBe(2);
    expect(report[0].totalParticipants).toBe(550);
  });

  it("sums participants per type", () => {
    const events = [
      { event_type: "cultural_fest" as CampusEventType, participantCount: 100 },
      { event_type: "cultural_fest" as CampusEventType, participantCount: 200 },
      { event_type: "tech_fest" as CampusEventType, participantCount: 50 },
    ];
    const report = computeNaacEventsReport(events);
    const culturalRow = report.find((r) => r.eventType === "cultural_fest");
    const techRow = report.find((r) => r.eventType === "tech_fest");
    expect(culturalRow?.totalParticipants).toBe(300);
    expect(techRow?.totalParticipants).toBe(50);
  });

  it("includes the human-readable label", () => {
    const events = [{ event_type: "convocation" as CampusEventType, participantCount: 500 }];
    const report = computeNaacEventsReport(events);
    expect(report[0].label).toBe("Convocation");
  });
});

// ── parsePhotoUrls ────────────────────────────────────────────────────────────

describe("parsePhotoUrls", () => {
  it("returns empty for non-array", () => {
    expect(parsePhotoUrls(null)).toEqual([]);
    expect(parsePhotoUrls("string")).toEqual([]);
  });
  it("filters out non-strings and blanks", () => {
    expect(parsePhotoUrls(["https://a.com", 42, "", null, "https://b.com"])).toEqual(["https://a.com", "https://b.com"]);
  });
});

// ── parseCommittee ────────────────────────────────────────────────────────────

describe("parseCommittee", () => {
  it("returns empty for non-array", () => {
    expect(parseCommittee(null)).toEqual([]);
  });
  it("filters out malformed objects", () => {
    const raw = [
      { staff_id: "1", name: "Alice", role: "Coordinator" },
      { staff_id: "2" },
      null,
      "string",
    ];
    const result = parseCommittee(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });
});

// ── isToday / isUpcoming ──────────────────────────────────────────────────────

describe("isToday", () => {
  it("returns true when date matches today", () => {
    expect(isToday("2026-06-15", "2026-06-15")).toBe(true);
  });
  it("returns false for other dates", () => {
    expect(isToday("2026-06-14", "2026-06-15")).toBe(false);
    expect(isToday("2026-06-16", "2026-06-15")).toBe(false);
  });
});

describe("isUpcoming", () => {
  it("includes today as upcoming", () => {
    expect(isUpcoming("2026-06-15", "2026-06-15")).toBe(true);
  });
  it("returns true for future dates", () => {
    expect(isUpcoming("2026-06-20", "2026-06-15")).toBe(true);
  });
  it("returns false for past dates", () => {
    expect(isUpcoming("2026-06-14", "2026-06-15")).toBe(false);
  });
});
