import { describe, it, expect } from "vitest";
import type { EntityDef } from "@/lib/dataExplorer";
import { extractQuery } from "@/lib/intelligence/slotExtractor";
import { entityConfidence, slotConfidence, responseConfidence, overallConfidence } from "@/lib/intelligence/confidence";
import { rankAll, bigramSimilarity } from "@/lib/intelligence/semantic";

const col = (key: string, label: string, type: EntityDef["columns"][number]["type"], f = true, g = false, a = false) =>
  ({ key, label, type, filterable: f, groupable: g, aggregatable: a });
const students: EntityDef = {
  key: "students", label: "Students", category: "People", source: "students",
  columns: [col("full_name", "Name", "text"), col("student_year", "Year", "number", true, true, true), col("department_id", "Department", "text", true, true), col("is_active", "Active", "boolean")],
  defaultDateField: null, sortOrder: 1,
};
const staffSalary: EntityDef = {
  key: "staff_salary", label: "Staff Salary", category: "Finance", source: "staff_salary",
  columns: [col("full_name", "Name", "text"), col("department_id", "Department", "text", true, true), col("net_salary", "Net Salary", "number", true, false, true)],
  defaultDateField: null, sortOrder: 20,
};
const catalog = [students, staffSalary];

describe("confidence engine", () => {
  it("entity confidence rises with the score margin", () => {
    expect(entityConfidence(3, false)).toBeGreaterThan(entityConfidence(1, false));
    expect(entityConfidence(1, false)).toBeGreaterThan(entityConfidence(0, false));
    expect(entityConfidence(0, false)).toBe(0.6);          // tie → uncertain
    expect(entityConfidence(5, true)).toBe(0.7);            // override is heuristic
  });
  it("slot confidence dips when a value still needs resolution", () => {
    const clean = { entity: "students", filters: [{ column: "student_year", operator: "eq" as const, value: 2 }] } as never;
    const pending = { entity: "students", filters: [{ column: "department_id", operator: "eq" as const, value: "x", resolve: true, rawValue: "cs" }] } as never;
    expect(slotConfidence(clean)).toBeGreaterThan(slotConfidence(pending));
  });
  it("response confidence is higher for an explicit shape than the LIST default", () => {
    expect(responseConfidence({ responseHint: "DISTRIBUTION" } as never)).toBeGreaterThan(responseConfidence({ responseHint: "LIST" } as never));
  });
  it("overall is the weakest stage", () => {
    expect(overallConfidence({ entity: 0.9, slots: 0.7, response: 0.92, semantic: 0.8 })).toBe(0.7);
  });
  it("extractQuery attaches confidence + parts", () => {
    const ex = extractQuery("total students", catalog)!;
    expect(ex.confidence).toBeGreaterThan(0.5);
    expect(ex.confidenceParts).toBeTruthy();
    expect(ex.confidenceParts!.entity).toBeGreaterThan(0);
  });
});

describe("WS7 — DB aliases tune routing without code changes", () => {
  it("an unknown phrase matches nothing until an alias is added", () => {
    expect(extractQuery("how many freshers do we have", catalog)).toBeNull();
    const ex = extractQuery("how many freshers do we have", catalog, { students: ["freshers"] });
    expect(ex?.entity).toBe("students");
    expect(ex?.responseHint).toBe("KPI");
  });
  it("aliases merge with built-in synonyms (don't replace them)", () => {
    expect(extractQuery("total students", catalog, { staff_salary: ["paypacket"] })?.entity).toBe("students");
  });
});

describe("clarification — ambiguity detection (rankAll)", () => {
  const AMBIGUITY_MARGIN = 0.12;
  it("flags two near-equal matches as ambiguous", () => {
    const cands = [{ raw: "MBA HR", resolved: "p1" }, { raw: "MBA Finance", resolved: "p2" }, { raw: "Physics", resolved: "p3" }];
    const ranked = rankAll("mba", cands);
    expect(ranked.length).toBeGreaterThanOrEqual(2);
    expect(ranked[0].score - ranked[1].score).toBeLessThan(AMBIGUITY_MARGIN); // → clarify
  });
  it("does not flag a clear winner", () => {
    const cands = [{ raw: "Computer Science", resolved: "d1" }, { raw: "Commerce", resolved: "d2" }, { raw: "Physics", resolved: "d3" }];
    const ranked = rankAll("computer science", cands);
    expect(ranked[0].resolved).toBe("d1");
    expect(ranked[0].score).toBe(1);
    expect(ranked[0].score - (ranked[1]?.score ?? 0)).toBeGreaterThan(AMBIGUITY_MARGIN); // → resolve, no clarify
  });
  it("bigram similarity underpins fuzzy matching", () => {
    expect(bigramSimilarity("mba hr", "mba finance")).toBeGreaterThan(0);
  });
});
