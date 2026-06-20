"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface AcademicYear {
  id: string;
  institution_id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export type EventType =
  | "semester_start"
  | "semester_end"
  | "exam_window"
  | "holiday"
  | "annual_day"
  | "sports_day"
  | "expo"
  | "cultural"
  | "other";

export interface AcademicEvent {
  id: string;
  institution_id: string;
  academic_year_id: string | null;
  title: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  academic_year?: { label: string } | null;
}

export async function getAcademicYears(institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .eq("institution_id", institutionId)
      .order("start_date", { ascending: false });

    if (error) throw error;
    return { success: true as const, data: data as AcademicYear[] };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to fetch academic years" };
  }
}

export async function createAcademicYear(payload: {
  institution_id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // If setting as current, we need to clear is_current on all other years first (or handle constraint)
    if (payload.is_current) {
      const { error: resetError } = await supabase
        .from("academic_years")
        .update({ is_current: false })
        .eq("institution_id", payload.institution_id);
      if (resetError) throw resetError;
    }

    const { data, error } = await supabase
      .from("academic_years")
      .insert([
        {
          institution_id: payload.institution_id,
          label: payload.label,
          start_date: payload.start_date,
          end_date: payload.end_date,
          is_current: !!payload.is_current,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/institutions/${payload.institution_id}/calendar`);
    revalidatePath(`/institutions/${payload.institution_id}/calendar/years`);
    return { success: true as const, data: data as AcademicYear };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to create academic year" };
  }
}

export async function setYearAsCurrent(institutionId: string, yearId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Transactional logic: clear all then set active
    const { error: resetError } = await supabase
      .from("academic_years")
      .update({ is_current: false })
      .eq("institution_id", institutionId);
    if (resetError) throw resetError;

    const { data, error } = await supabase
      .from("academic_years")
      .update({ is_current: true })
      .eq("id", yearId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/institutions/${institutionId}/calendar`);
    revalidatePath(`/institutions/${institutionId}/calendar/years`);
    return { success: true as const, data: data as AcademicYear };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to set active academic year" };
  }
}

export async function getCalendarEvents(
  institutionId: string,
  options?: { academicYearId?: string; publicOnly?: boolean }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let query = supabase
      .from("academic_events")
      .select(`
        *,
        academic_year:academic_years(label)
      `)
      .eq("institution_id", institutionId);

    if (options?.academicYearId) {
      query = query.eq("academic_year_id", options.academicYearId);
    }
    if (options?.publicOnly) {
      query = query.eq("is_public", true);
    }

    const { data, error } = await query.order("start_date", { ascending: true });

    if (error) throw error;
    return { success: true as const, data: data as AcademicEvent[] };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to fetch calendar events" };
  }
}

export async function createCalendarEvent(payload: {
  institution_id: string;
  academic_year_id: string | null;
  title: string;
  event_type: EventType;
  start_date: string;
  end_date: string;
  description: string | null;
  is_public: boolean;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("academic_events")
      .insert([
        {
          institution_id: payload.institution_id,
          academic_year_id: payload.academic_year_id,
          title: payload.title,
          event_type: payload.event_type,
          start_date: payload.start_date,
          end_date: payload.end_date,
          description: payload.description,
          is_public: payload.is_public,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/institutions/${payload.institution_id}/calendar`);
    revalidatePath(`/student-portal/calendar`);
    revalidatePath(`/staff-portal/calendar`);
    return { success: true as const, data: data as AcademicEvent };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to create calendar event" };
  }
}

export async function updateCalendarEvent(
  id: string,
  institutionId: string,
  payload: Partial<{
    title: string;
    event_type: EventType;
    start_date: string;
    end_date: string;
    description: string | null;
    is_public: boolean;
    academic_year_id: string | null;
  }>
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("academic_events")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/institutions/${institutionId}/calendar`);
    revalidatePath(`/student-portal/calendar`);
    revalidatePath(`/staff-portal/calendar`);
    return { success: true as const, data: data as AcademicEvent };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to update calendar event" };
  }
}

export async function deleteCalendarEvent(id: string, institutionId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.from("academic_events").delete().eq("id", id);

    if (error) throw error;

    revalidatePath(`/institutions/${institutionId}/calendar`);
    revalidatePath(`/student-portal/calendar`);
    revalidatePath(`/staff-portal/calendar`);
    return { success: true as const };
  } catch (err) {
    return { success: false as const, error: (err instanceof Error ? err.message : "") || "Failed to delete calendar event" };
  }
}
