"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface Subject {
  id: string;
  institution_id: string;
  department_id: string;
  name: string;
  code: string | null;
  subject_type: "theory" | "lab" | "elective" | "project";
  semester: number;
  credits: number;
  hours_per_week: number;
  is_active: boolean;
  created_at: string;
}

export interface TeachingAssignment {
  id: string;
  institution_id: string;
  staff_id: string;
  subject_id: string;
  academic_year_id: string | null;
  semester: number;
  is_primary: boolean;
  created_at: string;
}

export async function getSubjects(departmentId: string, semester?: number) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    let query = supabase
      .from("subjects")
      .select("*")
      .eq("department_id", departmentId)
      .eq("is_active", true);

    if (semester !== undefined) {
      query = query.eq("semester", semester);
    }

    const { data, error } = await query.order("semester").order("name");

    if (error) throw error;
    return { success: true as const, data: data as Subject[] };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to fetch subjects" };
  }
}

export async function addSubject(payload: Omit<Subject, "id" | "created_at" | "is_active">) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("subjects")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/institutions/${payload.institution_id}/subjects`);
    return { success: true as const, data: data as Subject };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to add subject" };
  }
}

export async function updateSubject(
  id: string,
  institutionId: string,
  payload: Partial<Omit<Subject, "id" | "institution_id" | "created_at">>
) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("subjects")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/institutions/${institutionId}/subjects`);
    return { success: true as const, data: data as Subject };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to update subject" };
  }
}

export async function assignTeacher(payload: {
  institution_id: string;
  staff_id: string;
  subject_id: string;
  academic_year_id: string;
  semester: number;
  is_primary?: boolean;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase
      .from("teaching_assignments")
      .insert([
        {
          institution_id: payload.institution_id,
          staff_id: payload.staff_id,
          subject_id: payload.subject_id,
          academic_year_id: payload.academic_year_id,
          semester: payload.semester,
          is_primary: payload.is_primary ?? true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/institutions/${payload.institution_id}/subjects`);
    return { success: true as const, data: data as TeachingAssignment };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to assign teacher" };
  }
}

export async function getTeachingAssignments(departmentId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Fetch assignments for subjects in this department
    const { data, error } = await supabase
      .from("teaching_assignments")
      .select(`
        *,
        staff:staff(id, full_name, email),
        subject:subjects(*)
      `)
      .eq("subject.department_id", departmentId);

    if (error) throw error;
    
    // Filter out assignments where the subject filter didn't match (since inner join isn't default in PostgREST select unless specified)
    const filteredData = (data || []).filter((assignment: any) => assignment.subject !== null);

    return { success: true as const, data: filteredData };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to fetch teaching assignments" };
  }
}

export async function getMySubjects(profileId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Step 1: Find the staff member row
    const { data: staffMember, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("profile_id", profileId)
      .maybeSingle();

    if (staffError) throw staffError;
    if (!staffMember) return { success: true as const, data: [] };

    // Step 2: Get teaching assignments for this staff member
    const { data, error } = await supabase
      .from("teaching_assignments")
      .select(`
        *,
        subject:subjects(*)
      `)
      .eq("staff_id", staffMember.id);

    if (error) throw error;

    const subjects = (data || [])
      .map((assignment: any) => assignment.subject)
      .filter((subj: any) => subj !== null && subj.is_active);

    return { success: true as const, data: subjects as Subject[] };
  } catch (err: any) {
    return { success: false as const, error: err.message || "Failed to fetch my subjects" };
  }
}
