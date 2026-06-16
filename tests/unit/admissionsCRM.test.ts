import { describe, it, expect } from "vitest";
import {
  nextEnquiryStatus, canConvertEnquiry, canCloseEnquiry, enquiryStats, sourceBreakdown,
  followUpDaysLeft, isFollowUpOverdue, followUpLabel, rankApplicants, filterForMerit, meritListToCSV,
  ENQUIRY_PIPELINE, ENQUIRY_SOURCES,
  type EnquiryStatus,
} from "@/lib/admissionsCRM";
import type { Admission } from "@/lib/admissions";

// minimal Admission factory
function adm(over: Partial<Admission>): Admission {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1",
    applicant_name: "X",
    applicant_email: "x@y.co",
    applicant_phone: null,
    program_applied: "UG",
    department_id: null,
    dob: null,
    address: null,
    previous_school: null,
    marks_percentage: null,
    documents_url: null,
    status: "applied",
    admin_notes: null,
    applied_at: "2026-06-01",
    updated_at: "2026-06-01",
    departments: null,
    ...over,
  };
}

describe("nextEnquiryStatus", () => {
  it("advances through the funnel", () => {
    expect(nextEnquiryStatus("new")).toBe("contacted");
    expect(nextEnquiryStatus("contacted")).toBe("interested");
    expect(nextEnquiryStatus("interested")).toBe("applied");
  });
  it("is null at the end and for terminal states", () => {
    expect(nextEnquiryStatus("applied")).toBeNull();
    expect(nextEnquiryStatus("not_interested")).toBeNull();
    expect(nextEnquiryStatus("lost")).toBeNull();
  });
});

describe("canConvertEnquiry / canCloseEnquiry", () => {
  it("can convert while active, not once applied/closed", () => {
    expect(canConvertEnquiry("new")).toBe(true);
    expect(canConvertEnquiry("interested")).toBe(true);
    expect(canConvertEnquiry("applied")).toBe(false);
    expect(canConvertEnquiry("lost")).toBe(false);
  });
  it("can close only while active", () => {
    expect(canCloseEnquiry("contacted")).toBe(true);
    expect(canCloseEnquiry("applied")).toBe(false);
    expect(canCloseEnquiry("not_interested")).toBe(false);
  });
});

describe("enquiryStats", () => {
  it("buckets active / interested / applied / lost", () => {
    const rows: { status: EnquiryStatus }[] = [
      { status: "new" }, { status: "contacted" }, { status: "interested" },
      { status: "applied" }, { status: "not_interested" }, { status: "lost" },
    ];
    const s = enquiryStats(rows);
    expect(s.total).toBe(6);
    expect(s.applied).toBe(1);
    expect(s.lost).toBe(2); // not_interested + lost
    expect(s.interested).toBe(1);
    expect(s.active).toBe(3); // new, contacted, interested
  });
});

describe("sourceBreakdown", () => {
  it("counts and sorts sources desc, dropping zeros", () => {
    const out = sourceBreakdown([
      { source: "website" }, { source: "website" }, { source: "referral" },
    ]);
    expect(out[0]).toMatchObject({ source: "website", count: 2 });
    expect(out[1]).toMatchObject({ source: "referral", count: 1 });
    expect(out.find((x) => x.source === "walk_in")).toBeUndefined();
  });
  it("covers every source key", () => {
    expect(ENQUIRY_SOURCES.length).toBe(7);
  });
});

describe("followUpDaysLeft / overdue / label", () => {
  const today = "2026-06-16";
  it("computes day deltas", () => {
    expect(followUpDaysLeft("2026-06-16", today)).toBe(0);
    expect(followUpDaysLeft("2026-06-19", today)).toBe(3);
    expect(followUpDaysLeft("2026-06-13", today)).toBe(-3);
    expect(followUpDaysLeft(null, today)).toBeNull();
  });
  it("flags overdue only for active enquiries", () => {
    expect(isFollowUpOverdue({ follow_up_date: "2026-06-10", status: "contacted" }, today)).toBe(true);
    expect(isFollowUpOverdue({ follow_up_date: "2026-06-10", status: "applied" }, today)).toBe(false);
    expect(isFollowUpOverdue({ follow_up_date: "2026-06-10", status: "lost" }, today)).toBe(false);
    expect(isFollowUpOverdue({ follow_up_date: "2026-06-20", status: "new" }, today)).toBe(false);
  });
  it("labels countdowns", () => {
    expect(followUpLabel("2026-06-16", today)).toBe("Due today");
    expect(followUpLabel("2026-06-13", today)).toBe("3d overdue");
    expect(followUpLabel("2026-06-20", today)).toBe("in 4d");
    expect(followUpLabel(null, today)).toBeNull();
  });
});

describe("rankApplicants", () => {
  it("ranks by marks desc, no-marks last, ties broken by name", () => {
    const ranked = rankApplicants([
      adm({ applicant_name: "Bala", marks_percentage: 88 }),
      adm({ applicant_name: "Anita", marks_percentage: 92 }),
      adm({ applicant_name: "Chitra", marks_percentage: null }),
      adm({ applicant_name: "Arun", marks_percentage: 88 }),
    ]);
    expect(ranked.map((r) => r.applicant_name)).toEqual(["Anita", "Arun", "Bala", "Chitra"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
});

describe("filterForMerit", () => {
  const rows = [
    adm({ program_applied: "UG", department_id: "d1" }),
    adm({ program_applied: "PG", department_id: "d1" }),
    adm({ program_applied: "UG", department_id: "d2" }),
  ];
  it("filters by program", () => {
    expect(filterForMerit(rows, { program: "UG" })).toHaveLength(2);
  });
  it("filters by department", () => {
    expect(filterForMerit(rows, { departmentId: "d1" })).toHaveLength(2);
  });
  it("combines filters and respects 'all'", () => {
    expect(filterForMerit(rows, { program: "UG", departmentId: "d1" })).toHaveLength(1);
    expect(filterForMerit(rows, { program: "all", departmentId: "all" })).toHaveLength(3);
  });
});

describe("meritListToCSV", () => {
  it("emits a header + ranked rows and escapes commas", () => {
    const ranked = rankApplicants([
      adm({ applicant_name: "Rao, K", marks_percentage: 90, program_applied: "UG", departments: { name: "Physics" } }),
    ]);
    const csv = meritListToCSV(ranked);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Rank,Applicant Name,Programme,Department,Qualifying Marks (%),Status");
    expect(lines[1]).toContain('"Rao, K"');
    expect(lines[1]).toContain("Physics");
    expect(lines[1]).toContain("90");
  });
});

describe("ENQUIRY_PIPELINE", () => {
  it("is the ordered active funnel", () => {
    expect(ENQUIRY_PIPELINE).toEqual(["new", "contacted", "interested", "applied"]);
  });
});
