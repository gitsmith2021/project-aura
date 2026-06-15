import { describe, it, expect } from "vitest";
import {
  parseMedicines,
  isOverdueFollowUp,
  followUpStatus,
  computeInfirmaryStats,
  medicineLabel,
  followUpBadgeClass,
} from "@/lib/infirmary";

// Fixed reference date for tests: 2026-06-15 (today in the session)
const TODAY = "2026-06-15";
const YESTERDAY = "2026-06-14";
const TOMORROW = "2026-06-16";
const THIS_MONTH = "2026-06";

describe("parseMedicines", () => {
  it("returns empty array for null/undefined", () => {
    expect(parseMedicines(null)).toEqual([]);
    expect(parseMedicines(undefined)).toEqual([]);
  });

  it("returns empty array for non-array values", () => {
    expect(parseMedicines("Paracetamol")).toEqual([]);
    expect(parseMedicines(42)).toEqual([]);
  });

  it("filters out entries without a name string", () => {
    const raw = [
      { name: "Paracetamol", dosage: "500mg", quantity: "3" },
      { dosage: "500mg" }, // missing name
      { name: 42, dosage: "10ml" }, // name not a string
    ];
    expect(parseMedicines(raw)).toHaveLength(1);
    expect(parseMedicines(raw)[0].name).toBe("Paracetamol");
  });

  it("returns all valid entries", () => {
    const raw = [
      { name: "Crocin", dosage: "500mg", quantity: "2" },
      { name: "ORS", dosage: "", quantity: "1 packet" },
    ];
    expect(parseMedicines(raw)).toHaveLength(2);
  });
});

describe("isOverdueFollowUp", () => {
  it("returns false for null/undefined", () => {
    expect(isOverdueFollowUp(null)).toBe(false);
    expect(isOverdueFollowUp(undefined)).toBe(false);
  });

  it("returns true for a past date", () => {
    expect(isOverdueFollowUp(YESTERDAY)).toBe(true);
    expect(isOverdueFollowUp("2026-01-01")).toBe(true);
  });

  it("returns false for today", () => {
    expect(isOverdueFollowUp(TODAY)).toBe(false);
  });

  it("returns false for a future date", () => {
    expect(isOverdueFollowUp(TOMORROW)).toBe(false);
    expect(isOverdueFollowUp("2026-12-31")).toBe(false);
  });
});

describe("followUpStatus", () => {
  it("returns 'none' for null/undefined", () => {
    expect(followUpStatus(null)).toBe("none");
    expect(followUpStatus(undefined)).toBe("none");
  });

  it("returns 'overdue' for past dates", () => {
    expect(followUpStatus(YESTERDAY)).toBe("overdue");
  });

  it("returns 'today' for today's date", () => {
    expect(followUpStatus(TODAY)).toBe("today");
  });

  it("returns 'upcoming' for future dates", () => {
    expect(followUpStatus(TOMORROW)).toBe("upcoming");
    expect(followUpStatus("2026-07-01")).toBe("upcoming");
  });
});

describe("computeInfirmaryStats", () => {
  const visits = [
    // today
    { visit_date: `${TODAY}T09:00:00`, follow_up_date: null, referred_to: null },
    { visit_date: `${TODAY}T11:00:00`, follow_up_date: TOMORROW, referred_to: "City Hospital" },
    // this month but not today
    { visit_date: `2026-06-10T10:00:00`, follow_up_date: YESTERDAY, referred_to: null },
    // overdue follow-up + referral this month
    { visit_date: `2026-06-05T10:00:00`, follow_up_date: TODAY, referred_to: "Apollo" },
    // last month
    { visit_date: "2026-05-20T10:00:00", follow_up_date: null, referred_to: "Govt Hospital" },
  ];

  it("counts today's visits correctly", () => {
    const stats = computeInfirmaryStats(visits);
    expect(stats.todayVisits).toBe(2);
  });

  it("counts pending follow-ups (today + overdue)", () => {
    // YESTERDAY is overdue, TODAY is today → 2 pending
    const stats = computeInfirmaryStats(visits);
    expect(stats.pendingFollowUps).toBe(2);
  });

  it("counts referrals this month only", () => {
    // "City Hospital" on TODAY (this month) + "Apollo" on 2026-06-05 (this month) = 2
    const stats = computeInfirmaryStats(visits);
    expect(stats.referralsThisMonth).toBe(2);
  });

  it("counts total visits this month", () => {
    // visits[0],[1],[2],[3] are in June 2026 → 4
    const stats = computeInfirmaryStats(visits);
    expect(stats.totalThisMonth).toBe(4);
  });

  it("handles empty visits array", () => {
    const stats = computeInfirmaryStats([]);
    expect(stats.todayVisits).toBe(0);
    expect(stats.pendingFollowUps).toBe(0);
    expect(stats.referralsThisMonth).toBe(0);
    expect(stats.totalThisMonth).toBe(0);
  });
});

describe("medicineLabel", () => {
  it("includes name, dosage and quantity", () => {
    const label = medicineLabel({ name: "Paracetamol", dosage: "500mg", quantity: "3 tabs" });
    expect(label).toBe("Paracetamol — 500mg — × 3 tabs");
  });

  it("omits empty dosage and quantity", () => {
    const label = medicineLabel({ name: "ORS", dosage: "", quantity: "" });
    expect(label).toBe("ORS");
  });

  it("handles dosage without quantity", () => {
    const label = medicineLabel({ name: "Crocin", dosage: "650mg", quantity: "" });
    expect(label).toBe("Crocin — 650mg");
  });
});

describe("followUpBadgeClass", () => {
  it("returns red class for overdue", () => {
    expect(followUpBadgeClass("overdue")).toContain("red");
  });
  it("returns amber class for today", () => {
    expect(followUpBadgeClass("today")).toContain("amber");
  });
  it("returns blue class for upcoming", () => {
    expect(followUpBadgeClass("upcoming")).toContain("blue");
  });
  it("returns slate class for none", () => {
    expect(followUpBadgeClass("none")).toContain("slate");
  });
});
