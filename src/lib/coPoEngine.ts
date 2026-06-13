// Phase 4A (continued) — CO/PO attainment engine.
//
// Pure functions, same philosophy as ciaEngine.ts: the server action fetches
// rows, this module owns the OBE math, and the result is directly renderable.
//
// Direct attainment model (standard NBA practice, defaults documented):
//
//   1. A student "attains" a CO on a component when they score ≥ TARGET_PCT
//      (60%) of that component's max marks.
//   2. Per CO: attainment% = students who attained on ≥ half of the CO's
//      assessed components ÷ students assessed. ("Assessed" = has at least
//      one mark on a mapped component — students with no marks don't dilute.)
//   3. CO level: 3 if attainment% ≥ 70, 2 if ≥ 60, 1 if ≥ 50, else 0.
//   4. PO attainment = Σ(CO_level × correlation) / Σ(correlation) over mapped
//      COs that have a computed level — the weighted matrix rollup, 0–3 scale.
//
// Institutions tune these cutoffs in practice; they're exported constants so
// a future settings table can override them without touching the math.

export const CO_TARGET_PCT = 60;
export const CO_LEVEL_CUTOFFS = { level3: 70, level2: 60, level1: 50 } as const;

export type CORecord = {
  id: string;
  code: string;
  description: string;
};

export type PORecord = {
  id: string;
  code: string;
  description: string;
  department_id: string | null;
};

export type ComponentTag = {
  cia_component_id: string;
  course_outcome_id: string;
};

export type AttainmentComponent = {
  id: string;
  max_marks: number;
};

export type AttainmentMark = {
  student_id: string;
  component_id: string;
  marks_scored: number;
};

export type COAttainment = {
  co_id: string;
  code: string;
  description: string;
  components_assessed: number;
  students_assessed: number;
  /** % of assessed students who attained the CO (0–100, 1dp); null = no data. */
  attainment_pct: number | null;
  /** 0–3; null when attainment_pct is null. */
  level: number | null;
};

export type POAttainment = {
  po_id: string;
  code: string;
  description: string;
  /** COs of this subject mapped to the PO that had a computed level. */
  contributing_cos: number;
  /** Weighted 0–3 (1dp); null when no mapped CO has data. */
  attainment: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function levelFor(pct: number): number {
  if (pct >= CO_LEVEL_CUTOFFS.level3) return 3;
  if (pct >= CO_LEVEL_CUTOFFS.level2) return 2;
  if (pct >= CO_LEVEL_CUTOFFS.level1) return 1;
  return 0;
}

export function computeCOAttainment(
  cos: CORecord[],
  tags: ComponentTag[],
  components: AttainmentComponent[],
  marks: AttainmentMark[]
): COAttainment[] {
  const componentById = new Map(components.map((c) => [c.id, c]));
  const marksByComponent = new Map<string, AttainmentMark[]>();
  for (const m of marks) {
    const list = marksByComponent.get(m.component_id);
    if (list) list.push(m);
    else marksByComponent.set(m.component_id, [m]);
  }

  return cos.map((co) => {
    const mappedComponentIds = tags
      .filter((t) => t.course_outcome_id === co.id)
      .map((t) => t.cia_component_id)
      .filter((id) => componentById.has(id));

    // attained[student] = components where they hit target; seen[student] = components with any mark
    const attained = new Map<string, number>();
    const seen = new Map<string, number>();

    for (const componentId of mappedComponentIds) {
      const component = componentById.get(componentId)!;
      if (component.max_marks <= 0) continue;
      for (const mark of marksByComponent.get(componentId) ?? []) {
        seen.set(mark.student_id, (seen.get(mark.student_id) ?? 0) + 1);
        if ((mark.marks_scored / component.max_marks) * 100 >= CO_TARGET_PCT) {
          attained.set(mark.student_id, (attained.get(mark.student_id) ?? 0) + 1);
        }
      }
    }

    const studentsAssessed = seen.size;
    let attainedCount = 0;
    for (const [studentId, seenCount] of seen) {
      const hit = attained.get(studentId) ?? 0;
      if (hit >= Math.ceil(seenCount / 2)) attainedCount += 1; // attained on ≥ half of assessed components
    }

    const pct = studentsAssessed > 0 ? round1((attainedCount / studentsAssessed) * 100) : null;

    return {
      co_id: co.id,
      code: co.code,
      description: co.description,
      components_assessed: mappedComponentIds.length,
      students_assessed: studentsAssessed,
      attainment_pct: pct,
      level: pct == null ? null : levelFor(pct),
    };
  });
}

export function computePOAttainment(
  pos: PORecord[],
  coAttainments: COAttainment[],
  matrix: { course_outcome_id: string; program_outcome_id: string; correlation: number }[]
): POAttainment[] {
  const levelByCO = new Map(
    coAttainments.filter((c) => c.level != null).map((c) => [c.co_id, c.level as number])
  );

  return pos.map((po) => {
    let weightSum = 0;
    let weightedLevels = 0;
    let contributing = 0;
    for (const cell of matrix) {
      if (cell.program_outcome_id !== po.id) continue;
      const level = levelByCO.get(cell.course_outcome_id);
      if (level == null) continue;
      weightSum += cell.correlation;
      weightedLevels += level * cell.correlation;
      contributing += 1;
    }
    return {
      po_id: po.id,
      code: po.code,
      description: po.description,
      contributing_cos: contributing,
      attainment: weightSum > 0 ? round1(weightedLevels / weightSum) : null,
    };
  });
}
