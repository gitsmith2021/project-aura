import { describe, it, expect } from "vitest";
import {
  programLabel, graduationYearToBatch, alumniStats, employmentRate, gradYearBreakdown,
  filterAlumni, announcementAudienceLabel, announcementMatchesAlumnus, alumniToCSV,
  type Alumnus,
} from "@/lib/alumni";

// minimal Alumnus factory
function al(over: Partial<Alumnus>): Alumnus {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1",
    profile_id: null,
    source_student_id: null,
    full_name: "X",
    email: null,
    phone: null,
    roll_no: null,
    program: "UG",
    department_id: null,
    graduation_year: 2024,
    batch: null,
    current_employer: null,
    current_designation: null,
    linkedin_url: null,
    city: null,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    departments: null,
    ...over,
  };
}

describe("programLabel", () => {
  it("expands UG/PG and falls back", () => {
    expect(programLabel("UG")).toBe("Under Graduate");
    expect(programLabel("PG")).toBe("Post Graduate");
    expect(programLabel("Diploma")).toBe("Diploma");
    expect(programLabel(null)).toBe("—");
  });
});

describe("graduationYearToBatch", () => {
  it("combines year + programme", () => {
    expect(graduationYearToBatch(2024, "UG")).toBe("2024 UG");
    expect(graduationYearToBatch(2024, null)).toBe("2024");
  });
});

describe("alumniStats", () => {
  it("counts total, employed, linkedin and distinct batches", () => {
    const rows = [
      al({ graduation_year: 2024, current_employer: "Infosys", linkedin_url: "x" }),
      al({ graduation_year: 2024, current_employer: "  ", linkedin_url: null }),
      al({ graduation_year: 2023, current_employer: "TCS", linkedin_url: "y" }),
    ];
    const s = alumniStats(rows);
    expect(s.total).toBe(3);
    expect(s.employed).toBe(2);       // blank employer doesn't count
    expect(s.withLinkedIn).toBe(2);
    expect(s.batches).toBe(2);        // 2024 + 2023
  });
});

describe("employmentRate", () => {
  it("is an integer percentage and 0 for empty", () => {
    expect(employmentRate([])).toBe(0);
    expect(employmentRate([al({ current_employer: "A" }), al({ current_employer: null }), al({ current_employer: "B" })])).toBe(67);
  });
});

describe("gradYearBreakdown", () => {
  it("counts per year, most recent first", () => {
    const out = gradYearBreakdown([
      al({ graduation_year: 2022 }), al({ graduation_year: 2024 }), al({ graduation_year: 2024 }),
    ]);
    expect(out).toEqual([
      { year: 2024, count: 2 },
      { year: 2022, count: 1 },
    ]);
  });
});

describe("filterAlumni", () => {
  const rows = [
    al({ full_name: "Asha", graduation_year: 2024, department_id: "d1", program: "UG", current_employer: "Zoho" }),
    al({ full_name: "Bala", graduation_year: 2023, department_id: "d2", program: "PG", city: "Chennai" }),
    al({ full_name: "Chitra", graduation_year: 2024, department_id: "d1", program: "PG" }),
  ];
  it("filters by year / department / programme", () => {
    expect(filterAlumni(rows, { year: 2024 })).toHaveLength(2);
    expect(filterAlumni(rows, { departmentId: "d2" })).toHaveLength(1);
    expect(filterAlumni(rows, { program: "PG" })).toHaveLength(2);
  });
  it("respects 'all' and combines", () => {
    expect(filterAlumni(rows, { year: "all", departmentId: "all", program: "all" })).toHaveLength(3);
    expect(filterAlumni(rows, { year: 2024, program: "PG" })).toHaveLength(1);
  });
  it("searches across name, employer and city", () => {
    expect(filterAlumni(rows, { search: "zoho" }).map((r) => r.full_name)).toEqual(["Asha"]);
    expect(filterAlumni(rows, { search: "chennai" }).map((r) => r.full_name)).toEqual(["Bala"]);
  });
});

describe("announcementAudienceLabel", () => {
  it("describes every targeting combination", () => {
    expect(announcementAudienceLabel(null, null)).toBe("All alumni");
    expect(announcementAudienceLabel(2024, "UG")).toBe("2024 UG batch");
    expect(announcementAudienceLabel(2024, null)).toBe("Class of 2024");
    expect(announcementAudienceLabel(null, "PG")).toBe("PG alumni");
  });
});

describe("announcementMatchesAlumnus", () => {
  const me = { graduation_year: 2024, program: "UG" };
  it("treats null targets as wildcards", () => {
    expect(announcementMatchesAlumnus({ graduation_year: null, program: null }, me)).toBe(true);
    expect(announcementMatchesAlumnus({ graduation_year: 2024, program: null }, me)).toBe(true);
    expect(announcementMatchesAlumnus({ graduation_year: null, program: "UG" }, me)).toBe(true);
  });
  it("excludes non-matching year or programme", () => {
    expect(announcementMatchesAlumnus({ graduation_year: 2023, program: null }, me)).toBe(false);
    expect(announcementMatchesAlumnus({ graduation_year: null, program: "PG" }, me)).toBe(false);
    expect(announcementMatchesAlumnus({ graduation_year: 2024, program: "UG" }, me)).toBe(true);
  });
});

describe("alumniToCSV", () => {
  it("emits a header + rows and escapes commas", () => {
    const csv = alumniToCSV([
      al({ full_name: "Rao, K", graduation_year: 2024, program: "UG", departments: { name: "Physics" }, current_employer: "Wipro", city: "Pune" }),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Roll No,Programme,Department,Graduation Year,Email,Phone,Employer,Designation,City,LinkedIn");
    expect(lines[1]).toContain('"Rao, K"');
    expect(lines[1]).toContain("Physics");
    expect(lines[1]).toContain("Wipro");
    expect(lines[1]).toContain("2024");
  });
});
