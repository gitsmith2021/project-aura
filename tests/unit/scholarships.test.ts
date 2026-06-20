import { describe, it, expect } from "vitest";
import { nextStatus, checkEligibility, concessionTypeForScheme, formatINR, isDeadlinePassed, scholarshipStats, applicationsCSV, STATUS_PIPELINE, SCHEME_TYPES, type ScholarshipApplication, type ScholarshipStatus } from "@/lib/scholarships";

describe("nextStatus / pipeline", () => {
  it("advances applied → verified → approved → disbursed", () => {
    expect(nextStatus("applied")).toBe("verified");
    expect(nextStatus("verified")).toBe("approved");
    expect(nextStatus("approved")).toBe("disbursed");
    expect(nextStatus("disbursed")).toBeNull();
    expect(nextStatus("rejected")).toBeNull();
  });
  it("pipeline excludes rejected", () => {
    expect(STATUS_PIPELINE).toEqual(["applied", "verified", "approved", "disbursed"]);
  });
});

describe("checkEligibility", () => {
  it("passes with no criteria", () => {
    expect(checkEligibility(null, { category: "SC" }).eligible).toBe(true);
    expect(checkEligibility({}, { category: null }).eligible).toBe(true);
  });
  it("enforces category strictly", () => {
    expect(checkEligibility({ categories: ["SC", "ST"] }, { category: "SC" }).eligible).toBe(true);
    const r = checkEligibility({ categories: ["SC", "ST"] }, { category: "OBC" });
    expect(r.eligible).toBe(false);
    expect(r.reasons[0]).toMatch(/SC \/ ST/);
  });
  it("empty category list = open to all", () => {
    expect(checkEligibility({ categories: [] }, { category: null }).eligible).toBe(true);
  });
  it("marks/income block only when the value is known", () => {
    expect(checkEligibility({ min_marks: 60 }, { category: "SC", marks: 55 }).eligible).toBe(false);
    expect(checkEligibility({ min_marks: 60 }, { category: "SC", marks: 70 }).eligible).toBe(true);
    expect(checkEligibility({ min_marks: 60 }, { category: "SC" }).eligible).toBe(true); // unknown → advisory
    expect(checkEligibility({ income_limit: 250000 }, { category: "SC", income: 300000 }).eligible).toBe(false);
    expect(checkEligibility({ income_limit: 250000 }, { category: "SC", income: 100000 }).eligible).toBe(true);
    expect(checkEligibility({ income_limit: 250000 }, { category: "SC" }).eligible).toBe(true);
  });
  it("collects multiple reasons", () => {
    const r = checkEligibility({ categories: ["SC"], min_marks: 60, income_limit: 200000 }, { category: "OBC", marks: 50, income: 300000 });
    expect(r.reasons).toHaveLength(3);
  });
});

describe("concessionTypeForScheme", () => {
  it("maps scheme types to fee concession types", () => {
    expect(concessionTypeForScheme("sports")).toBe("sports_quota");
    expect(concessionTypeForScheme("merit")).toBe("merit");
    expect(concessionTypeForScheme("government_central")).toBe("other");
    expect(concessionTypeForScheme("sc_st_obc")).toBe("other");
  });
  it("covers every scheme type without throwing", () => {
    for (const t of SCHEME_TYPES) expect(typeof concessionTypeForScheme(t)).toBe("string");
  });
});

describe("formatINR / isDeadlinePassed", () => {
  it("formats rupees with Indian grouping", () => {
    expect(formatINR(250000)).toBe("₹2,50,000");
    expect(formatINR(null)).toBe("—");
  });
  it("detects passed deadlines", () => {
    expect(isDeadlinePassed("2026-01-01", "2026-06-18")).toBe(true);
    expect(isDeadlinePassed("2026-12-31", "2026-06-18")).toBe(false);
    expect(isDeadlinePassed(null, "2026-06-18")).toBe(false);
  });
});

function app(over: Partial<ScholarshipApplication>): ScholarshipApplication {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1", scheme_id: "s1", student_id: "st1", academic_year_id: null,
    application_date: "2026-06-01", documents_url: null, status: "applied",
    disbursed_amount: null, disbursed_at: null, admin_notes: null, created_at: "2026-06-01",
    scholarship_schemes: null, students: null, ...over,
  };
}

describe("scholarshipStats", () => {
  it("buckets statuses and sums disbursed amounts", () => {
    const s = scholarshipStats([
      app({ status: "applied" }),
      app({ status: "verified" }),
      app({ status: "approved" }),
      app({ status: "rejected" }),
      app({ status: "disbursed", disbursed_amount: 25000 }),
      app({ status: "disbursed", disbursed_amount: 15000 }),
    ]);
    expect(s.total).toBe(6);
    expect(s.pending).toBe(2);   // applied + verified
    expect(s.approved).toBe(1);
    expect(s.rejected).toBe(1);
    expect(s.disbursed).toBe(2);
    expect(s.totalDisbursed).toBe(40000);
  });
});

describe("applicationsCSV", () => {
  it("emits header + escapes commas", () => {
    const csv = applicationsCSV([
      app({
        status: "disbursed", disbursed_amount: 25000, application_date: "2026-06-01",
        students: { full_name: "Rao, K", roll_no: "22CS01", category: "SC" },
        scholarship_schemes: { name: "Post-Matric", scheme_type: "sc_st_obc", amount_per_student: 25000 },
      }),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Student,Roll No,Category,Scheme,Type,Status,Disbursed Amount,Applied On");
    expect(lines[1]).toContain('"Rao, K"');
    expect(lines[1]).toContain("SC");
    expect(lines[1]).toContain("Disbursed");
    expect(lines[1]).toContain("25000");
  });
});
