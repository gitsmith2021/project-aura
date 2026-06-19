import { describe, it, expect } from "vitest";
import {
  isSensitiveCategory, isOpenStatus, isResolvedStatus,
  daysBetween, daysToDeadline, isOverdue, defaultDeadline,
  filterGrievances, grievanceStats, byCategoryBreakdown, grievancesCSV,
  CATEGORY_LABELS, STATUS_LABELS, GRIEVANCE_CATEGORIES, SLA_DAYS,
  type Grievance,
} from "@/lib/grievances";

function g(over: Partial<Grievance>): Grievance {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1",
    submitted_by: "u1",
    complainant_type: "student",
    category: "academic",
    subject: "Projector broken",
    description: "The projector in room 204 does not work.",
    evidence_url: null,
    status: "submitted",
    assigned_to: null,
    resolution_notes: null,
    resolved_at: null,
    deadline: null,
    created_at: "2026-06-01T00:00:00Z",
    staff: null,
    ...over,
  };
}

describe("category helpers", () => {
  it("labels every category", () => {
    expect(GRIEVANCE_CATEGORIES).toHaveLength(7);
    expect(CATEGORY_LABELS.staff_conduct).toBe("Staff Conduct");
  });

  it("flags sensitive categories that default to anonymous", () => {
    expect(isSensitiveCategory("harassment")).toBe(true);
    expect(isSensitiveCategory("ragging")).toBe(true);
    expect(isSensitiveCategory("staff_conduct")).toBe(true);
    expect(isSensitiveCategory("academic")).toBe(false);
  });
});

describe("status helpers", () => {
  it("treats submitted/acknowledged/under_review/escalated as open", () => {
    expect(isOpenStatus("submitted")).toBe(true);
    expect(isOpenStatus("acknowledged")).toBe(true);
    expect(isOpenStatus("under_review")).toBe(true);
    expect(isOpenStatus("escalated")).toBe(true);
    expect(isOpenStatus("resolved")).toBe(false);
    expect(isOpenStatus("closed")).toBe(false);
  });

  it("treats resolved and closed as resolved-for-SLA", () => {
    expect(isResolvedStatus("resolved")).toBe(true);
    expect(isResolvedStatus("closed")).toBe(true);
    expect(isResolvedStatus("escalated")).toBe(false);
  });
});

describe("deadline / SLA maths", () => {
  it("computes whole days between two dates", () => {
    expect(daysBetween("2026-06-01T00:00:00Z", "2026-06-11T00:00:00Z")).toBe(10);
  });

  it("defaultDeadline is filed date + SLA_DAYS", () => {
    expect(defaultDeadline("2026-06-01T00:00:00Z")).toBe("2026-07-01");
    expect(SLA_DAYS).toBe(30);
  });

  it("daysToDeadline is positive before and negative after", () => {
    const now = new Date("2026-06-10T12:00:00Z");
    expect(daysToDeadline("2026-06-15", now)!).toBeGreaterThan(0);
    expect(daysToDeadline("2026-06-05", now)!).toBeLessThan(0);
    expect(daysToDeadline(null, now)).toBeNull();
  });

  it("isOverdue only for open cases past the deadline", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    expect(isOverdue({ status: "under_review", deadline: "2026-06-10" }, now)).toBe(true);
    expect(isOverdue({ status: "under_review", deadline: "2026-06-30" }, now)).toBe(false);
    // resolved cases are never overdue, even past the deadline
    expect(isOverdue({ status: "resolved", deadline: "2026-06-10" }, now)).toBe(false);
    expect(isOverdue({ status: "under_review", deadline: null }, now)).toBe(false);
  });
});

describe("filterGrievances", () => {
  const rows = [
    g({ category: "academic", status: "submitted", subject: "Projector broken", description: "The projector in room 204 does not work." }),
    g({ category: "harassment", status: "resolved", subject: "Senior misbehaviour", description: "A senior was rude in the hostel." }),
    g({ category: "financial", status: "under_review", subject: "Wrong fee charged", description: "I was billed twice this term." }),
  ];

  it("filters by category and status", () => {
    expect(filterGrievances(rows, { category: "harassment" })).toHaveLength(1);
    expect(filterGrievances(rows, { status: "under_review" })).toHaveLength(1);
    expect(filterGrievances(rows, { category: "all", status: "all" })).toHaveLength(3);
  });

  it("searches subject + description", () => {
    expect(filterGrievances(rows, { search: "projector" })).toHaveLength(1);
    expect(filterGrievances(rows, { search: "room 204" })).toHaveLength(1);
    expect(filterGrievances(rows, { search: "billed twice" })).toHaveLength(1);
  });
});

describe("grievanceStats", () => {
  const now = new Date("2026-07-01T00:00:00Z");
  const rows = [
    g({ status: "resolved", created_at: "2026-06-01T00:00:00Z", resolved_at: "2026-06-11T00:00:00Z" }), // 10 days, within SLA
    g({ status: "closed",   created_at: "2026-05-01T00:00:00Z", resolved_at: "2026-06-15T00:00:00Z" }), // 45 days, breaches SLA
    g({ status: "under_review", deadline: "2026-06-20", complainant_type: "anonymous", submitted_by: null }), // overdue
    g({ status: "escalated" }),
  ];

  it("aggregates counts, resolution + SLA rates and avg days", () => {
    const s = grievanceStats(rows, now);
    expect(s.total).toBe(4);
    expect(s.resolved).toBe(2);
    expect(s.open).toBe(2);
    expect(s.escalated).toBe(1);
    expect(s.anonymous).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.resolutionRate).toBe(50);     // 2 of 4
    expect(s.withinSlaRate).toBe(50);      // 1 of 2 resolved within 30d
    expect(s.avgDaysToResolve).toBe(28);   // (10 + 45) / 2 = 27.5 → 28
  });

  it("returns null avg when nothing resolved", () => {
    const s = grievanceStats([g({ status: "submitted" })], now);
    expect(s.avgDaysToResolve).toBeNull();
    expect(s.resolutionRate).toBe(0);
  });
});

describe("byCategoryBreakdown", () => {
  it("counts and sorts categories descending", () => {
    const out = byCategoryBreakdown([
      { category: "academic" }, { category: "academic" }, { category: "ragging" },
    ]);
    expect(out[0]).toEqual({ category: "academic", count: 2 });
    expect(out[1]).toEqual({ category: "ragging", count: 1 });
  });
});

describe("grievancesCSV", () => {
  it("includes a header and masks anonymous complainants", () => {
    const csv = grievancesCSV([
      g({ complainant_type: "anonymous", submitted_by: null, status: "resolved", created_at: "2026-06-01T00:00:00Z", resolved_at: "2026-06-09T00:00:00Z" }),
    ]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Category");
    expect(lines[1]).toContain("Anonymous");
    expect(lines[1]).toContain("8"); // days to resolve
    expect(STATUS_LABELS.resolved).toBe("Resolved");
  });

  it("escapes commas in the subject", () => {
    const csv = grievancesCSV([g({ subject: "Fees, charged twice" })]);
    expect(csv).toContain('"Fees, charged twice"');
  });
});
