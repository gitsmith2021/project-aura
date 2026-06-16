import { describe, it, expect } from "vitest";
import {
  nextApplicationStatus, canHire, canReject, isActiveApplication,
  recruitmentStats, jobPostingStats, pipelineGroups,
  daysUntilDeadline, isDeadlinePassed, deadlineLabel,
  employeeIdFromSeq,
  RECRUITMENT_PIPELINE,
  type ApplicationStatus, type JobStatus,
} from "@/lib/recruitment";

describe("nextApplicationStatus", () => {
  it("advances through the pipeline", () => {
    expect(nextApplicationStatus("applied")).toBe("screened");
    expect(nextApplicationStatus("screened")).toBe("interview");
    expect(nextApplicationStatus("interview")).toBe("offer");
    expect(nextApplicationStatus("offer")).toBe("joined");
  });
  it("returns null at end and for terminal states", () => {
    expect(nextApplicationStatus("joined")).toBeNull();
    expect(nextApplicationStatus("rejected")).toBeNull();
  });
});

describe("canHire / canReject / isActiveApplication", () => {
  it("can hire only at offer stage", () => {
    expect(canHire("offer")).toBe(true);
    expect(canHire("interview")).toBe(false);
    expect(canHire("joined")).toBe(false);
  });
  it("can reject until joined or already rejected", () => {
    expect(canReject("applied")).toBe(true);
    expect(canReject("screened")).toBe(true);
    expect(canReject("offer")).toBe(true);
    expect(canReject("joined")).toBe(false);
    expect(canReject("rejected")).toBe(false);
  });
  it("is active while in funnel (not joined/rejected)", () => {
    expect(isActiveApplication("applied")).toBe(true);
    expect(isActiveApplication("interview")).toBe(true);
    expect(isActiveApplication("joined")).toBe(false);
    expect(isActiveApplication("rejected")).toBe(false);
  });
});

describe("recruitmentStats", () => {
  const rows: { status: ApplicationStatus }[] = [
    { status: "applied" }, { status: "screened" },
    { status: "interview" }, { status: "offer" },
    { status: "joined" }, { status: "rejected" }, { status: "rejected" },
  ];
  it("counts correctly", () => {
    const s = recruitmentStats(rows);
    expect(s.total).toBe(7);
    expect(s.active).toBe(4); // applied, screened, interview, offer
    expect(s.inInterview).toBe(1);
    expect(s.offered).toBe(1);
    expect(s.joined).toBe(1);
    expect(s.rejected).toBe(2);
  });
});

describe("jobPostingStats", () => {
  it("counts open/hold/closed and sums open vacancies", () => {
    const rows: { status: JobStatus; vacancies: number }[] = [
      { status: "open", vacancies: 2 },
      { status: "open", vacancies: 1 },
      { status: "on_hold", vacancies: 1 },
      { status: "closed", vacancies: 1 },
    ];
    const s = jobPostingStats(rows);
    expect(s.open).toBe(2);
    expect(s.on_hold).toBe(1);
    expect(s.closed).toBe(1);
    expect(s.totalVacancies).toBe(3); // only open vacancies counted
  });
});

describe("pipelineGroups", () => {
  it("groups applications by status", () => {
    const rows = [
      { id: "1", status: "applied" as ApplicationStatus },
      { id: "2", status: "applied" as ApplicationStatus },
      { id: "3", status: "interview" as ApplicationStatus },
      { id: "4", status: "rejected" as ApplicationStatus },
    ];
    const groups = pipelineGroups(rows);
    expect(groups.applied).toHaveLength(2);
    expect(groups.screened).toHaveLength(0);
    expect(groups.interview).toHaveLength(1);
    expect(groups.rejected).toHaveLength(1);
  });
});

describe("deadline helpers", () => {
  const today = "2026-06-16";
  it("computes day deltas", () => {
    expect(daysUntilDeadline("2026-06-16", today)).toBe(0);
    expect(daysUntilDeadline("2026-06-20", today)).toBe(4);
    expect(daysUntilDeadline("2026-06-13", today)).toBe(-3);
    expect(daysUntilDeadline(null, today)).toBeNull();
  });
  it("detects passed deadlines", () => {
    expect(isDeadlinePassed("2026-06-13", today)).toBe(true);
    expect(isDeadlinePassed("2026-06-20", today)).toBe(false);
    expect(isDeadlinePassed(null, today)).toBe(false);
  });
  it("labels deadlines correctly", () => {
    expect(deadlineLabel("2026-06-16", today)).toBe("Expires today");
    expect(deadlineLabel("2026-06-20", today)).toBe("4d left");
    expect(deadlineLabel("2026-06-13", today)).toBe("3d overdue");
    expect(deadlineLabel(null, today)).toBeNull();
  });
});

describe("employeeIdFromSeq", () => {
  it("pads to 4 digits", () => {
    expect(employeeIdFromSeq(1)).toBe("EMP0001");
    expect(employeeIdFromSeq(42)).toBe("EMP0042");
    expect(employeeIdFromSeq(1000)).toBe("EMP1000");
  });
});

describe("RECRUITMENT_PIPELINE", () => {
  it("is the ordered active funnel", () => {
    expect(RECRUITMENT_PIPELINE).toEqual(["applied", "screened", "interview", "offer", "joined"]);
  });
});
