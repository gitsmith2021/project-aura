import { describe, it, expect } from "vitest";
import {
  levelFor, computeCOAttainment, computePOAttainment,
  type CORecord, type PORecord, type ComponentTag,
  type AttainmentComponent, type AttainmentMark,
} from "@/lib/coPoEngine";

describe("levelFor — CO level cutoffs", () => {
  it("maps percentage to 0–3 at the documented cutoffs", () => {
    expect(levelFor(70)).toBe(3);
    expect(levelFor(85)).toBe(3);
    expect(levelFor(60)).toBe(2);
    expect(levelFor(69.9)).toBe(2);
    expect(levelFor(50)).toBe(1);
    expect(levelFor(49.9)).toBe(0);
    expect(levelFor(0)).toBe(0);
  });
});

describe("computeCOAttainment", () => {
  const cos: CORecord[] = [{ id: "co1", code: "CO1", description: "" }];
  const tags: ComponentTag[] = [{ cia_component_id: "k1", course_outcome_id: "co1" }];
  const components: AttainmentComponent[] = [{ id: "k1", max_marks: 10 }];

  it("counts a student as attaining the CO at ≥60% of component max", () => {
    const marks: AttainmentMark[] = [
      { student_id: "s1", component_id: "k1", marks_scored: 8 }, // 80% → attained
      { student_id: "s2", component_id: "k1", marks_scored: 5 }, // 50% → not attained
    ];
    const [co] = computeCOAttainment(cos, tags, components, marks);
    expect(co.students_assessed).toBe(2);
    expect(co.components_assessed).toBe(1);
    expect(co.attainment_pct).toBe(50); // 1 of 2 attained
    expect(co.level).toBe(1); // levelFor(50)
  });

  it("returns null attainment when no student has marks on mapped components", () => {
    const [co] = computeCOAttainment(cos, tags, components, []);
    expect(co.students_assessed).toBe(0);
    expect(co.attainment_pct).toBeNull();
    expect(co.level).toBeNull();
  });

  it("ignores components with non-positive max_marks", () => {
    const [co] = computeCOAttainment(
      cos, tags, [{ id: "k1", max_marks: 0 }],
      [{ student_id: "s1", component_id: "k1", marks_scored: 5 }],
    );
    expect(co.students_assessed).toBe(0);
    expect(co.attainment_pct).toBeNull();
  });
});

describe("computePOAttainment", () => {
  const pos: PORecord[] = [{ id: "po1", code: "PO1", description: "", department_id: null }];

  it("rolls CO levels into a correlation-weighted PO attainment (0–3)", () => {
    const coAttainments = [
      { co_id: "co1", code: "CO1", description: "", components_assessed: 1, students_assessed: 5, attainment_pct: 80, level: 3 },
      { co_id: "co2", code: "CO2", description: "", components_assessed: 1, students_assessed: 5, attainment_pct: 55, level: 1 },
    ];
    const matrix = [
      { course_outcome_id: "co1", program_outcome_id: "po1", correlation: 3 },
      { course_outcome_id: "co2", program_outcome_id: "po1", correlation: 1 },
    ];
    const [po] = computePOAttainment(pos, coAttainments, matrix);
    expect(po.contributing_cos).toBe(2);
    expect(po.attainment).toBe(2.5); // (3*3 + 1*1) / (3+1) = 10/4
  });

  it("returns null when no mapped CO has a computed level", () => {
    const coAttainments = [
      { co_id: "co1", code: "CO1", description: "", components_assessed: 0, students_assessed: 0, attainment_pct: null, level: null },
    ];
    const matrix = [{ course_outcome_id: "co1", program_outcome_id: "po1", correlation: 3 }];
    const [po] = computePOAttainment(pos, coAttainments, matrix);
    expect(po.contributing_cos).toBe(0);
    expect(po.attainment).toBeNull();
  });
});
