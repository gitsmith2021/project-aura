"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ExamResult = {
  id: string;
  institution_id: string;
  student_id: string;
  exam_schedule_id: string | null;
  subject_id: string | null;
  subject_name: string;
  marks_scored: number;
  max_marks: number;
  pass_marks: number;
  grade: string;
  is_arrear: boolean;
  academic_year_id: string | null;
  semester: number;
  entered_by: string | null;
  created_at: string;
  // Joined
  students?: { full_name: string; roll_number: string | null; department_id: string | null } | null;
  academic_years?: { label: string } | null;
};

export type BulkResultInput = {
  institution_id: string;
  academic_year_id: string | null;
  semester: number;
  subject_name: string;
  subject_id: string | null;
  exam_schedule_id: string | null;
  max_marks: number;
  pass_marks: number;
  rows: { student_id: string; marks_scored: number }[];
};


// ── Queries ───────────────────────────────────────────────────────────────────

export async function getResultsByInstitution(
  institutionId: string,
  filters?: {
    departmentId?: string;
    semester?: number;
    academicYearId?: string;
    subjectName?: string;
  }
) {
  const supabase = createClient(await cookies());

  let query = supabase
    .from("exam_results")
    .select("*, students(full_name, roll_number, department_id), academic_years(label)")
    .eq("institution_id", institutionId)
    .order("semester")
    .order("subject_name");

  if (filters?.semester)       query = query.eq("semester", filters.semester);
  if (filters?.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters?.subjectName)    query = query.eq("subject_name", filters.subjectName);

  const { data, error } = await query;
  if (error) return { success: false as const, error: error.message };

  let results = data as ExamResult[];
  if (filters?.departmentId) {
    results = results.filter(r => r.students?.department_id === filters.departmentId);
  }

  return { success: true as const, data: results };
}

export async function getStudentMarksheet(studentId: string, institutionId: string) {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("exam_results")
    .select("*, academic_years(label)")
    .eq("student_id", studentId)
    .eq("institution_id", institutionId)
    .order("semester")
    .order("subject_name");

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ExamResult[] };
}

export async function getArrearStudents(
  institutionId: string,
  filters?: { departmentId?: string; semester?: number; academicYearId?: string }
) {
  const supabase = createClient(await cookies());

  let query = supabase
    .from("exam_results")
    .select(`
      *,
      students(id, full_name, roll_number, department_id, year, departments(name)),
      academic_years(label)
    `)
    .eq("institution_id", institutionId)
    .eq("is_arrear", true)
    .order("semester");

  if (filters?.semester)       query = query.eq("semester", filters.semester);
  if (filters?.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);

  const { data, error } = await query;
  if (error) return { success: false as const, error: error.message };

  let results = data as any[];
  if (filters?.departmentId) {
    results = results.filter(r => r.students?.department_id === filters.departmentId);
  }

  return { success: true as const, data: results as ExamResult[] };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function bulkEnterResults(input: BulkResultInput) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();

  if (input.rows.length === 0) return { success: true as const, count: 0 };

  const rows = input.rows.map(r => ({
    institution_id:   input.institution_id,
    student_id:       r.student_id,
    subject_name:     input.subject_name,
    subject_id:       input.subject_id,
    exam_schedule_id: input.exam_schedule_id,
    marks_scored:     r.marks_scored,
    max_marks:        input.max_marks,
    pass_marks:       input.pass_marks,
    academic_year_id: input.academic_year_id,
    semester:         input.semester,
    entered_by:       user?.id ?? null,
  }));

  const { error } = await supabase
    .from("exam_results")
    .upsert(rows, {
      onConflict: "student_id,subject_name,semester,exam_schedule_id",
      ignoreDuplicates: false,
    });

  if (error) return { success: false as const, error: error.message };

  revalidatePath(`/institutions/${input.institution_id}/results`);
  return { success: true as const, count: rows.length };
}

export async function deleteResult(id: string, institutionId: string) {
  const supabase = createClient(await cookies());
  const { error } = await supabase.from("exam_results").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath(`/institutions/${institutionId}/results`);
  return { success: true as const };
}
