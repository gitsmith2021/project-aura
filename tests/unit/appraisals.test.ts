import { describe, it, expect } from "vitest";
import {
  nextAppraisalStatus, isStaffEditable, canReview,
  computeOverallScore, scoreGrade, appraisalStats, cycleCompletion,
  timeToHours, scheduleDurationHours, summarizeWorkload, workloadCSV, appraisalCSV,
  APPRAISAL_PIPELINE,
  type StaffAppraisal, type WorkloadSlot, type AppraisalStatus,
} from "@/lib/appraisals";

function appr(over: Partial<StaffAppraisal>): StaffAppraisal {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1",
    staff_id: "s1",
    academic_year_id: null,
    appraisal_period: "2025-2026 Annual",
    teaching_score: null, research_score: null, admin_score: null, overall_score: null,
    self_remarks: null, feedback: null, appraised_by: null,
    status: "pending", submitted_at: null, reviewed_at: null,
    created_at: "2026-01-01", updated_at: "2026-01-01",
    staff: null,
    ...over,
  };
}

describe("nextAppraisalStatus / pipeline", () => {
  it("advances through the pipeline and stops at completed", () => {
    expect(nextAppraisalStatus("pending")).toBe("submitted");
    expect(nextAppraisalStatus("submitted")).toBe("reviewed");
    expect(nextAppraisalStatus("reviewed")).toBe("completed");
    expect(nextAppraisalStatus("completed")).toBeNull();
  });
  it("pipeline order", () => {
    expect(APPRAISAL_PIPELINE).toEqual(["pending", "submitted", "reviewed", "completed"]);
  });
});

describe("isStaffEditable / canReview", () => {
  it("staff edits only while pending/submitted", () => {
    expect(isStaffEditable("pending")).toBe(true);
    expect(isStaffEditable("submitted")).toBe(true);
    expect(isStaffEditable("reviewed")).toBe(false);
    expect(isStaffEditable("completed")).toBe(false);
  });
  it("review allowed once submitted (or reviewed)", () => {
    expect(canReview("pending")).toBe(false);
    expect(canReview("submitted")).toBe(true);
    expect(canReview("reviewed")).toBe(true);
    expect(canReview("completed")).toBe(false);
  });
});

describe("computeOverallScore", () => {
  it("weights teaching 50 / research 30 / admin 20", () => {
    expect(computeOverallScore(80, 70, 60)).toBe(73); // 40 + 21 + 12
    expect(computeOverallScore(100, 100, 100)).toBe(100);
  });
  it("treats missing components as 0 but returns null when all null", () => {
    expect(computeOverallScore(80, null, null)).toBe(40);
    expect(computeOverallScore(null, null, null)).toBeNull();
  });
  it("rounds to 2 decimals", () => {
    expect(computeOverallScore(33, 33, 33)).toBe(33);
    expect(computeOverallScore(85, 77, 0)).toBe(65.6); // 42.5 + 23.1 + 0
  });
});

describe("scoreGrade", () => {
  it("bands the overall score", () => {
    expect(scoreGrade(90)).toBe("Outstanding");
    expect(scoreGrade(75)).toBe("Good");
    expect(scoreGrade(55)).toBe("Satisfactory");
    expect(scoreGrade(40)).toBe("Needs Improvement");
    expect(scoreGrade(null)).toBe("—");
  });
});

describe("appraisalStats / cycleCompletion", () => {
  const rows = [
    appr({ status: "pending" }),
    appr({ status: "submitted" }),
    appr({ status: "reviewed", overall_score: 80 }),
    appr({ status: "completed", overall_score: 90 }),
  ];
  it("buckets by status and averages scored rows", () => {
    const s = appraisalStats(rows);
    expect(s.total).toBe(4);
    expect(s.pending).toBe(1);
    expect(s.reviewed).toBe(1);
    expect(s.completed).toBe(1);
    expect(s.avgOverall).toBe(85);
  });
  it("avgOverall is null with no scored rows", () => {
    expect(appraisalStats([appr({ status: "pending" })]).avgOverall).toBeNull();
  });
  it("completion = reviewed + completed", () => {
    expect(cycleCompletion(rows)).toBe(50);
    expect(cycleCompletion([])).toBe(0);
  });
});

describe("timeToHours / scheduleDurationHours", () => {
  it("parses HH:MM[:SS]", () => {
    expect(timeToHours("09:00")).toBe(9);
    expect(timeToHours("09:30:00")).toBe(9.5);
    expect(timeToHours(null)).toBe(0);
  });
  it("computes positive durations, 0 when end <= start", () => {
    expect(scheduleDurationHours("09:00", "10:30")).toBe(1.5);
    expect(scheduleDurationHours("10:00", "09:00")).toBe(0);
    expect(scheduleDurationHours(null, "10:00")).toBe(10);
  });
});

describe("summarizeWorkload", () => {
  const slots: WorkloadSlot[] = [
    { staffId: "a", staffName: "Asha", department: "CS", durationHours: 1, sessionsConducted: 3 },
    { staffId: "a", staffName: "Asha", department: "CS", durationHours: 1.5, sessionsConducted: 2 },
    { staffId: "b", staffName: "Bala", department: "Maths", durationHours: 1, sessionsConducted: 0 },
  ];
  it("aggregates planned + actual per staff, sorted by name", () => {
    const out = summarizeWorkload(slots);
    expect(out.map((r) => r.staffName)).toEqual(["Asha", "Bala"]);
    const asha = out[0];
    expect(asha.slots).toBe(2);
    expect(asha.plannedHoursPerWeek).toBe(2.5);
    expect(asha.sessionsConducted).toBe(5);
    expect(asha.actualHours).toBe(6); // 1*3 + 1.5*2
    expect(out[1].actualHours).toBe(0);
  });
});

describe("CSV exports", () => {
  it("workloadCSV emits header + rows", () => {
    const csv = workloadCSV(summarizeWorkload([
      { staffId: "a", staffName: "Asha", department: "CS", durationHours: 1, sessionsConducted: 2 },
    ]));
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Staff,Department,Weekly Slots,Planned Hrs/Week,Sessions Conducted,Actual Hours");
    expect(lines[1]).toContain("Asha");
    expect(lines[1]).toContain("CS");
  });
  it("appraisalCSV includes grade + escapes commas", () => {
    const csv = appraisalCSV([
      appr({ appraisal_period: "2025-2026 Annual", overall_score: 90, status: "completed", staff: { full_name: "Rao, K", designation: "Prof", department_id: null, departments: { name: "Physics" } } }),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Overall,Grade,Status");
    expect(lines[1]).toContain('"Rao, K"');
    expect(lines[1]).toContain("Outstanding");
    expect(lines[1]).toContain("Physics");
  });
});

describe("status union sanity", () => {
  it("every status has a defined transition entry", () => {
    const all: AppraisalStatus[] = ["pending", "submitted", "reviewed", "completed"];
    for (const s of all) expect(typeof isStaffEditable(s)).toBe("boolean");
  });
});
