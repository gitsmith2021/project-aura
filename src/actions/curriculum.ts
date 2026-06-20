"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReferenceBook = { title: string; author?: string; isbn?: string };

export type CurriculumUnit = {
  id: string;
  subject_id: string;
  institution_id: string;
  unit_number: number;
  title: string;
  description: string | null;
  topics: string[] | null;
  reference_books: ReferenceBook[] | null;
  hours_allocated: number;
  created_at: string;
  subjects?: { name: string; code: string | null; department_id: string | null; semester: number } | null;
};

export type SyllabusCompletion = {
  id: string;
  curriculum_unit_id: string;
  staff_id: string;
  institution_id: string;
  academic_year_id: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  is_completed: boolean;
  updated_at: string;
  staff?: { full_name: string } | null;
};

export type SubjectWithProgress = {
  subject_id: string;
  subject_name: string;
  subject_code: string | null;
  department_id: string | null;
  department_name: string | null;
  semester: number;
  total_units: number;
  completed_units: number;
  total_hours: number;
  completed_hours: number;
  completion_pct: number;
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getCurriculumUnits(
  institutionId: string,
  subjectId: string
): Promise<{ success: true; data: CurriculumUnit[] } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from("curriculum_units")
      .select("*, subjects(name, code, department_id, semester)")
      .eq("institution_id", institutionId)
      .eq("subject_id", subjectId)
      .order("unit_number");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as CurriculumUnit[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getCurriculumOverview(
  institutionId: string,
  filters?: { departmentId?: string; semester?: number; academicYearId?: string }
): Promise<{ success: true; data: SubjectWithProgress[] } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Fetch subjects with their curriculum units
    let sq = supabase
      .from("subjects")
      .select("id, name, code, department_id, semester, departments(name), curriculum_units(id, hours_allocated)")
      .eq("institution_id", institutionId)
      .eq("is_active", true);
    if (filters?.departmentId) sq = sq.eq("department_id", filters.departmentId);
    if (filters?.semester)     sq = sq.eq("semester", filters.semester);

    const { data: subjects, error: se } = await sq.order("semester").order("name");
    if (se) return { success: false, error: se.message };
    if (!subjects?.length) return { success: true, data: [] };

    // Fetch completion records for these subjects
    let cq = supabase
      .from("syllabus_completion")
      .select("curriculum_unit_id, is_completed")
      .eq("institution_id", institutionId)
      .eq("is_completed", true);
    if (filters?.academicYearId) cq = cq.eq("academic_year_id", filters.academicYearId);

    const { data: completions, error: ce } = await cq;
    if (ce) return { success: false, error: ce.message };

    // Build unit→subject map
    const completedUnitIds = new Set((completions ?? []).map(c => c.curriculum_unit_id));

    const overview: SubjectWithProgress[] = (subjects ?? []).map(s => {
      const units = (s.curriculum_units as { id: string; hours_allocated: number }[]) ?? [];
      const completedUnits = units.filter(u => completedUnitIds.has(u.id));
      const totalHours     = units.reduce((acc, u) => acc + u.hours_allocated, 0);
      const completedHours = completedUnits.reduce((acc, u) => acc + u.hours_allocated, 0);
      return {
        subject_id:       s.id,
        subject_name:     s.name,
        subject_code:     s.code,
        department_id:    s.department_id,
        department_name:  (s.departments as unknown as { name: string } | null)?.name ?? null,
        semester:         s.semester,
        total_units:      units.length,
        completed_units:  completedUnits.length,
        total_hours:      totalHours,
        completed_hours:  completedHours,
        completion_pct:   units.length > 0 ? Math.round((completedUnits.length / units.length) * 100) : 0,
      };
    });

    return { success: true, data: overview };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getSyllabusCompletion(
  institutionId: string,
  subjectId: string,
  academicYearId?: string
): Promise<{ success: true; data: SyllabusCompletion[] } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const unitIds = await supabase
      .from("curriculum_units")
      .select("id")
      .eq("subject_id", subjectId)
      .then(r => (r.data ?? []).map(u => u.id));

    if (!unitIds.length) return { success: true, data: [] };

    let q = supabase
      .from("syllabus_completion")
      .select("*, staff(full_name)")
      .eq("institution_id", institutionId)
      .in("curriculum_unit_id", unitIds);
    if (academicYearId) q = q.eq("academic_year_id", academicYearId);

    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as SyllabusCompletion[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function addCurriculumUnit(payload: {
  institution_id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description?: string;
  topics?: string[];
  reference_books?: ReferenceBook[];
  hours_allocated?: number;
}): Promise<{ success: true; data: CurriculumUnit } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase
      .from("curriculum_units")
      .insert(payload)
      .select("*, subjects(name, code, department_id, semester)")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${payload.institution_id}/curriculum`);
    return { success: true, data: data as CurriculumUnit };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateCurriculumUnit(
  id: string,
  institutionId: string,
  payload: Partial<Pick<CurriculumUnit, "title" | "description" | "topics" | "reference_books" | "hours_allocated" | "unit_number">>
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.from("curriculum_units").update(payload).eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/curriculum`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteCurriculumUnit(
  id: string,
  institutionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.from("curriculum_units").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/curriculum`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function markUnitComplete(payload: {
  curriculum_unit_id: string;
  staff_id: string;
  institution_id: string;
  academic_year_id: string | null;
  is_completed: boolean;
  completion_notes?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const row = {
      curriculum_unit_id: payload.curriculum_unit_id,
      staff_id:           payload.staff_id,
      institution_id:     payload.institution_id,
      academic_year_id:   payload.academic_year_id,
      is_completed:       payload.is_completed,
      completion_notes:   payload.completion_notes ?? null,
      completed_at:       payload.is_completed ? new Date().toISOString().slice(0, 10) : null,
      updated_at:         new Date().toISOString(),
    };
    const { error } = await supabase
      .from("syllabus_completion")
      .upsert(row, { onConflict: "curriculum_unit_id,staff_id,academic_year_id" });
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${payload.institution_id}/curriculum`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// For staff portal — get completion for logged-in staff
export async function getMyCompletionForSubject(
  staffId: string,
  institutionId: string,
  subjectId: string,
  academicYearId?: string
): Promise<{ success: true; data: Record<string, boolean> } | { success: false; error: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const unitIds = await supabase
      .from("curriculum_units")
      .select("id")
      .eq("subject_id", subjectId)
      .then(r => (r.data ?? []).map(u => u.id));

    if (!unitIds.length) return { success: true, data: {} };

    let q = supabase
      .from("syllabus_completion")
      .select("curriculum_unit_id, is_completed")
      .eq("staff_id", staffId)
      .eq("institution_id", institutionId)
      .in("curriculum_unit_id", unitIds);
    if (academicYearId) q = q.eq("academic_year_id", academicYearId);

    const { data, error } = await q;
    if (error) return { success: false, error: error.message };
    const map: Record<string, boolean> = {};
    (data ?? []).forEach(r => { map[r.curriculum_unit_id] = r.is_completed; });
    return { success: true, data: map };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
