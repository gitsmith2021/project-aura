"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAuditBatch } from "@/lib/auditLog";

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
