"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { MaterialType } from "@/lib/lms";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

async function currentStaffId(): Promise<string | null> {
  const supabase = await db();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data } = await supabase.from("staff").select("id").eq("email", user.email).maybeSingle();
  return (data?.id as string) ?? null;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubjectOverview = {
  id: string; name: string; code: string | null; semester: number | null;
  departmentName: string | null; materialCount: number; assignmentCount: number;
};

export type MaterialRow = {
  id: string; title: string; materialType: MaterialType; fileUrl: string | null; externalUrl: string | null;
  isPublished: boolean; unitId: string | null; unitNumber: number | null; unitTitle: string | null;
  uploadedByName: string | null; createdAt: string;
};

export type UnitOption = { id: string; unit_number: number; title: string };

// ── Overview (admin) ──────────────────────────────────────────────────────────

export async function getLmsSubjects(institutionId: string): Promise<Result<SubjectOverview[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, code, semester, departments(name), study_materials(count), lms_assignments(count)")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("name");
    if (error) return { success: false, error: error.message };
    const rows: SubjectOverview[] = (data ?? []).map((s) => ({
      id: s.id as string,
      name: s.name as string,
      code: (s.code as string | null) ?? null,
      semester: (s.semester as number | null) ?? null,
      departmentName: (s.departments as unknown as { name: string } | null)?.name ?? null,
      materialCount: (s.study_materials as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      assignmentCount: (s.lms_assignments as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getSubjectMeta(subjectId: string): Promise<Result<{ name: string; code: string | null; institutionId: string; units: UnitOption[] }>> {
  try {
    const supabase = await db();
    const [{ data: subject, error: sErr }, { data: units }] = await Promise.all([
      supabase.from("subjects").select("name, code, institution_id").eq("id", subjectId).maybeSingle(),
      supabase.from("curriculum_units").select("id, unit_number, title").eq("subject_id", subjectId).order("unit_number"),
    ]);
    if (sErr) return { success: false, error: sErr.message };
    if (!subject) return { success: false, error: "Subject not found." };
    return {
      success: true,
      data: {
        name: subject.name as string,
        code: (subject.code as string | null) ?? null,
        institutionId: subject.institution_id as string,
        units: (units ?? []).map((u) => ({ id: u.id as string, unit_number: u.unit_number as number, title: u.title as string })),
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Materials ─────────────────────────────────────────────────────────────────

export async function getMaterials(subjectId: string): Promise<Result<MaterialRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("study_materials")
      .select("id, title, material_type, file_url, external_url, is_published, created_at, curriculum_units(id, unit_number, title), staff(full_name)")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const rows: MaterialRow[] = (data ?? []).map((m) => {
      const unit = m.curriculum_units as unknown as { id: string; unit_number: number; title: string } | null;
      return {
        id: m.id as string,
        title: m.title as string,
        materialType: m.material_type as MaterialType,
        fileUrl: (m.file_url as string | null) ?? null,
        externalUrl: (m.external_url as string | null) ?? null,
        isPublished: !!m.is_published,
        unitId: unit?.id ?? null,
        unitNumber: unit?.unit_number ?? null,
        unitTitle: unit?.title ?? null,
        uploadedByName: (m.staff as unknown as { full_name: string } | null)?.full_name ?? null,
        createdAt: m.created_at as string,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createMaterial(input: {
  institutionId: string; subjectId: string; title: string; materialType: MaterialType;
  curriculumUnitId?: string | null; fileUrl?: string | null; externalUrl?: string | null; isPublished: boolean;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Title is required." };
    if (!input.fileUrl && !input.externalUrl) return { success: false, error: "Provide a file or an external link." };
    const supabase = await db();
    const staffId = await currentStaffId();
    const { data, error } = await supabase.from("study_materials").insert({
      institution_id: input.institutionId,
      subject_id: input.subjectId,
      curriculum_unit_id: input.curriculumUnitId || null,
      title: input.title.trim(),
      material_type: input.materialType,
      file_url: input.fileUrl || null,
      external_url: input.externalUrl || null,
      uploaded_by: staffId,
      is_published: input.isPublished,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/lms/${input.subjectId}`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function togglePublishMaterial(input: { institutionId: string; subjectId: string; id: string; isPublished: boolean }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("study_materials").update({ is_published: input.isPublished }).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/lms/${input.subjectId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteMaterial(input: { institutionId: string; subjectId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("study_materials").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/lms/${input.subjectId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Portal subject lists ──────────────────────────────────────────────────────

export type PortalSubject = { id: string; name: string; code: string | null; semester: number | null; materialCount: number };

/** Subjects the signed-in staff teaches. */
export async function getStaffSubjects(): Promise<Result<PortalSubject[]>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };
    const { data: staff } = await supabase.from("staff").select("id").eq("email", user.email).maybeSingle();
    if (!staff) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("teaching_assignments")
      .select("subjects(id, name, code, semester, study_materials(count))")
      .eq("staff_id", staff.id as string);
    if (error) return { success: false, error: error.message };
    const seen = new Set<string>();
    const rows: PortalSubject[] = [];
    for (const ta of data ?? []) {
      const s = ta.subjects as unknown as { id: string; name: string; code: string | null; semester: number | null; study_materials: { count: number }[] } | null;
      if (!s || seen.has(s.id)) continue;
      seen.add(s.id);
      rows.push({ id: s.id, name: s.name, code: s.code ?? null, semester: s.semester ?? null, materialCount: s.study_materials?.[0]?.count ?? 0 });
    }
    return { success: true, data: rows.sort((a, b) => a.name.localeCompare(b.name)) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Subjects for the signed-in student's department. */
export async function getStudentSubjects(): Promise<Result<PortalSubject[]>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase.from("students").select("department_id").eq("email", user.email).maybeSingle();
    if (!student?.department_id) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, code, semester, study_materials(count)")
      .eq("department_id", student.department_id as string)
      .eq("is_active", true)
      .order("semester")
      .order("name");
    if (error) return { success: false, error: error.message };
    const rows: PortalSubject[] = (data ?? []).map((s) => ({
      id: s.id as string, name: s.name as string, code: (s.code as string | null) ?? null,
      semester: (s.semester as number | null) ?? null,
      materialCount: (s.study_materials as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
