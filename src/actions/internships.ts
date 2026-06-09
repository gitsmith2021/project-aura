"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type Internship = {
  id: string;
  institution_id: string;
  student_id: string;
  academic_year_id: string | null;
  type: string;
  company_name: string;
  company_location: string | null;
  company_sector: string | null;
  mentor_name: string | null;
  mentor_email: string | null;
  mentor_phone: string | null;
  start_date: string;
  end_date: string | null;
  duration_weeks: number | null;
  role_title: string | null;
  description: string | null;
  technologies: string | null;
  certificate_issued: boolean;
  is_paid: boolean;
  stipend_amount: number | null;
  stipend_currency: string;
  offer_received: boolean;
  offer_package: number | null;
  feedback: string | null;
  naac_criterion: string;
  nirf_category: string;
  created_at: string;
  updated_at: string;
  // joins
  students?: {
    id: string;
    roll_number: string | null;
    profiles: { full_name: string | null } | null;
    departments: { name: string } | null;
    batches: { name: string } | null;
  } | null;
};

export type InternshipFilters = {
  departmentId?: string;
  academicYearId?: string;
  type?: string;
  companyName?: string;
};

export type InternshipPayload = {
  institution_id: string;
  student_id: string;
  academic_year_id?: string;
  type: string;
  company_name: string;
  company_location?: string;
  company_sector?: string;
  mentor_name?: string;
  mentor_email?: string;
  mentor_phone?: string;
  start_date: string;
  end_date?: string;
  duration_weeks?: number;
  role_title?: string;
  description?: string;
  technologies?: string;
  certificate_issued?: boolean;
  is_paid?: boolean;
  stipend_amount?: number;
  offer_received?: boolean;
  offer_package?: number;
  feedback?: string;
};

export async function getInternships(
  institutionId: string,
  filters: InternshipFilters = {}
): Promise<{ success: true; data: Internship[] } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  let query = supabase
    .from("internships")
    .select(`
      *,
      students (
        id,
        roll_number,
        profiles ( full_name ),
        departments ( name ),
        batches ( name )
      )
    `)
    .eq("institution_id", institutionId)
    .order("start_date", { ascending: false });

  if (filters.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.companyName) query = query.ilike("company_name", `%${filters.companyName}%`);
  if (filters.departmentId) {
    query = query.eq("students.department_id", filters.departmentId);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Internship[] };
}

export async function getMyInternships(
  institutionId: string
): Promise<{ success: true; data: Internship[] } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .eq("institution_id", institutionId)
    .single();

  if (!student) return { success: false, error: "Student record not found" };

  const { data, error } = await supabase
    .from("internships")
    .select("*")
    .eq("student_id", student.id)
    .order("start_date", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Internship[] };
}

export async function createInternship(
  payload: InternshipPayload
): Promise<{ success: true; data: Internship } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("internships")
    .insert(payload)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/institutions/${payload.institution_id}/internships`);
  return { success: true, data: data as Internship };
}

export async function updateInternship(
  id: string,
  institutionId: string,
  payload: Partial<InternshipPayload>
): Promise<{ success: true; data: Internship } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase
    .from("internships")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/institutions/${institutionId}/internships`);
  return { success: true, data: data as Internship };
}

export async function deleteInternship(
  id: string,
  institutionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from("internships").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/institutions/${institutionId}/internships`);
  return { success: true };
}
