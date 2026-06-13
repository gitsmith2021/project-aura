import { describe, it, expect } from "vitest";
import {
  computeCIA, CIA_AT_RISK_THRESHOLD,
  type EngineComponent, type EngineStudent, type EngineMark,
} from "@/lib/ciaEngine";

const student: EngineStudent = { id: "s1", full_name: "Asha", roll_number: "R1" };

describe("computeCIA — weighted mode", () => {
  it("normalizes weightages (need not sum to 100) and reaches 100% on full marks", () => {
    const components: EngineComponent[] = [
      { id: "c1", name: "Test 1", max_marks: 50, weightage: 1 },
      { id: "c2", name: "Test 2", max_marks: 50, weightage: 1 },
    ];
    const marks: EngineMark[] = [
      { student_id: "s1", component_id: "c1", marks_scored: 50 },
      { student_id: "s1", component_id: "c2", marks_scored: 50 },
    ];
    const out = computeCIA(components, [student], marks);
    expect(out.mode).toBe("weighted");
    expect(out.mixed_weightage).toBe(false);
    const r = out.results[0];
    expect(r.final_percentage).toBe(100);
    expect(r.components.map((c) => c.weight_pct)).toEqual([50, 50]);
    expect(r.at_risk).toBe(false);
  });

  it("weights an unequal split correctly (75/25)", () => {
    const components: EngineComponent[] = [
      { id: "c1", name: "Major", max_marks: 10, weightage: 3 },
      { id: "c2", name: "Minor", max_marks: 10, weightage: 1 },
    ];
    const marks: EngineMark[] = [
      { student_id: "s1", component_id: "c1", marks_scored: 10 },
      { student_id: "s1", component_id: "c2", marks_scored: 0 },
    ];
    const r = computeCIA(components, [student], marks).results[0];
    expect(r.final_percentage).toBe(75);
    expect(r.missing_count).toBe(0);
  });
});

describe("computeCIA — raw mode & fallbacks", () => {
  it("falls back to Σscored/Σmax when no component carries a weightage", () => {
    const components: EngineComponent[] = [
      { id: "c1", name: "A", max_marks: 20, weightage: null },
      { id: "c2", name: "B", max_marks: 30, weightage: 0 },
    ];
    const marks: EngineMark[] = [
      { student_id: "s1", component_id: "c1", marks_scored: 10 },
      { student_id: "s1", component_id: "c2", marks_scored: 15 },
    ];
    const out = computeCIA(components, [student], marks);
    expect(out.mode).toBe("raw");
    expect(out.mixed_weightage).toBe(false);
    expect(out.results[0].final_percentage).toBe(50); // 25 / 50
  });

  it("flags mixed_weightage when only some components are weighted", () => {
    const components: EngineComponent[] = [
      { id: "c1", name: "A", max_marks: 10, weightage: 2 },
      { id: "c2", name: "B", max_marks: 10, weightage: null },
    ];
    const out = computeCIA(components, [student], [
      { student_id: "s1", component_id: "c1", marks_scored: 10 },
      { student_id: "s1", component_id: "c2", marks_scored: 10 },
    ]);
    expect(out.mode).toBe("raw");
    expect(out.mixed_weightage).toBe(true);
    expect(out.results[0].final_percentage).toBe(100);
  });
});

describe("computeCIA — edge handling", () => {
  it("counts a missing mark as 0 but reports it in missing_count", () => {
    const components: EngineComponent[] = [
      { id: "c1", name: "A", max_marks: 50, weightage: null },
      { id: "c2", name: "B", max_marks: 50, weightage: null },
    ];
    const r = computeCIA(components, [student], [
      { student_id: "s1", component_id: "c1", marks_scored: 50 },
    ]).results[0];
    expect(r.missing_count).toBe(1);
    expect(r.final_percentage).toBe(50); // 50 / 100, missing c2 = 0
  });

  it("clamps over-entered marks to the component max", () => {
    const components: EngineComponent[] = [{ id: "c1", name: "A", max_marks: 50, weightage: null }];
    const r = computeCIA(components, [student], [
      { student_id: "s1", component_id: "c1", marks_scored: 60 },
    ]).results[0];
    expect(r.final_percentage).toBe(100); // clamped to 50/50
  });

  it("marks a student at risk below the 40% threshold", () => {
    const components: EngineComponent[] = [{ id: "c1", name: "A", max_marks: 50, weightage: null }];
    const r = computeCIA(components, [student], [
      { student_id: "s1", component_id: "c1", marks_scored: 10 },
    ]).results[0];
    expect(r.final_percentage).toBe(20);
    expect(r.final_percentage).toBeLessThan(CIA_AT_RISK_THRESHOLD);
    expect(r.at_risk).toBe(true);
  });
});
