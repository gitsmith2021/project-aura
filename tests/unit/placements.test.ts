import { describe, it, expect } from "vitest";
import { nextStage, isTerminalStage, checkEligibility, formatLPA, driveStageCounts, placementStats, deptWiseBreakdown, nirfPlacementCSV, STAGE_PIPELINE, type PlacementStatRow } from "@/lib/placements";

describe("nextStage / pipeline", () => {
  it("advances through the funnel and stops", () => {
    expect(nextStage("registered")).toBe("shortlisted");
    expect(nextStage("shortlisted")).toBe("interviewed");
    expect(nextStage("interviewed")).toBe("offered");
    expect(nextStage("offered")).toBe("placed");
    expect(nextStage("placed")).toBeNull();
    expect(nextStage("rejected")).toBeNull();
  });
  it("pipeline excludes rejected", () => {
    expect(STAGE_PIPELINE).toEqual(["registered", "shortlisted", "interviewed", "offered", "placed"]);
  });
  it("terminal stages", () => {
    expect(isTerminalStage("placed")).toBe(true);
    expect(isTerminalStage("rejected")).toBe(true);
    expect(isTerminalStage("offered")).toBe(false);
  });
});

describe("checkEligibility", () => {
  it("passes when no criteria", () => {
    expect(checkEligibility(null, { departmentId: "d1" }).eligible).toBe(true);
    expect(checkEligibility({}, { departmentId: "d1" }).eligible).toBe(true);
  });
  it("enforces department list strictly", () => {
    expect(checkEligibility({ departments: ["d1", "d2"] }, { departmentId: "d1" }).eligible).toBe(true);
    const r = checkEligibility({ departments: ["d1"] }, { departmentId: "d3" });
    expect(r.eligible).toBe(false);
    expect(r.reasons[0]).toMatch(/Department/);
  });
  it("empty department list = all eligible", () => {
    expect(checkEligibility({ departments: [] }, { departmentId: null }).eligible).toBe(true);
  });
  it("blocks low CGPA only when known", () => {
    expect(checkEligibility({ min_cgpa: 7 }, { departmentId: "d1", cgpa: 6.5 }).eligible).toBe(false);
    expect(checkEligibility({ min_cgpa: 7 }, { departmentId: "d1", cgpa: 8 }).eligible).toBe(true);
    expect(checkEligibility({ min_cgpa: 7 }, { departmentId: "d1" }).eligible).toBe(true); // unknown → advisory
  });
  it("blocks backlogs only when known and present", () => {
    expect(checkEligibility({ no_backlogs: true }, { departmentId: "d1", backlogs: 2 }).eligible).toBe(false);
    expect(checkEligibility({ no_backlogs: true }, { departmentId: "d1", backlogs: 0 }).eligible).toBe(true);
    expect(checkEligibility({ no_backlogs: true }, { departmentId: "d1" }).eligible).toBe(true);
  });
  it("collects multiple reasons", () => {
    const r = checkEligibility({ departments: ["d1"], min_cgpa: 7, no_backlogs: true }, { departmentId: "d2", cgpa: 6, backlogs: 1 });
    expect(r.reasons).toHaveLength(3);
  });
});

describe("formatLPA", () => {
  it("formats and handles null", () => {
    expect(formatLPA(12)).toBe("₹12.00 LPA");
    expect(formatLPA(8.5)).toBe("₹8.50 LPA");
    expect(formatLPA(null)).toBe("—");
  });
});

describe("driveStageCounts", () => {
  it("counts each stage", () => {
    const c = driveStageCounts([
      { stage_status: "registered" }, { stage_status: "registered" },
      { stage_status: "placed" }, { stage_status: "rejected" },
    ]);
    expect(c.registered).toBe(2);
    expect(c.placed).toBe(1);
    expect(c.rejected).toBe(1);
    expect(c.shortlisted).toBe(0);
  });
});

describe("placementStats", () => {
  const rows: PlacementStatRow[] = [
    { studentId: "s1", stageStatus: "placed", offerCTC: 10, department: "CS" },
    { studentId: "s2", stageStatus: "offered", offerCTC: null, department: "CS" },
    { studentId: "s3", stageStatus: "registered", offerCTC: null, department: "EC" },
    { studentId: "s1", stageStatus: "registered", offerCTC: null, department: "CS" }, // same student, 2nd drive
  ];
  it("counts distinct students and computes rate + CTC", () => {
    const s = placementStats(rows);
    expect(s.registeredStudents).toBe(3); // s1, s2, s3
    expect(s.placedStudents).toBe(1);     // s1
    expect(s.placementRate).toBe(33);     // 1/3
    expect(s.offers).toBe(2);             // offered + placed
    expect(s.avgCTC).toBe(10);
    expect(s.highestCTC).toBe(10);
  });
  it("handles empty", () => {
    const s = placementStats([]);
    expect(s.placementRate).toBe(0);
    expect(s.avgCTC).toBeNull();
    expect(s.highestCTC).toBeNull();
  });
});

describe("deptWiseBreakdown", () => {
  it("aggregates per department, sorted by placed desc", () => {
    const out = deptWiseBreakdown([
      { studentId: "s1", stageStatus: "placed", offerCTC: 12, department: "CS" },
      { studentId: "s2", stageStatus: "registered", offerCTC: null, department: "CS" },
      { studentId: "s3", stageStatus: "placed", offerCTC: 8, department: "EC" },
      { studentId: "s4", stageStatus: "placed", offerCTC: 10, department: "EC" },
    ]);
    expect(out[0].department).toBe("EC"); // 2 placed
    expect(out[0].placed).toBe(2);
    expect(out[0].avgCTC).toBe(9);
    expect(out[1].department).toBe("CS");
    expect(out[1].registered).toBe(2);
    expect(out[1].placed).toBe(1);
  });
  it("labels missing department as Unassigned", () => {
    const out = deptWiseBreakdown([{ studentId: "s1", stageStatus: "registered", offerCTC: null, department: null }]);
    expect(out[0].department).toBe("Unassigned");
  });
});

describe("nirfPlacementCSV", () => {
  it("emits header + computed placement %", () => {
    const csv = nirfPlacementCSV([{ department: "CS", registered: 4, placed: 3, avgCTC: 9.5 }]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Department,Registered,Placed,Placement %,Avg CTC (LPA)");
    expect(lines[1]).toBe("CS,4,3,75,9.5");
  });
});
