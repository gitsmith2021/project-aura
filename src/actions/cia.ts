"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAuditBatch } from "@/lib/auditLog";
import { computeCIA, type CIAComputation, type ComputationMode } from "@/lib/ciaEngine";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CIAComponent = {
  id: string;
  institution_id: string;
  department_id: string | null;
  subject_id: string | null;
  academic_year_id: string | null;
  name: string;
  component_type: "unit_test" | "assignment" | "lab_record" | "seminar" | "attendance_marks" | "viva" | "other";
  max_marks: number;
  semester: number;
  weightage: number | null;
  created_at: string;
  departments?: { name: string } | null;
  subjects?: { name: string; code: string | null } | null;
  academic_years?: { label: string } | null;
};

export type CIAMark = {
  id: string;
  institution_id: string;
  student_id: string;
  cia_component_id: string;
  subject_id: string | null;
  marks_scored: number;
  entered_by: string | null;
  created_at: string;
  students?: { full_name: string; roll_number: string | null } | null;
};

export type BulkCIAMarkInput = {
  institution_id: string;
  cia_component_id: string;
  subject_id: string | null;
  rows: { student_id: string; marks_scored: number }[];
};

export type CIAStudentSummary = {
  student_id: string;
  full_name: string;
  roll_number: string | null;
  components: { component_id: string; name: string; max_marks: number; marks_scored: number | null }[];
  total_scored: number;
  total_max: number;
  percentage: number;
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getCIAComponents(
  institutionId: string,
  filters?: { departmentId?: string; semester?: number; academicYearId?: string }
): Promise<{ success: true; data: CIAComponent[] } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let q = supabase
      .from("cia_components")
      .select("*, departments(name), subjects(name, code), academic_years(label)")
      .eq("institution_id", institutionId)
      .order("semester")
      .order("created_at");

    if (filters?.departmentId) q = q.eq("department_id", filters.departmentId);
    if (filters?.semester)     q = q.eq("semester", filters.semester);
    if (filters?.academicYearId) q = q.eq("academic_year_id", filters.academicYearId);

    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as CIAComponent[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createCIAComponent(payload: {
  institution_id: string;
  department_id: string | null;
  subject_id: string | null;
  academic_year_id: string | null;
  name: string;
  component_type: CIAComponent["component_type"];
  max_marks: number;
  semester: number;
  weightage?: number;
}): Promise<{ success: true; data: CIAComponent } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from("cia_components")
      .insert(payload)
      .select("*, departments(name), subjects(name, code), academic_years(label)")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${payload.institution_id}/cia`);
    return { success: true, data: data as CIAComponent };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateCIAComponent(
  id: string,
  institutionId: string,
  payload: Partial<Omit<CIAComponent, "id" | "institution_id" | "created_at" | "departments" | "subjects" | "academic_years">>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.from("cia_components").update(payload).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/cia`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteCIAComponent(
  id: string,
  institutionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.from("cia_components").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/cia`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getCIAMarks(
  componentId: string
): Promise<{ success: true; data: CIAMark[] } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from("cia_marks")
      .select("*, students(full_name, roll_number)")
      .eq("cia_component_id", componentId)
      .order("created_at");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as CIAMark[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function bulkSaveCIAMarks(
  input: BulkCIAMarkInput
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    const rows = input.rows.map(r => ({
      institution_id:   input.institution_id,
      cia_component_id: input.cia_component_id,
      subject_id:       input.subject_id,
      student_id:       r.student_id,
      marks_scored:     r.marks_scored,
      entered_by:       user?.id ?? null,
    }));

    // Snapshot existing marks so the audit trail captures before → after
    const { data: beforeRows } = await supabase
      .from("cia_marks")
      .select("id, student_id, marks_scored")
      .eq("cia_component_id", input.cia_component_id)
      .in("student_id", rows.map(r => r.student_id));
    const beforeByStudent = new Map((beforeRows ?? []).map(r => [r.student_id as string, r]));

    const { data: saved, error } = await supabase
      .from("cia_marks")
      .upsert(rows, { onConflict: "student_id,cia_component_id" })
      .select("id, student_id, marks_scored");

    if (error) return { success: false, error: error.message };

    await logAuditBatch(
      (saved ?? []).map(after => {
        const before = beforeByStudent.get(after.student_id as string);
        return {
          institutionId: input.institution_id,
          performedBy: user?.id ?? null,
          tableName: "cia_marks",
          recordId: after.id as string,
          action: before ? ("UPDATE" as const) : ("INSERT" as const),
          beforeData: before ?? null,
          afterData: after,
          notes: "CIA marks entry",
        };
      })
    );

    revalidatePath(`/institutions/${input.institution_id}/cia`);
    return { success: true, count: rows.length };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getCIAStudentSummary(
  institutionId: string,
  filters: { departmentId: string; semester: number; academicYearId?: string }
): Promise<{ success: true; data: CIAStudentSummary[] } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Fetch components for this dept/semester
    let cq = supabase
      .from("cia_components")
      .select("id, name, max_marks")
      .eq("institution_id", institutionId)
      .eq("department_id", filters.departmentId)
      .eq("semester", filters.semester);
    if (filters.academicYearId) cq = cq.eq("academic_year_id", filters.academicYearId);
    const { data: components, error: ce } = await cq;
    if (ce) return { success: false, error: ce.message };
    if (!components?.length) return { success: true, data: [] };

    const componentIds = components.map(c => c.id);

    // Fetch students in dept
    const { data: students, error: se } = await supabase
      .from("students")
      .select("id, full_name, roll_number")
      .eq("institution_id", institutionId)
      .eq("department_id", filters.departmentId)
      .order("full_name");
    if (se) return { success: false, error: se.message };
    if (!students?.length) return { success: true, data: [] };

    // Fetch all marks for these components
    const { data: marks, error: me } = await supabase
      .from("cia_marks")
      .select("student_id, cia_component_id, marks_scored")
      .in("cia_component_id", componentIds);
    if (me) return { success: false, error: me.message };

    const marksMap = new Map<string, number>();
    (marks ?? []).forEach(m => marksMap.set(`${m.student_id}::${m.cia_component_id}`, m.marks_scored));

    const summaries: CIAStudentSummary[] = (students ?? []).map(s => {
      const comps = components.map(c => ({
        component_id: c.id,
        name: c.name,
        max_marks: c.max_marks,
        marks_scored: marksMap.get(`${s.id}::${c.id}`) ?? null,
      }));
      const scored = comps.reduce((acc, c) => acc + (c.marks_scored ?? 0), 0);
      const max    = comps.reduce((acc, c) => acc + c.max_marks, 0);
      return {
        student_id:  s.id,
        full_name:   s.full_name,
        roll_number: s.roll_number,
        components:  comps,
        total_scored: scored,
        total_max:    max,
        percentage:   max > 0 ? Math.round((scored / max) * 100) : 0,
      };
    });

    return { success: true, data: summaries };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// For staff portal — CIA components for subjects the signed-in staff teaches.
// Pairs with the "cia_marks: staff manage own teaching subjects" RLS policy so
// subject teachers enter their own marks instead of handing them to the HOD.
export async function getMyTeachingCIAComponents(): Promise<
  | { success: true; data: CIAComponent[] }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };

    const { data: staff, error: staffErr } = await supabase
      .from("staff")
      .select("id, institution_id")
      .eq("email", user.email)
      .eq("is_active", true)
      .maybeSingle();
    if (staffErr) return { success: false, error: staffErr.message };
    if (!staff) return { success: false, error: "No staff profile found for this account." };

    const { data: assigns, error: aErr } = await supabase
      .from("teaching_assignments")
      .select("subject_id")
      .eq("staff_id", staff.id);
    if (aErr) return { success: false, error: aErr.message };

    const subjectIds = [...new Set((assigns ?? []).map((a) => a.subject_id).filter((v): v is string => !!v))];
    if (subjectIds.length === 0) return { success: true, data: [] };

    const { data, error } = await supabase
      .from("cia_components")
      .select("*, departments(name), subjects(name, code), academic_years(label)")
      .eq("institution_id", staff.institution_id)
      .in("subject_id", subjectIds)
      .order("semester")
      .order("created_at");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as CIAComponent[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// For student portal — personal CIA marks
export async function getStudentCIAMarks(
  studentId: string,
  institutionId: string
): Promise<{ success: true; data: { component: CIAComponent; marks_scored: number | null }[] } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: components, error: ce } = await supabase
      .from("cia_components")
      .select("*, departments(name), subjects(name, code), academic_years(label)")
      .eq("institution_id", institutionId)
      .order("semester").order("created_at");
    if (ce) return { success: false, error: ce.message };

    const { data: marks, error: me } = await supabase
      .from("cia_marks")
      .select("cia_component_id, marks_scored")
      .eq("student_id", studentId);
    if (me) return { success: false, error: me.message };

    const marksMap = new Map((marks ?? []).map(m => [m.cia_component_id, m.marks_scored]));

    return {
      success: true,
      data: (components ?? []).map(c => ({
        component: c as CIAComponent,
        marks_scored: marksMap.get(c.id) ?? null,
      })),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4A — CIA Assessment Engine: finalized results (compute → publish)
// Calculation lives in src/lib/ciaEngine.ts; these actions feed it data and
// persist its output to cia_results (draft → published).
// ─────────────────────────────────────────────────────────────────────────────

export type CIAResultRow = {
  id: string;
  student_id: string;
  full_name: string;
  roll_number: string | null;
  final_percentage: number;
  computation_mode: ComputationMode;
  missing_count: number;
  status: "draft" | "published";
  published_at: string | null;
  components_snapshot: unknown;
};

export type CIAResultScope = {
  institutionId: string;
  departmentId: string;
  semester: number;
  academicYearId?: string;
};

/**
 * Runs the engine over the scope's components + marks and upserts one DRAFT
 * cia_results row per student. Published rows in the same scope are reset to
 * draft (a recompute invalidates the previous publication — staff must review
 * and publish again). Returns the full computation for immediate preview.
 */
export async function computeCIAResults(scope: CIAResultScope): Promise<
  | { success: true; data: CIAComputation & { savedCount: number } }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    // Same component scope as the Phase 2E report tab (dept + semester [+ year])
    let cq = supabase
      .from("cia_components")
      .select("id, name, max_marks, weightage")
      .eq("institution_id", scope.institutionId)
      .eq("department_id", scope.departmentId)
      .eq("semester", scope.semester);
    if (scope.academicYearId) cq = cq.eq("academic_year_id", scope.academicYearId);
    const { data: components, error: ce } = await cq;
    if (ce) return { success: false, error: ce.message };
    if (!components?.length) {
      return { success: false, error: "No CIA components defined for this department/semester yet." };
    }

    const { data: students, error: se } = await supabase
      .from("students")
      .select("id, full_name, roll_number")
      .eq("institution_id", scope.institutionId)
      .eq("department_id", scope.departmentId)
      .order("roll_number", { ascending: true, nullsFirst: false });
    if (se) return { success: false, error: se.message };
    if (!students?.length) return { success: false, error: "No students found in this department." };

    const { data: marks, error: me } = await supabase
      .from("cia_marks")
      .select("student_id, cia_component_id, marks_scored")
      .in("cia_component_id", components.map((c) => c.id))
      .range(0, 49_999); // lift the 1000-row default cap
    if (me) return { success: false, error: me.message };

    const computation = computeCIA(
      components,
      students,
      (marks ?? []).map((m) => ({
        student_id: m.student_id,
        component_id: m.cia_component_id,
        marks_scored: Number(m.marks_scored),
      }))
    );

    const rows = computation.results.map((r) => ({
      institution_id: scope.institutionId,
      student_id: r.student_id,
      department_id: scope.departmentId,
      academic_year_id: scope.academicYearId ?? null,
      semester: scope.semester,
      final_percentage: r.final_percentage,
      computation_mode: computation.mode,
      components_snapshot: r.components,
      missing_count: r.missing_count,
      status: "draft" as const,
      computed_by: user?.id ?? null,
      published_by: null,
      published_at: null,
      updated_at: new Date().toISOString(),
    }));

    const { data: saved, error: ue } = await supabase
      .from("cia_results")
      .upsert(rows, { onConflict: "institution_id,student_id,department_id,semester,academic_year_id" })
      .select("id, student_id");
    if (ue) return { success: false, error: ue.message };

    // Dev Rule 13 — assessment outputs are high-stakes records
    await logAuditBatch(
      (saved ?? []).map((row) => ({
        institutionId: scope.institutionId,
        performedBy: user?.id ?? null,
        tableName: "cia_results",
        recordId: row.id as string,
        action: "INSERT" as const,
        beforeData: null,
        afterData: rows.find((r) => r.student_id === row.student_id) ?? null,
        notes: `CIA results computed (${computation.mode}, sem ${scope.semester})`,
      }))
    );

    revalidatePath(`/institutions/${scope.institutionId}/cia`);
    return { success: true, data: { ...computation, savedCount: saved?.length ?? 0 } };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Flips every draft row in the scope to published. Students see them from this moment. */
export async function publishCIAResults(scope: CIAResultScope): Promise<
  | { success: true; publishedCount: number }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    let dq = supabase
      .from("cia_results")
      .select("id, student_id, final_percentage, status")
      .eq("institution_id", scope.institutionId)
      .eq("department_id", scope.departmentId)
      .eq("semester", scope.semester)
      .eq("status", "draft");
    dq = scope.academicYearId ? dq.eq("academic_year_id", scope.academicYearId) : dq.is("academic_year_id", null);
    const { data: drafts, error: de } = await dq;
    if (de) return { success: false, error: de.message };
    if (!drafts?.length) return { success: false, error: "Nothing to publish — compute results first." };

    const publishedAt = new Date().toISOString();
    let uq = supabase
      .from("cia_results")
      .update({ status: "published", published_by: user?.id ?? null, published_at: publishedAt, updated_at: publishedAt })
      .eq("institution_id", scope.institutionId)
      .eq("department_id", scope.departmentId)
      .eq("semester", scope.semester)
      .eq("status", "draft");
    uq = scope.academicYearId ? uq.eq("academic_year_id", scope.academicYearId) : uq.is("academic_year_id", null);
    const { error: pe } = await uq;
    if (pe) return { success: false, error: pe.message };

    await logAuditBatch(
      drafts.map((d) => ({
        institutionId: scope.institutionId,
        performedBy: user?.id ?? null,
        tableName: "cia_results",
        recordId: d.id as string,
        action: "UPDATE" as const,
        beforeData: { status: "draft", final_percentage: d.final_percentage },
        afterData: { status: "published", final_percentage: d.final_percentage, published_at: publishedAt },
        notes: `CIA results published (sem ${scope.semester})`,
      }))
    );

    revalidatePath(`/institutions/${scope.institutionId}/cia`);
    revalidatePath("/student-portal/cia");
    return { success: true, publishedCount: drafts.length };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Saved results for the scope (drafts + published) — admin/HOD view. */
export async function getCIAResults(scope: CIAResultScope): Promise<
  | { success: true; data: CIAResultRow[] }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let q = supabase
      .from("cia_results")
      .select("id, student_id, final_percentage, computation_mode, missing_count, status, published_at, components_snapshot, students(full_name, roll_number)")
      .eq("institution_id", scope.institutionId)
      .eq("department_id", scope.departmentId)
      .eq("semester", scope.semester)
      .order("final_percentage", { ascending: false });
    q = scope.academicYearId ? q.eq("academic_year_id", scope.academicYearId) : q.is("academic_year_id", null);
    const { data, error } = await q;
    if (error) return { success: false, error: error.message };

    type Row = {
      id: string; student_id: string; final_percentage: number;
      computation_mode: ComputationMode; missing_count: number;
      status: "draft" | "published"; published_at: string | null;
      components_snapshot: unknown;
      students: { full_name: string; roll_number: string | null } | null;
    };
    return {
      success: true,
      data: ((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        student_id: r.student_id,
        full_name: r.students?.full_name ?? "—",
        roll_number: r.students?.roll_number ?? null,
        final_percentage: Number(r.final_percentage),
        computation_mode: r.computation_mode,
        missing_count: r.missing_count,
        status: r.status,
        published_at: r.published_at,
        components_snapshot: r.components_snapshot,
      })),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/** Published CIA results for one student (student portal). RLS enforces published-only too. */
export async function getStudentCIAResults(
  studentId: string,
  institutionId: string
): Promise<
  | { success: true; data: { semester: number; final_percentage: number; computation_mode: ComputationMode; published_at: string | null; academic_year: string | null }[] }
  | { success: false; error: string }
> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("cia_results")
      .select("semester, final_percentage, computation_mode, published_at, academic_years(label)")
      .eq("institution_id", institutionId)
      .eq("student_id", studentId)
      .eq("status", "published")
      .order("semester");
    if (error) return { success: false, error: error.message };

    type Row = {
      semester: number; final_percentage: number; computation_mode: ComputationMode;
      published_at: string | null; academic_years: { label: string } | null;
    };
    return {
      success: true,
      data: ((data ?? []) as unknown as Row[]).map((r) => ({
        semester: r.semester,
        final_percentage: Number(r.final_percentage),
        computation_mode: r.computation_mode,
        published_at: r.published_at,
        academic_year: r.academic_years?.label ?? null,
      })),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
