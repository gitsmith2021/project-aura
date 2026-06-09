"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export type LessonPlan = {
  id: string;
  institution_id: string;
  staff_id: string;
  subject_id: string;
  curriculum_unit_id: string | null;
  academic_year_id: string | null;
  lesson_date: string;
  topic_covered: string;
  teaching_method: string | null;
  hours_covered: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // joined
  staff?: { id: string; first_name: string; last_name: string };
  subject?: { id: string; name: string; code: string | null; semester: number };
  curriculum_unit?: { id: string; unit_number: number; title: string } | null;
  academic_year?: { id: string; label: string } | null;
};

export type LessonPlanFilters = {
  staffId?: string;
  subjectId?: string;
  departmentId?: string;
  academicYearId?: string;
  fromDate?: string;
  toDate?: string;
};

export type CreateLessonPlanPayload = {
  institution_id: string;
  staff_id: string;
  subject_id: string;
  curriculum_unit_id?: string | null;
  academic_year_id?: string | null;
  lesson_date: string;
  topic_covered: string;
  teaching_method?: string | null;
  hours_covered: number;
  remarks?: string | null;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function getLessonPlans(
  institutionId: string,
  filters?: LessonPlanFilters,
): Promise<Result<LessonPlan[]>> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  let q = supabase
    .from("lesson_plans")
    .select(`
      *,
      staff:staff_id ( id, first_name, last_name ),
      subject:subject_id ( id, name, code, semester ),
      curriculum_unit:curriculum_unit_id ( id, unit_number, title ),
      academic_year:academic_year_id ( id, label )
    `)
    .eq("institution_id", institutionId)
    .order("lesson_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.staffId)       q = q.eq("staff_id", filters.staffId);
  if (filters?.subjectId)     q = q.eq("subject_id", filters.subjectId);
  if (filters?.academicYearId) q = q.eq("academic_year_id", filters.academicYearId);
  if (filters?.fromDate)      q = q.gte("lesson_date", filters.fromDate);
  if (filters?.toDate)        q = q.lte("lesson_date", filters.toDate);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as LessonPlan[] };
}

export async function getMyLessonPlans(
  institutionId: string,
  staffId: string,
  filters?: Pick<LessonPlanFilters, "subjectId" | "academicYearId" | "fromDate" | "toDate">,
): Promise<Result<LessonPlan[]>> {
  return getLessonPlans(institutionId, { ...filters, staffId });
}

export async function createLessonPlan(
  payload: CreateLessonPlanPayload,
): Promise<Result<LessonPlan>> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("lesson_plans")
    .insert({
      institution_id:     payload.institution_id,
      staff_id:           payload.staff_id,
      subject_id:         payload.subject_id,
      curriculum_unit_id: payload.curriculum_unit_id ?? null,
      academic_year_id:   payload.academic_year_id ?? null,
      lesson_date:        payload.lesson_date,
      topic_covered:      payload.topic_covered,
      teaching_method:    payload.teaching_method ?? null,
      hours_covered:      payload.hours_covered,
      remarks:            payload.remarks ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as LessonPlan };
}

export async function updateLessonPlan(
  id: string,
  institutionId: string,
  payload: Partial<Omit<CreateLessonPlanPayload, "institution_id" | "staff_id">>,
): Promise<Result<LessonPlan>> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("lesson_plans")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("institution_id", institutionId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as LessonPlan };
}

export async function deleteLessonPlan(
  id: string,
  institutionId: string,
): Promise<Result<void>> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from("lesson_plans")
    .delete()
    .eq("id", id)
    .eq("institution_id", institutionId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
