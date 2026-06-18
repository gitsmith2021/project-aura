import { describe, it, expect } from "vitest";
import {
  formatINR, filterPublications, researchStats, pubsByYear, publicationsByFaculty, publicationsCSV,
  PROJECT_STATUSES, PUB_TYPES,
  type Publication, type ResearchProject,
} from "@/lib/research";

function pub(over: Partial<Publication>): Publication {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1", staff_id: "s1", title: "x", pub_type: "journal",
    journal_name: null, publisher: null, pub_year: 2025, doi: null,
    scopus_indexed: false, ugc_listed: false, impact_factor: null, authors: null,
    document_url: null, created_at: "2026-01-01", staff: null, ...over,
  };
}
function proj(over: Partial<ResearchProject>): ResearchProject {
  return {
    id: Math.random().toString(36).slice(2),
    institution_id: "i1", title: "p", principal_investigator: null, co_investigators: null,
    funding_agency: null, funding_amount: null, funding_spent: null, start_date: null, end_date: null,
    status: "ongoing", department_id: null, created_at: "2026-01-01", staff: null, departments: null, ...over,
  };
}

describe("enum coverage", () => {
  it("counts", () => {
    expect(PROJECT_STATUSES).toHaveLength(4);
    expect(PUB_TYPES).toHaveLength(6);
  });
});

describe("formatINR", () => {
  it("formats and handles null", () => {
    expect(formatINR(1500000)).toBe("₹15,00,000");
    expect(formatINR(null)).toBe("—");
  });
});

describe("filterPublications", () => {
  const rows = [
    pub({ pub_type: "journal", pub_year: 2025, scopus_indexed: true, title: "Neural nets", journal_name: "IEEE", staff: { full_name: "Asha", designation: null } }),
    pub({ pub_type: "conference", pub_year: 2024, ugc_listed: true }),
    pub({ pub_type: "journal", pub_year: 2024, scopus_indexed: false }),
  ];
  it("filters by type / year", () => {
    expect(filterPublications(rows, { type: "journal" })).toHaveLength(2);
    expect(filterPublications(rows, { year: 2024 })).toHaveLength(2);
  });
  it("filters by scopus / ugc flags", () => {
    expect(filterPublications(rows, { scopusOnly: true })).toHaveLength(1);
    expect(filterPublications(rows, { ugcOnly: true })).toHaveLength(1);
  });
  it("searches title/journal/faculty", () => {
    expect(filterPublications(rows, { search: "neural" })).toHaveLength(1);
    expect(filterPublications(rows, { search: "ieee" })).toHaveLength(1);
    expect(filterPublications(rows, { search: "asha" })).toHaveLength(1);
  });
});

describe("researchStats", () => {
  it("aggregates projects + publications", () => {
    const s = researchStats(
      [
        proj({ status: "ongoing", funding_amount: 500000, funding_spent: 200000 }),
        proj({ status: "proposed" }),
        proj({ status: "completed", funding_amount: 100000 }),
      ],
      [
        pub({ pub_type: "journal", scopus_indexed: true, ugc_listed: true }),
        pub({ pub_type: "patent" }),
        pub({ pub_type: "journal", scopus_indexed: true }),
      ]
    );
    expect(s.activeProjects).toBe(2);     // ongoing + proposed
    expect(s.completedProjects).toBe(1);
    expect(s.totalFunding).toBe(600000);
    expect(s.totalSpent).toBe(200000);
    expect(s.totalPublications).toBe(3);
    expect(s.scopusCount).toBe(2);
    expect(s.ugcCount).toBe(1);
    expect(s.patents).toBe(1);
  });
});

describe("pubsByYear", () => {
  it("counts per year, recent first", () => {
    expect(pubsByYear([pub({ pub_year: 2023 }), pub({ pub_year: 2025 }), pub({ pub_year: 2025 })]))
      .toEqual([{ year: 2025, count: 2 }, { year: 2023, count: 1 }]);
  });
});

describe("publicationsByFaculty", () => {
  it("aggregates per faculty with scopus + avg impact, sorted desc", () => {
    const out = publicationsByFaculty([
      pub({ staff_id: "a", staff: { full_name: "Asha", designation: null }, scopus_indexed: true, impact_factor: 4 }),
      pub({ staff_id: "a", staff: { full_name: "Asha", designation: null }, impact_factor: 2 }),
      pub({ staff_id: "b", staff: { full_name: "Bala", designation: null } }),
    ]);
    expect(out[0]).toMatchObject({ name: "Asha", publications: 2, scopus: 1, avgImpact: 3 });
    expect(out[1]).toMatchObject({ name: "Bala", publications: 1, avgImpact: null });
  });
});

describe("publicationsCSV", () => {
  it("emits header + escapes commas + Yes/No flags", () => {
    const csv = publicationsCSV([
      pub({ title: "Graphs, trees", pub_type: "journal", pub_year: 2025, scopus_indexed: true, ugc_listed: false, journal_name: "Springer", staff: { full_name: "Asha", designation: null } }),
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Title,Faculty,Type,Journal / Publisher,Year,DOI,Scopus,UGC-CARE,Impact Factor");
    expect(lines[1]).toContain('"Graphs, trees"');
    expect(lines[1]).toContain("Asha");
    expect(lines[1]).toContain("Springer");
    expect(lines[1]).toContain("Yes");
    expect(lines[1]).toContain("No");
  });
});
