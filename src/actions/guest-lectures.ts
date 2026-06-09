"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type GuestLecture = {
  id: string;
  institution_id: string;
  department_id: string | null;
  academic_year_id: string | null;
  subject_id: string | null;
  speaker_name: string;
  speaker_designation: string | null;
  speaker_organization: string | null;
  speaker_email: string | null;
  speaker_phone: string | null;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  mode: "in_person" | "online" | "hybrid";
  student_count: number | null;
  staff_count: number | null;
  organized_by: string | null;
  description: string | null;
  outcomes: string | null;
  feedback_summary: string | null;
  naac_criterion: string;
  created_at: string;
  updated_at: string;
  // joined
  department?: { id: string; name: string } | null;
  academic_year?: { id: string; label: string } | null;
  subject?: { id: string; name: string; code: string | null } | null;
  organizer?: { id: string; first_name: string; last_name: string } | null;
};

export type GuestLectureFilters = {
  departmentId?: string;
  academicYearId?: string;
  mode?: string;
  fromDate?: string;
  toDate?: string;
};

export type GuestLecturePayload = {
  institution_id: string;
  department_id?: string | null;
  academic_year_id?: string | null;
  subject_id?: string | null;
  speaker_name: string;
  speaker_designation?: string | null;
  speaker_organization?: string | null;
  speaker_email?: string | null;
  speaker_phone?: string | null;
  title: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  mode: "in_person" | "online" | "hybrid";
  student_count?: number | null;
  staff_count?: number | null;
  organized_by?: string | null;
  description?: string | null;
  outcomes?: string | null;
  feedback_summary?: string | null;
  naac_criterion?: string;
};

type Result<T> = { success: true; data: T } | { success: false; error: string };

export async function getGuestLectures(
  institutionId: string,
  filters?: GuestLectureFilters,
): Promise<Result<GuestLecture[]>> {
  const supabase = await createClient();
  let q = supabase
    .from("guest_lectures")
    .select(`
      *,
      department:department_id ( id, name ),
      academic_year:academic_year_id ( id, label ),
      subject:subject_id ( id, name, code ),
      organizer:organized_by ( id, first_name, last_name )
    `)
    .eq("institution_id", institutionId)
    .order("event_date", { ascending: false });

  if (filters?.departmentId)  q = q.eq("department_id", filters.departmentId);
  if (filters?.academicYearId) q = q.eq("academic_year_id", filters.academicYearId);
  if (filters?.mode)          q = q.eq("mode", filters.mode);
  if (filters?.fromDate)      q = q.gte("event_date", filters.fromDate);
  if (filters?.toDate)        q = q.lte("event_date", filters.toDate);

  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as GuestLecture[] };
}

export async function createGuestLecture(
  payload: GuestLecturePayload,
): Promise<Result<GuestLecture>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guest_lectures")
    .insert(payload)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(`/institutions/${payload.institution_id}/guest-lectures`);
  return { success: true, data: data as GuestLecture };
}

export async function updateGuestLecture(
  id: string,
  institutionId: string,
  payload: Partial<GuestLecturePayload>,
): Promise<Result<GuestLecture>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guest_lectures")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("institution_id", institutionId)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(`/institutions/${institutionId}/guest-lectures`);
  return { success: true, data: data as GuestLecture };
}

export async function deleteGuestLecture(
  id: string,
  institutionId: string,
): Promise<Result<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("guest_lectures")
    .delete()
    .eq("id", id)
    .eq("institution_id", institutionId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/institutions/${institutionId}/guest-lectures`);
  return { success: true, data: undefined };
}
