import { describe, it, expect } from "vitest";
import {
  isAttended, subjectAttendance, overallAttendancePct, feesSummary, resultsSummary,
  formatINR, RELATIONSHIPS, RELATIONSHIP_LABELS,
} from "@/lib/parentPortal";

describe("relationship enum", () => {
  it("has labels for every value", () => {
    expect(RELATIONSHIPS.length).toBe(5);
    for (const r of RELATIONSHIPS) expect(RELATIONSHIP_LABELS[r]).toBeTruthy();
  });
});

describe("isAttended", () => {
  it("treats anything but absent as attended", () => {
    expect(isAttended("present")).toBe(true);
    expect(isAttended("late")).toBe(true);
    expect(isAttended("Absent")).toBe(false);
    expect(isAttended(null)).toBe(false);
  });
});

describe("subjectAttendance", () => {
  it("groups by subject and computes %", () => {
    const out = subjectAttendance([
      { subject: "Maths", status: "present" },
      { subject: "Maths", status: "absent" },
      { subject: "Physics", status: "present" },
      { subject: "Physics", status: "present" },
      { subject: null, status: "present" },
    ]);
    const maths = out.find((s) => s.subject === "Maths")!;
    expect(maths).toMatchObject({ attended: 1, total: 2, pct: 50 });
    expect(out.find((s) => s.subject === "Physics")!.pct).toBe(100);
    expect(out.find((s) => s.subject === "General")).toBeTruthy(); // null → General
  });
  it("sorts alphabetically", () => {
    const out = subjectAttendance([{ subject: "Zoology", status: "present" }, { subject: "Botany", status: "present" }]);
    expect(out.map((s) => s.subject)).toEqual(["Botany", "Zoology"]);
  });
});

describe("overallAttendancePct", () => {
  it("computes the overall rate", () => {
    expect(overallAttendancePct([{ status: "present" }, { status: "present" }, { status: "absent" }, { status: "late" }])).toBe(75);
    expect(overallAttendancePct([])).toBe(0);
  });
});

describe("feesSummary", () => {
  it("sums pending dues and counts paid", () => {
    const s = feesSummary([
      { net_due: 12000, status: "pending" },
      { net_due: 5000, status: "overdue" },
      { net_due: 8000, status: "paid" },
    ]);
    expect(s.totalDue).toBe(17000);   // pending + overdue
    expect(s.pendingCount).toBe(2);
    expect(s.paidCount).toBe(1);
  });
});

describe("resultsSummary", () => {
  it("averages only published results", () => {
    const s = resultsSummary([
      { final_percentage: 80, status: "published" },
      { final_percentage: 90, status: "published" },
      { final_percentage: 50, status: "draft" },     // ignored
      { final_percentage: null, status: "published" }, // no score
    ]);
    expect(s.published).toBe(3);
    expect(s.avgPercentage).toBe(85);
  });
  it("null average when nothing scored", () => {
    expect(resultsSummary([{ final_percentage: null, status: "published" }]).avgPercentage).toBeNull();
  });
});

describe("formatINR", () => {
  it("formats / handles null", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
    expect(formatINR(null)).toBe("—");
  });
});
