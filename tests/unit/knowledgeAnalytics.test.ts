import { describe, it, expect } from "vitest";
import {
  uploadsByMonth, uploadsByCategory, uploadsByDepartment, topContributors,
  naacCoverage, departmentParticipation, knowledgeHealthScore, analyticsCsv,
  type AnalyticsResource,
} from "@/lib/knowledgeAnalytics";

const NOW = new Date(2026, 5, 15); // 15 Jun 2026 (local)

const R = (over: Partial<AnalyticsResource>): AnalyticsResource => ({
  category: "academic", content_type: "notes", department_id: null, naac_criterion: null,
  created_at: "2026-06-01T00:00:00Z", download_count: 0, uploader_name: "A", status: "published",
  departments: null, ...over,
});

const res: AnalyticsResource[] = [
  R({ uploader_name: "A", download_count: 5, created_at: "2026-06-01T00:00:00Z", category: "academic", departments: { name: "CS" } }),
  R({ uploader_name: "A", download_count: 3, created_at: "2026-05-10T00:00:00Z", category: "research", departments: { name: "CS" } }),
  R({ uploader_name: "B", download_count: 10, created_at: "2025-12-01T00:00:00Z", category: "accreditation", naac_criterion: "3", departments: { name: "Physics" } }),
  R({ uploader_name: "B", download_count: 0, created_at: "2024-01-01T00:00:00Z", category: "accreditation", naac_criterion: "3", departments: null }),
];

describe("uploadsByMonth", () => {
  it("returns trailing months, newest last, with correct counts", () => {
    const m = uploadsByMonth(res, 12, NOW);
    expect(m).toHaveLength(12);
    expect(m[m.length - 1].month).toBe("2026-06");
    expect(m[0].month).toBe("2025-07");
    const find = (k: string) => m.find((x) => x.month === k)?.count ?? -1;
    expect(find("2026-06")).toBe(1);
    expect(find("2026-05")).toBe(1);
    expect(find("2025-12")).toBe(1);
    expect(m.reduce((s, x) => s + x.count, 0)).toBe(3); // 2024-01 is outside the window
  });
});

describe("uploadsByCategory / uploadsByDepartment", () => {
  it("zero-fills all 7 categories and ranks", () => {
    const c = uploadsByCategory(res);
    expect(c).toHaveLength(7);
    expect(c[0]).toEqual({ category: "accreditation", label: "Accreditation", count: 2 });
    expect(c.find((x) => x.category === "library")?.count).toBe(0);
  });
  it("groups by department name with Unassigned fallback", () => {
    const d = uploadsByDepartment(res);
    expect(d.find((x) => x.department === "CS")?.count).toBe(2);
    expect(d.find((x) => x.department === "Physics")?.count).toBe(1);
    expect(d.find((x) => x.department === "Unassigned")?.count).toBe(1);
  });
});

describe("topContributors", () => {
  it("aggregates uploads/downloads and breaks ties by downloads", () => {
    const t = topContributors(res);
    expect(t).toEqual([
      { name: "B", uploads: 2, downloads: 10 },
      { name: "A", uploads: 2, downloads: 8 },
    ]);
  });
});

describe("naacCoverage", () => {
  it("counts criterion evidence and flags gaps", () => {
    const cov = naacCoverage(res, 3);
    expect(cov).toHaveLength(7);
    const c3 = cov.find((x) => x.criterion === "3")!;
    expect(c3.count).toBe(2);
    expect(c3.gap).toBe(true); // 2 < 3
    expect(cov.find((x) => x.criterion === "1")!.gap).toBe(true);
  });
});

describe("participation + health score", () => {
  it("participation %", () => {
    expect(departmentParticipation(res, 4)).toEqual({ uploaders: 2, facultyCount: 4, pct: 50 });
    expect(departmentParticipation(res, 0).pct).toBe(0);
  });
  it("composite health score", () => {
    const h = knowledgeHealthScore(res, 4, NOW);
    expect(h).toEqual({ score: 41, volume: 4, diversity: 43, currency: 75, participation: 50 });
  });
});

describe("analyticsCsv", () => {
  it("includes overview + a NAAC gap marker", () => {
    const csv = analyticsCsv(res, 4, NOW);
    expect(csv).toContain("Knowledge Health Score");
    expect(csv).toContain("Accreditation");
    expect(csv).toMatch(/\(GAP\)/);
  });
});
