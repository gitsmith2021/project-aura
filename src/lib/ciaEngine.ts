// Phase 4A — CIA assessment calculation engine.
//
// Pure functions only: no Supabase, no React. The server action feeds it rows
// and persists what it returns, which keeps the weighting policy in exactly
// one place and makes it unit-testable the moment Vitest lands (Arch A2).
//
// Weighting policy
// ────────────────
// "weighted" — every component in scope carries a weightage > 0. Each
//   component contributes (weightage / Σweightages) × (scored / max_marks).
//   Weightages therefore do NOT need to sum to 100 — they are normalized.
// "raw"      — any component lacks a weightage (NULL or 0). Falls back to
//   Σscored / Σmax_marks, the original Phase 2E behavior, and flags
//   mixed_weightage when only *some* components carried weightages so the
//   UI can prompt staff to finish the setup.
// A missing mark counts as 0 toward the final percentage (the student simply
// hasn't earned it) but is reported in missing_count so staff can chase
// un-entered marks before publishing.

export type EngineComponent = {
  id: string;
  name: string;
  max_marks: number;
  weightage: number | null;
};

export type EngineStudent = {
  id: string;
  full_name: string;
  roll_number: string | null;
};

export type EngineMark = {
  student_id: string;
  component_id: string;
  marks_scored: number;
};

export type ComputationMode = "weighted" | "raw";

export type ComponentBreakdown = {
  component_id: string;
  name: string;
  max_marks: number;
  marks_scored: number | null;
  /** Normalized weight share (0–100) in weighted mode; null in raw mode. */
  weight_pct: number | null;
  /** Points this component contributed to the final percentage (0–100 scale). */
  contribution_pct: number;
};

export type StudentCIAResult = {
  student_id: string;
  full_name: string;
  roll_number: string | null;
  /** Final CIA percentage, 0–100, one decimal. */
  final_percentage: number;
  components: ComponentBreakdown[];
  missing_count: number;
  /** Below the 40% internal threshold — surface before publishing. */
  at_risk: boolean;
};

export type CIAComputation = {
  mode: ComputationMode;
  /** True when some (but not all) components carry a weightage — raw fallback applied. */
  mixed_weightage: boolean;
  results: StudentCIAResult[];
};

export const CIA_AT_RISK_THRESHOLD = 40;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeCIA(
  components: EngineComponent[],
  students: EngineStudent[],
  marks: EngineMark[]
): CIAComputation {
  const usable = components.filter((c) => c.max_marks > 0);
  const weighted = usable.length > 0 && usable.every((c) => (c.weightage ?? 0) > 0);
  const someWeighted = usable.some((c) => (c.weightage ?? 0) > 0);
  const weightSum = weighted ? usable.reduce((sum, c) => sum + (c.weightage as number), 0) : 0;

  const markIndex = new Map<string, number>();
  for (const m of marks) markIndex.set(`${m.student_id}::${m.component_id}`, m.marks_scored);

  const totalMax = usable.reduce((sum, c) => sum + c.max_marks, 0);

  const results: StudentCIAResult[] = students.map((s) => {
    let missing = 0;
    let rawScored = 0;
    let weightedPct = 0;

    const breakdown: ComponentBreakdown[] = usable.map((c) => {
      const scored = markIndex.get(`${s.id}::${c.id}`) ?? null;
      if (scored == null) missing += 1;
      const effective = Math.min(scored ?? 0, c.max_marks); // clamp over-entry defensively
      rawScored += effective;

      let weightPct: number | null = null;
      let contribution: number;
      if (weighted) {
        weightPct = round1(((c.weightage as number) / weightSum) * 100);
        contribution = ((c.weightage as number) / weightSum) * (effective / c.max_marks) * 100;
        weightedPct += contribution;
      } else {
        contribution = totalMax > 0 ? (effective / totalMax) * 100 : 0;
      }

      return {
        component_id: c.id,
        name: c.name,
        max_marks: c.max_marks,
        marks_scored: scored,
        weight_pct: weightPct,
        contribution_pct: round1(contribution),
      };
    });

    const finalPct = round1(
      weighted ? weightedPct : totalMax > 0 ? (rawScored / totalMax) * 100 : 0
    );

    return {
      student_id: s.id,
      full_name: s.full_name,
      roll_number: s.roll_number,
      final_percentage: finalPct,
      components: breakdown,
      missing_count: missing,
      at_risk: finalPct < CIA_AT_RISK_THRESHOLD,
    };
  });

  return {
    mode: weighted ? "weighted" : "raw",
    mixed_weightage: !weighted && someWeighted,
    results,
  };
}
