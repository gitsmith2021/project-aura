import { describe, it, expect } from "vitest";
import {
  KH_CATEGORIES, CONTENT_TYPES_BY_CATEGORY, contentTypesFor, categoryLabel,
  contentTypeLabel, visibilityLabel, criterionLabel, isLinkResource,
  resourceKindLabel, parseTags, validateResource, matchesFilters,
  hasActiveFacets, tagCloud, topDownloaded, recentlyAdded, distinctAcademicYears,
} from "@/lib/knowledgeHub";

describe("taxonomy", () => {
  it("has 7 categories, each with content types", () => {
    expect(KH_CATEGORIES).toHaveLength(7);
    for (const c of KH_CATEGORIES) {
      expect(contentTypesFor(c.value).length).toBeGreaterThan(0);
    }
  });
  it("content types are unique across categories", () => {
    const all = Object.values(CONTENT_TYPES_BY_CATEGORY).flat().map((t) => t.value);
    expect(new Set(all).size).toBe(all.length);
  });
  it("labels resolve, with fallbacks", () => {
    expect(categoryLabel("research")).toBe("Research");
    expect(categoryLabel("unknown")).toBe("unknown");
    expect(contentTypeLabel("research_paper")).toBe("Research Paper");
    expect(visibilityLabel("department")).toBe("Department only");
    expect(criterionLabel("3")).toContain("C3");
    expect(criterionLabel(null)).toBeNull();
    expect(criterionLabel("9")).toBe("C9");
  });
});

describe("isLinkResource / resourceKindLabel", () => {
  it("detects external-link resources", () => {
    expect(isLinkResource({ file_url: null, external_url: "https://x" })).toBe(true);
    expect(isLinkResource({ file_url: "a.pdf", external_url: null })).toBe(false);
    expect(isLinkResource({ file_url: null, external_url: null })).toBe(false);
  });
  it("derives a kind badge", () => {
    expect(resourceKindLabel({ file_url: null, external_url: "https://x" })).toBe("Link");
    expect(resourceKindLabel({ file_url: "path/notes.pdf", external_url: null })).toBe("PDF");
    expect(resourceKindLabel({ file_url: "path/deck.pptx?token=1", external_url: null })).toBe("PPTX");
    expect(resourceKindLabel({ file_url: "noext", external_url: null })).toBe("File");
  });
});

describe("parseTags", () => {
  it("splits, trims, lowercases, dedupes", () => {
    expect(parseTags("AI, ml,  AI \n DeepLearning")).toEqual(["ai", "ml", "deeplearning"]);
    expect(parseTags("   ")).toEqual([]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("validateResource", () => {
  const base = { title: "T", category: "academic", content_type: "notes", file_url: "a.pdf" };
  it("accepts a valid file resource", () => {
    expect(validateResource(base)).toBeNull();
  });
  it("accepts an external-link resource", () => {
    expect(validateResource({ ...base, file_url: null, external_url: "https://x" })).toBeNull();
  });
  it("requires title / category / type / a source", () => {
    expect(validateResource({ ...base, title: "" })).toMatch(/title/i);
    expect(validateResource({ ...base, category: "bogus" })).toMatch(/category/i);
    expect(validateResource({ ...base, content_type: "" })).toMatch(/content type/i);
    expect(validateResource({ ...base, file_url: null, external_url: "" })).toMatch(/file or an external link/i);
  });
});

describe("matchesFilters", () => {
  const r = {
    title: "Intro to ML", description: "neural nets", category: "academic",
    content_type: "notes", department_id: "d1", tags: ["ai", "ml"], naac_criterion: "2",
  };
  it("matches when empty", () => expect(matchesFilters(r, {})).toBe(true));
  it("filters by category / type / dept / criterion", () => {
    expect(matchesFilters(r, { category: "research" })).toBe(false);
    expect(matchesFilters(r, { contentType: "notes" })).toBe(true);
    expect(matchesFilters(r, { departmentId: "d2" })).toBe(false);
    expect(matchesFilters(r, { naacCriterion: "2" })).toBe(true);
    expect(matchesFilters(r, { naacCriterion: "3" })).toBe(false);
  });
  it("searches title, description and tags", () => {
    expect(matchesFilters(r, { search: "neural" })).toBe(true);
    expect(matchesFilters(r, { search: "ML" })).toBe(true);
    expect(matchesFilters(r, { search: "physics" })).toBe(false);
  });
  it("filters by academic year and tag (KH-2)", () => {
    const r2 = { ...r, academic_year: "2025-26" };
    expect(matchesFilters(r2, { academicYear: "2025-26" })).toBe(true);
    expect(matchesFilters(r2, { academicYear: "2024-25" })).toBe(false);
    expect(matchesFilters(r2, { tag: "ai" })).toBe(true);
    expect(matchesFilters(r2, { tag: "physics" })).toBe(false);
  });
});

describe("KH-2 discovery helpers", () => {
  const rs = [
    { tags: ["ai", "ml"], download_count: 5, created_at: "2026-06-01", academic_year: "2025-26" },
    { tags: ["ai"], download_count: 0, created_at: "2026-06-10", academic_year: "2024-25" },
    { tags: ["physics"], download_count: 12, created_at: "2026-05-20", academic_year: "2025-26" },
  ];

  it("hasActiveFacets ignores free-text search", () => {
    expect(hasActiveFacets({ search: "x" })).toBe(false);
    expect(hasActiveFacets({ category: "academic" })).toBe(true);
    expect(hasActiveFacets({ tag: "ai" })).toBe(true);
    expect(hasActiveFacets({})).toBe(false);
  });

  it("tagCloud counts and sorts by frequency", () => {
    expect(tagCloud(rs)).toEqual([
      { tag: "ai", count: 2 },
      { tag: "ml", count: 1 },
      { tag: "physics", count: 1 },
    ]);
  });

  it("topDownloaded excludes zero and ranks desc", () => {
    const top = topDownloaded(rs, 5);
    expect(top.map((r) => r.download_count)).toEqual([12, 5]);
  });

  it("recentlyAdded sorts newest first", () => {
    expect(recentlyAdded(rs, 2).map((r) => r.created_at)).toEqual(["2026-06-10", "2026-06-01"]);
  });

  it("distinctAcademicYears dedupes and sorts desc", () => {
    expect(distinctAcademicYears(rs)).toEqual(["2025-26", "2024-25"]);
  });
});
