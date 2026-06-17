"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { graduationYearToBatch, type Alumnus, type AlumniAnnouncement } from "@/lib/alumni";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const ALUMNI_COLS =
  "id, institution_id, profile_id, source_student_id, full_name, email, phone, roll_no, program, department_id, graduation_year, batch, current_employer, current_designation, linkedin_url, city, is_active, created_at, updated_at, departments!department_id(name)";

const ANN_COLS =
  "id, institution_id, title, body, graduation_year, program, posted_by, created_at";

// ── Admin: directory ────────────────────────────────────────────────────────

export async function getAlumniForAdmin(institutionId: string): Promise<Result<Alumnus[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("alumni")
      .select(ALUMNI_COLS)
      .eq("institution_id", institutionId)
      .order("graduation_year", { ascending: false })
      .order("full_name", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Alumnus[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createAlumni(input: {
  institutionId: string;
  fullName: string;
  graduationYear: number;
  program?: string | null;
  departmentId?: string | null;
  email?: string | null;
  phone?: string | null;
  rollNo?: string | null;
  currentEmployer?: string | null;
  currentDesignation?: string | null;
  linkedinUrl?: string | null;
  city?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.fullName.trim()) return { success: false, error: "Name is required." };
    if (!input.graduationYear || input.graduationYear < 1900) return { success: false, error: "A valid graduation year is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("alumni")
      .insert({
        institution_id: input.institutionId,
        full_name: input.fullName.trim(),
        graduation_year: input.graduationYear,
        program: input.program || null,
        department_id: input.departmentId || null,
        batch: graduationYearToBatch(input.graduationYear, input.program ?? null),
        email: input.email?.trim().toLowerCase() || null,
        phone: input.phone?.trim() || null,
        roll_no: input.rollNo?.trim() || null,
        current_employer: input.currentEmployer?.trim() || null,
        current_designation: input.currentDesignation?.trim() || null,
        linkedin_url: input.linkedinUrl?.trim() || null,
        city: input.city?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/alumni`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateAlumniAdmin(input: {
  institutionId: string;
  id: string;
  fullName?: string;
  graduationYear?: number;
  program?: string | null;
  departmentId?: string | null;
  email?: string | null;
  phone?: string | null;
  rollNo?: string | null;
  currentEmployer?: string | null;
  currentDesignation?: string | null;
  linkedinUrl?: string | null;
  city?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.fullName !== undefined) patch.full_name = input.fullName.trim();
    if (input.graduationYear !== undefined) patch.graduation_year = input.graduationYear;
    if (input.program !== undefined) patch.program = input.program || null;
    if (input.departmentId !== undefined) patch.department_id = input.departmentId || null;
    if (input.graduationYear !== undefined || input.program !== undefined) {
      // keep batch label in sync when either component changes
      const { data: cur } = await supabase.from("alumni").select("graduation_year, program").eq("id", input.id).maybeSingle();
      const year = input.graduationYear ?? (cur?.graduation_year as number);
      const prog = input.program !== undefined ? input.program : (cur?.program as string | null);
      if (year) patch.batch = graduationYearToBatch(year, prog ?? null);
    }
    if (input.email !== undefined) patch.email = input.email?.trim().toLowerCase() || null;
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
    if (input.rollNo !== undefined) patch.roll_no = input.rollNo?.trim() || null;
    if (input.currentEmployer !== undefined) patch.current_employer = input.currentEmployer?.trim() || null;
    if (input.currentDesignation !== undefined) patch.current_designation = input.currentDesignation?.trim() || null;
    if (input.linkedinUrl !== undefined) patch.linkedin_url = input.linkedinUrl?.trim() || null;
    if (input.city !== undefined) patch.city = input.city?.trim() || null;
    const { error } = await supabase.from("alumni").update(patch).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/alumni`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function setAlumniActive(input: {
  institutionId: string;
  id: string;
  isActive: boolean;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("alumni")
      .update({ is_active: input.isActive, updated_at: new Date().toISOString() })
      .eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/alumni`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Import graduated students (students.is_graduated = true) into the alumni
 * directory, carrying over their auth account (profile_id) so they can log into
 * /alumni-portal. Skips students already imported. Returns the count added.
 */
export async function importGraduates(input: {
  institutionId: string;
  graduationYear?: number;
}): Promise<Result<{ imported: number; skipped: number }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const gradYear = input.graduationYear ?? new Date().getFullYear();

    const { data: grads, error: gErr } = await supabase
      .from("students")
      .select("id, full_name, email, roll_no, student_program, department_id, profile_id")
      .eq("institution_id", input.institutionId)
      .eq("is_graduated", true);
    if (gErr) return { success: false, error: gErr.message };
    if (!grads || grads.length === 0) return { success: true, data: { imported: 0, skipped: 0 } };

    // Skip anyone already in the directory (by source student or carried profile).
    const { data: existing } = await supabase
      .from("alumni")
      .select("source_student_id, profile_id")
      .eq("institution_id", input.institutionId);
    const seenStudents = new Set((existing ?? []).map((r) => r.source_student_id).filter(Boolean));
    const seenProfiles = new Set((existing ?? []).map((r) => r.profile_id).filter(Boolean));

    const toInsert = grads
      .filter((s) => !seenStudents.has(s.id) && !(s.profile_id && seenProfiles.has(s.profile_id)))
      .map((s) => ({
        institution_id: input.institutionId,
        profile_id: (s.profile_id as string | null) ?? null,
        source_student_id: s.id as string,
        full_name: s.full_name as string,
        email: (s.email as string | null) ?? null,
        roll_no: (s.roll_no as string | null) ?? null,
        program: (s.student_program as string | null) ?? null,
        department_id: (s.department_id as string | null) ?? null,
        graduation_year: gradYear,
        batch: graduationYearToBatch(gradYear, (s.student_program as string | null) ?? null),
      }));

    const skipped = grads.length - toInsert.length;
    if (toInsert.length === 0) return { success: true, data: { imported: 0, skipped } };

    const { error: insErr } = await supabase.from("alumni").insert(toInsert);
    if (insErr) return { success: false, error: insErr.message };

    await logAudit({
      institutionId: input.institutionId,
      performedBy: user.id,
      tableName: "alumni",
      recordId: input.institutionId,
      action: "INSERT",
      afterData: { imported: toInsert.length, graduation_year: gradYear },
      notes: "Imported graduated students into the alumni directory",
    });

    revalidatePath(`/institutions/${input.institutionId}/alumni`);
    return { success: true, data: { imported: toInsert.length, skipped } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Alumni portal: self-service ─────────────────────────────────────────────

export async function getAlumniProfile(): Promise<Result<Alumnus | null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("alumni")
      .select(ALUMNI_COLS)
      .eq("profile_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as unknown as Alumnus) ?? null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Self-update — restricted to professional fields only (RLS guards the row). */
export async function updateAlumniProfile(input: {
  phone?: string | null;
  currentEmployer?: string | null;
  currentDesignation?: string | null;
  linkedinUrl?: string | null;
  city?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
    if (input.currentEmployer !== undefined) patch.current_employer = input.currentEmployer?.trim() || null;
    if (input.currentDesignation !== undefined) patch.current_designation = input.currentDesignation?.trim() || null;
    if (input.linkedinUrl !== undefined) patch.linkedin_url = input.linkedinUrl?.trim() || null;
    if (input.city !== undefined) patch.city = input.city?.trim() || null;
    const { error } = await supabase.from("alumni").update(patch).eq("profile_id", user.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/alumni-portal/profile");
    revalidatePath("/alumni-portal");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Fellow alumni of the same institution (RLS scopes to the caller's institution). */
export async function getAlumniDirectory(institutionId: string): Promise<Result<Alumnus[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("alumni")
      .select(ALUMNI_COLS)
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("graduation_year", { ascending: false })
      .order("full_name", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Alumnus[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Announcements ─────────────────────────────────────────────────────────────

export async function getAlumniAnnouncements(institutionId: string): Promise<Result<AlumniAnnouncement[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("alumni_announcements")
      .select(ANN_COLS)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as AlumniAnnouncement[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function sendAlumniAnnouncement(input: {
  institutionId: string;
  title: string;
  body: string;
  graduationYear?: number | null;
  program?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Title is required." };
    if (!input.body.trim()) return { success: false, error: "Message body is required." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("alumni_announcements")
      .insert({
        institution_id: input.institutionId,
        title: input.title.trim(),
        body: input.body.trim(),
        graduation_year: input.graduationYear ?? null,
        program: input.program || null,
        posted_by: user.id,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/alumni/announcements`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteAlumniAnnouncement(input: {
  institutionId: string;
  id: string;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("alumni_announcements").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/alumni/announcements`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
