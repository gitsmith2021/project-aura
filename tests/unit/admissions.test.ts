import { describe, it, expect } from "vitest";
import {
  nextAdmissionStatus, canEnroll, canReject, admissionStats, generateRollNo, isValidEmail,
  ADMISSION_PIPELINE,
} from "@/lib/admissions";

describe("nextAdmissionStatus", () => {
  it("advances along the pipeline", () => {
    expect(nextAdmissionStatus("applied")).toBe("shortlisted");
    expect(nextAdmissionStatus("shortlisted")).toBe("interview");
    expect(nextAdmissionStatus("interview")).toBe("admitted");
    expect(nextAdmissionStatus("admitted")).toBe("enrolled");
  });
  it("is null at terminal states", () => {
    expect(nextAdmissionStatus("enrolled")).toBeNull();
    expect(nextAdmissionStatus("rejected")).toBeNull();
  });
});

describe("canEnroll / canReject", () => {
  it("enroll only from admitted", () => {
    expect(canEnroll("admitted")).toBe(true);
    expect(canEnroll("interview")).toBe(false);
    expect(canEnroll("enrolled")).toBe(false);
  });
  it("reject until enrolled/rejected", () => {
    expect(canReject("applied")).toBe(true);
    expect(canReject("admitted")).toBe(true);
    expect(canReject("enrolled")).toBe(false);
    expect(canReject("rejected")).toBe(false);
  });
});

describe("admissionStats", () => {
  it("buckets pipeline / admitted / enrolled / rejected", () => {
    const s = admissionStats([
      { status: "applied" }, { status: "shortlisted" }, { status: "admitted" },
      { status: "admitted" }, { status: "enrolled" }, { status: "rejected" },
    ]);
    expect(s.total).toBe(6);
    expect(s.enrolled).toBe(1);
    expect(s.rejected).toBe(1);
    expect(s.admitted).toBe(2);
    expect(s.inPipeline).toBe(4); // applied, shortlisted, admitted x2
  });
});

describe("generateRollNo", () => {
  it("formats PROG/YYYY/NNNN with zero-padding", () => {
    expect(generateRollNo("UG", 2026, 7)).toBe("UG/2026/0007");
    expect(generateRollNo("PG", 2026, 1234)).toBe("PG/2026/1234");
  });
});

describe("isValidEmail", () => {
  it("accepts well-formed, rejects malformed", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("bad@")).toBe(false);
    expect(isValidEmail("no-at.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("ADMISSION_PIPELINE", () => {
  it("is the ordered non-terminal flow", () => {
    expect(ADMISSION_PIPELINE).toEqual(["applied", "shortlisted", "interview", "admitted", "enrolled"]);
  });
});
