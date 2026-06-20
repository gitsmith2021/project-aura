import { describe, it, expect } from "vitest";
import {
  ONBOARDING_STEPS, isStepComplete, onboardingProgress, parseStaffCsv,
  type OnboardingState,
} from "@/lib/onboarding";

const empty: OnboardingState = { departments: 0, hasAcademicYear: false, feeStructures: 0, staff: 0 };
const full: OnboardingState = { departments: 3, hasAcademicYear: true, feeStructures: 2, staff: 10 };

describe("onboarding steps", () => {
  it("has welcome → done with four actionable steps", () => {
    expect(ONBOARDING_STEPS[0].id).toBe("welcome");
    expect(ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1].id).toBe("done");
    expect(ONBOARDING_STEPS.filter((s) => s.actionable).length).toBe(4);
  });

  it("framing screens are never gating", () => {
    expect(isStepComplete("welcome", empty)).toBe(true);
    expect(isStepComplete("done", empty)).toBe(true);
  });
});

describe("isStepComplete", () => {
  it("requires minimum data per actionable step", () => {
    expect(isStepComplete("departments", empty)).toBe(false);
    expect(isStepComplete("departments", { ...empty, departments: 1 })).toBe(true);
    expect(isStepComplete("academic-year", empty)).toBe(false);
    expect(isStepComplete("academic-year", { ...empty, hasAcademicYear: true })).toBe(true);
    expect(isStepComplete("fees", { ...empty, feeStructures: 1 })).toBe(true);
    expect(isStepComplete("staff", { ...empty, staff: 1 })).toBe(true);
  });
});

describe("onboardingProgress", () => {
  it("is 0 when nothing is configured", () => {
    expect(onboardingProgress(empty)).toBe(0);
  });
  it("is 100 when all four actionable steps are done", () => {
    expect(onboardingProgress(full)).toBe(100);
  });
  it("is 25 per completed actionable step", () => {
    expect(onboardingProgress({ ...empty, departments: 1 })).toBe(25);
    expect(onboardingProgress({ ...empty, departments: 1, hasAcademicYear: true })).toBe(50);
    expect(onboardingProgress({ ...empty, departments: 1, hasAcademicYear: true, feeStructures: 1 })).toBe(75);
  });
});

describe("parseStaffCsv", () => {
  it("parses a clean CSV with canonical headers", () => {
    const csv = [
      "name,email,designation,department,type",
      "Jane Doe,jane@college.edu,Professor,Computer Science,teaching",
      "John Roe,john@college.edu,Clerk,,non_teaching",
    ].join("\n");
    const { rows, errors } = parseStaffCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      full_name: "Jane Doe", email: "jane@college.edu",
      designation: "Professor", department: "Computer Science", staff_type: "teaching",
    });
    expect(rows[1].staff_type).toBe("non_teaching");
    expect(rows[1].department).toBeNull();
  });

  it("accepts header aliases and is case-insensitive", () => {
    const csv = "Full Name,E-Mail,Role,Dept,Staff Type\nAmy Lee,amy@x.edu,Lecturer,Physics,Teaching";
    const { rows } = parseStaffCsv(csv);
    expect(rows[0].full_name).toBe("Amy Lee");
    expect(rows[0].email).toBe("amy@x.edu");
    expect(rows[0].designation).toBe("Lecturer");
    expect(rows[0].department).toBe("Physics");
    expect(rows[0].staff_type).toBe("teaching");
  });

  it("normalises non-teaching variants and defaults unknown to teaching", () => {
    const csv = "name,type\nA,non-teaching\nB,office\nC,gibberish\nD,";
    const { rows } = parseStaffCsv(csv);
    expect(rows.map((r) => r.staff_type)).toEqual(["non_teaching", "non_teaching", "teaching", "teaching"]);
  });

  it("honours quoted fields containing commas", () => {
    const csv = 'name,designation\n"Doe, Jane","Head, Science"';
    const { rows } = parseStaffCsv(csv);
    expect(rows[0].full_name).toBe("Doe, Jane");
    expect(rows[0].designation).toBe("Head, Science");
  });

  it("reports rows missing a name without dropping them silently", () => {
    const csv = "name,email\n,nameless@x.edu\nReal Person,real@x.edu";
    const { rows, errors } = parseStaffCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].full_name).toBe("Real Person");
    expect(errors.some((e) => e.includes("missing name"))).toBe(true);
  });

  it("rejects rows with an invalid email", () => {
    const csv = "name,email\nBad Email,not-an-email\nGood Email,good@x.edu";
    const { rows, errors } = parseStaffCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].full_name).toBe("Good Email");
    expect(errors.some((e) => e.includes("invalid email"))).toBe(true);
  });

  it("errors when the name column is missing entirely", () => {
    const { rows, errors } = parseStaffCsv("email,designation\nx@y.edu,Prof");
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/name/i);
  });

  it("errors on empty input", () => {
    expect(parseStaffCsv("   ").errors[0]).toMatch(/empty/i);
  });
});
