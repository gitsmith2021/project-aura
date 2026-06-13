"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type ExamType = "internal" | "semester" | "arrear" | "supplementary";

export type ExamSchedule = {
  id: string;
  institution_id: string;
  department_id: string | null;
  subject_name: string;
  exam_type: ExamType;
  exam_date: string;
  start_time: string;
  end_time: string;
  hall_name: string | null;
  max_marks: number;
  pass_marks: number;
  academic_year_id: string | null;
  semester: number;
  created_at: string;
  departments?: { name: string } | null;
  academic_years?: { label: string } | null;
};

export type ExamFormData = {
  institution_id: string;
  department_id: string | null;
  subject_name: string;
  exam_type: ExamType;
  exam_date: string;
  start_time: string;
  end_time: string;
  hall_name?: string | null;
  max_marks: number;
  pass_marks: number;
  academic_year_id: string | null;
  semester: number;
};

export async function getExamsByInstitution(
  institutionId: string,
  filters?: { departmentId?: string; examType?: string; semester?: number }
) {
  const supabase = createClient(await cookies());
  let query = supabase
    .from("exam_schedules")
    .select("*, departments(name), academic_years(label)")
    .eq("institution_id", institutionId)
    .order("exam_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (filters?.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters?.examType)     query = query.eq("exam_type", filters.examType);
  if (filters?.semester)     query = query.eq("semester", filters.semester);

  const { data, error } = await query;
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ExamSchedule[] };
}

export async function getExamsByDepartment(institutionId: string, departmentId: string) {
  const supabase = createClient(await cookies());
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("exam_schedules")
    .select("*, departments(name), academic_years(label)")
    .eq("institution_id", institutionId)
    .eq("department_id", departmentId)
    .gte("exam_date", today)
    .order("exam_date", { ascending: true });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as ExamSchedule[] };
}

export async function addExam(formData: ExamFormData) {
  const supabase = createClient(await cookies());

  const { data: exam, error } = await supabase
    .from("exam_schedules")
    .insert(formData)
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };

  // Auto-sync: create academic_events entry so the exam appears on the calendar
  if (formData.academic_year_id) {
    await supabase.from("academic_events").insert({
      institution_id: formData.institution_id,
      academic_year_id: formData.academic_year_id,
      title: `${formData.subject_name} — ${capitalize(formData.exam_type)} Exam`,
      event_type: "exam_window",
      start_date: formData.exam_date,
      end_date: formData.exam_date,
      description: formData.hall_name ? `Hall: ${formData.hall_name}` : null,
      is_public: true,
    });
  }

  revalidatePath(`/institutions/${formData.institution_id}/exams`);
  revalidatePath(`/institutions/${formData.institution_id}/calendar`);
  return { success: true as const, data: exam };
}

export async function updateExam(
  id: string,
  formData: Partial<ExamFormData> & { institution_id: string }
) {
  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("exam_schedules")
    .update(formData)
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  revalidatePath(`/institutions/${formData.institution_id}/exams`);
  revalidatePath(`/institutions/${formData.institution_id}/calendar`);
  return { success: true as const };
}

export async function deleteExam(id: string, institutionId: string) {
  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("exam_schedules")
    .delete()
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  revalidatePath(`/institutions/${institutionId}/exams`);
  revalidatePath(`/institutions/${institutionId}/calendar`);
  return { success: true as const };
}

export async function getExamForHallTicket(examId: string) {
  const supabase = createClient(await cookies());

  const { data: exam, error } = await supabase
    .from("exam_schedules")
    .select("*, departments(name), academic_years(label), institutions(name)")
    .eq("id", examId)
    .single();

  if (error || !exam) return { success: false as const, error: error?.message ?? "Exam not found" };

  // NB: no "year" column on students (it's student_year) — selecting it made
  // PostgREST reject the whole query, so hall tickets listed zero students.
  // Fetch student_year and alias it to keep HallTicketCard's contract.
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, roll_number, student_year")
    .eq("department_id", exam.department_id)
    .order("roll_number", { ascending: true, nullsFirst: false });

  return {
    success: true as const,
    data: {
      exam,
      students: (students ?? []).map((s) => ({
        id: s.id,
        full_name: s.full_name,
        roll_number: s.roll_number,
        year: s.student_year ?? null,
      })),
    },
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
