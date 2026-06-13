"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  computeCOAttainment, computePOAttainment,
  type COAttainment, type POAttainment,
} from "@/lib/coPoEngine";

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4A (continued) — CO/PO outcome mapping & attainment (OBE / NBA / NAAC).
// Definitions (COs, POs, matrix, component tags) are managed here; the math
// lives in src/lib/coPoEngine.ts. RLS restricts mutation to admin/HOD.
// ─────────────────────────────────────────────────────────────────────────────

export type CourseOutcome = {
  id: string;
  subject_id: string;
  code: string;
  description: string;
  display_order: number;
};

export type ProgramOutcome = {
  id: string;
  department_id: string | null;
  code: string;
  description: string;
  display_order: number;
};

export type COPOCell = {
  course_outcome_id: string;
  program_outcome_id: string;
  correlation: number; // 1..3
};

type Ok<T> = { success: true; data: T };
type Err = { success: false; error: string };

async function client() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

// ── Course Outcomes ───────────────────────────────────────────────────────────

export async function getCourseOutcomes(institutionId: string, subjectId: string): Promise<Ok<CourseOutcome[]> | Err> {
  try {
    const supabase = await client();
    const { data, error } = await supabase
      .from("course_outcomes")
      .select("id, subject_id, code, description, display_order")
      .eq("institution_id", institutionId)
      .eq("subject_id", subjectId)
      .order("display_order")
      .order("code");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as CourseOutcome[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveCourseOutcome(payload: {
  id?: string;
  institutionId: string;
  subjectId: string;
  code: string;
  description: string;
  displayOrder?: number;
}): Promise<Ok<CourseOutcome> | Err> {
  try {
    const supabase = await client();
    const row = {
      institution_id: payload.institutionId,
      subject_id: payload.subjectId,
      code: payload.code.trim(),
      description: payload.description.trim(),
      display_order: payload.displayOrder ?? (Number(payload.code.replace(/\D/g, "")) || 1),
    };
    const q = payload.id
      ? supabase.from("course_outcomes").update(row).eq("id", payload.id).select().single()
      : supabase.from("course_outcomes").insert(row).select().single();
    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${payload.institutionId}/cia/outcomes`);
    return { success: true, data: data as CourseOutcome };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteCourseOutcome(institutionId: string, id: string): Promise<Ok<null> | Err> {
  try {
    const supabase = await client();
    const { error } = await supabase.from("course_outcomes").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/cia/outcomes`);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Program Outcomes ──────────────────────────────────────────────────────────

/** Department POs plus institution-wide POs (department_id NULL). */
export async function getProgramOutcomes(institutionId: string, departmentId: string): Promise<Ok<ProgramOutcome[]> | Err> {
  try {
    const supabase = await client();
    const { data, error } = await supabase
      .from("program_outcomes")
      .select("id, department_id, code, description, display_order")
      .eq("institution_id", institutionId)
      .or(`department_id.eq.${departmentId},department_id.is.null`)
      .order("display_order")
      .order("code");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as ProgramOutcome[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveProgramOutcome(payload: {
  id?: string;
  institutionId: string;
  departmentId: string | null; // null = institution-wide
  code: string;
  description: string;
  displayOrder?: number;
}): Promise<Ok<ProgramOutcome> | Err> {
  try {
    const supabase = await client();
    const row = {
      institution_id: payload.institutionId,
      department_id: payload.departmentId,
      code: payload.code.trim(),
      description: payload.description.trim(),
      display_order: payload.displayOrder ?? (Number(payload.code.replace(/\D/g, "")) || 1),
    };
    const q = payload.id
      ? supabase.from("program_outcomes").update(row).eq("id", payload.id).select().single()
      : supabase.from("program_outcomes").insert(row).select().single();
    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${payload.institutionId}/cia/outcomes`);
    return { success: true, data: data as ProgramOutcome };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteProgramOutcome(institutionId: string, id: string): Promise<Ok<null> | Err> {
  try {
    const supabase = await client();
    const { error } = await supabase.from("program_outcomes").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/cia/outcomes`);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── CO–PO matrix ──────────────────────────────────────────────────────────────

export async function getCOPOMatrix(institutionId: string, subjectId: string): Promise<Ok<COPOCell[]> | Err> {
  try {
    const supabase = await client();
    const { data, error } = await supabase
      .from("co_po_map")
      .select("course_outcome_id, program_outcome_id, correlation, course_outcomes!inner(subject_id)")
      .eq("institution_id", institutionId)
      .eq("course_outcomes.subject_id", subjectId);
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((r) => ({
        course_outcome_id: r.course_outcome_id,
        program_outcome_id: r.program_outcome_id,
        correlation: r.correlation,
      })),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** correlation 0 deletes the cell; 1–3 upserts it. */
export async function setCOPOCorrelation(payload: {
  institutionId: string;
  courseOutcomeId: string;
  programOutcomeId: string;
  correlation: number;
}): Promise<Ok<null> | Err> {
  try {
    const supabase = await client();
    if (payload.correlation < 1) {
      const { error } = await supabase
        .from("co_po_map")
        .delete()
        .eq("course_outcome_id", payload.courseOutcomeId)
        .eq("program_outcome_id", payload.programOutcomeId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("co_po_map").upsert(
        {
          institution_id: payload.institutionId,
          course_outcome_id: payload.courseOutcomeId,
          program_outcome_id: payload.programOutcomeId,
          correlation: Math.min(3, Math.round(payload.correlation)),
        },
        { onConflict: "course_outcome_id,program_outcome_id" }
      );
      if (error) return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${payload.institutionId}/cia/outcomes`);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Component → CO tagging ────────────────────────────────────────────────────

export async function getComponentTags(institutionId: string, subjectId: string): Promise<
  Ok<{ cia_component_id: string; course_outcome_id: string }[]> | Err
> {
  try {
    const supabase = await client();
    const { data, error } = await supabase
      .from("cia_component_outcomes")
      .select("cia_component_id, course_outcome_id, course_outcomes!inner(subject_id)")
      .eq("institution_id", institutionId)
      .eq("course_outcomes.subject_id", subjectId);
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((r) => ({
        cia_component_id: r.cia_component_id,
        course_outcome_id: r.course_outcome_id,
      })),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function toggleComponentTag(payload: {
  institutionId: string;
  ciaComponentId: string;
  courseOutcomeId: string;
  tagged: boolean;
}): Promise<Ok<null> | Err> {
  try {
    const supabase = await client();
    if (payload.tagged) {
      const { error } = await supabase.from("cia_component_outcomes").upsert(
        {
          institution_id: payload.institutionId,
          cia_component_id: payload.ciaComponentId,
          course_outcome_id: payload.courseOutcomeId,
        },
        { onConflict: "cia_component_id,course_outcome_id" }
      );
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from("cia_component_outcomes")
        .delete()
        .eq("cia_component_id", payload.ciaComponentId)
        .eq("course_outcome_id", payload.courseOutcomeId);
      if (error) return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${payload.institutionId}/cia/outcomes`);
    return { success: true, data: null };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Attainment report ─────────────────────────────────────────────────────────

export type AttainmentReport = {
  cos: COAttainment[];
  pos: POAttainment[];
  /** Components of this subject that aren't tagged to any CO — coverage gap. */
  untagged_components: { id: string; name: string }[];
};

export async function getAttainmentReport(
  institutionId: string,
  departmentId: string,
  subjectId: string
): Promise<Ok<AttainmentReport> | Err> {
  try {
    const supabase = await client();

    const [cosRes, posRes, tagsRes, matrixRes, componentsRes] = await Promise.all([
      getCourseOutcomes(institutionId, subjectId),
      getProgramOutcomes(institutionId, departmentId),
      getComponentTags(institutionId, subjectId),
      getCOPOMatrix(institutionId, subjectId),
      supabase
        .from("cia_components")
        .select("id, name, max_marks")
        .eq("institution_id", institutionId)
        .eq("subject_id", subjectId),
    ]);

    if (!cosRes.success) return cosRes;
    if (!posRes.success) return posRes;
    if (!tagsRes.success) return tagsRes;
    if (!matrixRes.success) return matrixRes;
    if (componentsRes.error) return { success: false, error: componentsRes.error.message };

    const subjectComponents = componentsRes.data ?? [];
    const taggedComponentIds = new Set(tagsRes.data.map((t) => t.cia_component_id));

    // The engine must see every TAGGED component — staff may legitimately tag a
    // department-general component (subject_id NULL) to this subject's COs, so
    // the attainment set is driven by the tags, not by components.subject_id.
    const { data: taggedComponents, error: tce } = await supabase
      .from("cia_components")
      .select("id, name, max_marks")
      .in("id", taggedComponentIds.size ? [...taggedComponentIds] : ["00000000-0000-0000-0000-000000000000"]);
    if (tce) return { success: false, error: tce.message };
    const engineComponents = taggedComponents ?? [];

    const { data: marks, error: me } = await supabase
      .from("cia_marks")
      .select("student_id, cia_component_id, marks_scored")
      .in("cia_component_id", engineComponents.length ? engineComponents.map((c) => c.id) : ["00000000-0000-0000-0000-000000000000"])
      .range(0, 49_999);
    if (me) return { success: false, error: me.message };

    const cos = computeCOAttainment(
      cosRes.data.map((c) => ({ id: c.id, code: c.code, description: c.description })),
      tagsRes.data,
      engineComponents.map((c) => ({ id: c.id, max_marks: c.max_marks })),
      (marks ?? []).map((m) => ({
        student_id: m.student_id,
        component_id: m.cia_component_id,
        marks_scored: Number(m.marks_scored),
      }))
    );

    const pos = computePOAttainment(
      posRes.data.map((p) => ({ id: p.id, code: p.code, description: p.description, department_id: p.department_id })),
      cos,
      matrixRes.data
    );

    return {
      success: true,
      data: {
        cos,
        pos,
        untagged_components: subjectComponents
          .filter((c) => !taggedComponentIds.has(c.id))
          .map((c) => ({ id: c.id, name: c.name })),
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
