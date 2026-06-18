"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
// Dev Rule 16: parents have no RLS access to their child's academic tables, and
// expressing parent→child access as RLS on every table (attendance, cia_results,
// fee_demands, …) is impractical. Instead every read here is gated server-side by
// a verified parent↔student link, then fetched with the service-role client.
import { createAdminClient } from "@/utils/supabase/admin";
import type { LinkedStudent, Relationship } from "@/lib/parentPortal";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function currentParent(): Promise<{ id: string; institution_id: string } | null> {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("parents").select("id, institution_id").eq("user_id", user.id).maybeSingle();
  return data ? { id: data.id as string, institution_id: data.institution_id as string } : null;
}

/** True only if the signed-in parent is linked to this student. */
async function parentOwnsStudent(parentId: string, studentId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("parent_student_links").select("id").eq("parent_id", parentId).eq("student_id", studentId).maybeSingle();
  return !!data;
}

// ── Parent: linked children ──────────────────────────────────────────────────

export async function getLinkedStudents(): Promise<Result<LinkedStudent[]>> {
  try {
    const parent = await currentParent();
    if (!parent) return { success: true, data: [] };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("parent_student_links")
      .select("relationship, is_primary, students(id, full_name, roll_no, student_program, student_year, department_id, departments(name))")
      .eq("parent_id", parent.id);
    if (error) return { success: false, error: error.message };
    const rows: LinkedStudent[] = (data ?? []).map((l) => {
      const s = l.students as unknown as {
        id: string; full_name: string; roll_no: string | null; student_program: string | null;
        student_year: number | null; departments: { name: string } | null;
      };
      return {
        studentId: s.id,
        name: s.full_name,
        rollNo: s.roll_no ?? null,
        program: s.student_program ?? null,
        year: s.student_year ?? null,
        department: s.departments?.name ?? null,
        relationship: (l.relationship as Relationship) ?? "parent",
        isPrimary: !!l.is_primary,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** The child currently selected in the topbar switcher (cookie), else the first. */
export async function getSelectedChild(): Promise<LinkedStudent | null> {
  const res = await getLinkedStudents();
  const kids = res.success ? res.data : [];
  if (kids.length === 0) return null;
  const cookieStore = await cookies();
  const id = cookieStore.get("aura-parent-child")?.value;
  return kids.find((k) => k.studentId === id) ?? kids[0];
}

// ── Parent: child data (link-verified, service-role) ─────────────────────────

export async function getChildAttendance(studentId: string): Promise<Result<{ subject: string | null; status: string | null }[]>> {
  try {
    const parent = await currentParent();
    if (!parent || !(await parentOwnsStudent(parent.id, studentId))) return { success: false, error: "Not authorised for this student." };
    const admin = createAdminClient();
    const { data, error } = await admin.from("attendance").select("status, class_schedules(subject_name)").eq("student_id", studentId);
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []).map((a) => ({
      subject: (a.class_schedules as unknown as { subject_name: string | null } | null)?.subject_name ?? null,
      status: (a.status as string | null) ?? null,
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getChildResults(studentId: string): Promise<Result<{ semester: number | null; final_percentage: number | null; status: string | null; academic_year_id: string | null; created_at: string }[]>> {
  try {
    const parent = await currentParent();
    if (!parent || !(await parentOwnsStudent(parent.id, studentId))) return { success: false, error: "Not authorised for this student." };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("cia_results")
      .select("semester, final_percentage, status, academic_year_id, created_at")
      .eq("student_id", studentId)
      .eq("status", "published")
      .order("semester", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as never };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getChildFees(studentId: string): Promise<Result<{ id: string; title: string; amount_due: number | null; concession_amount: number | null; net_due: number | null; due_date: string | null; status: string | null }[]>> {
  try {
    const parent = await currentParent();
    if (!parent || !(await parentOwnsStudent(parent.id, studentId))) return { success: false, error: "Not authorised for this student." };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("fee_demands")
      .select("id, title, amount_due, concession_amount, net_due, due_date, status")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as never };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getChildUpcomingExams(studentId: string): Promise<Result<{ subject_name: string; exam_type: string | null; exam_date: string; hall_name: string | null }[]>> {
  try {
    const parent = await currentParent();
    if (!parent || !(await parentOwnsStudent(parent.id, studentId))) return { success: false, error: "Not authorised for this student." };
    const admin = createAdminClient();
    const { data: student } = await admin.from("students").select("department_id").eq("id", studentId).maybeSingle();
    const deptId = student?.department_id as string | null;
    if (!deptId) return { success: true, data: [] };
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await admin
      .from("exam_schedules")
      .select("subject_name, exam_type, exam_date, hall_name")
      .eq("department_id", deptId)
      .gte("exam_date", today)
      .order("exam_date", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as never };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin: manage parent accounts & links ────────────────────────────────────

export type AdminParentRow = {
  id: string; name: string; email: string; phone: string | null; has_login: boolean;
  children: { linkId: string; studentId: string; name: string; relationship: string }[];
};

export async function getParents(institutionId: string): Promise<Result<AdminParentRow[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("parents")
      .select("id, name, email, phone, user_id, parent_student_links(id, relationship, students(id, full_name))")
      .eq("institution_id", institutionId)
      .order("name");
    if (error) return { success: false, error: error.message };
    const rows: AdminParentRow[] = (data ?? []).map((p) => ({
      id: p.id as string, name: p.name as string, email: p.email as string,
      phone: (p.phone as string | null) ?? null, has_login: !!p.user_id,
      children: (Array.isArray(p.parent_student_links) ? p.parent_student_links : []).map((l) => {
        const s = l.students as unknown as { id: string; full_name: string } | null;
        return { linkId: l.id as string, studentId: s?.id ?? "", name: s?.full_name ?? "—", relationship: (l.relationship as string) ?? "parent" };
      }),
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Create a parent account + login (temp password) so they can sign in to the parent portal. */
export async function createParent(input: {
  institutionId: string; name: string; email: string; phone?: string | null;
}): Promise<Result<{ id: string; email: string; password: string }>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Parent name is required." };
    if (!input.email.trim()) return { success: false, error: "Email is required." };
    const email = input.email.trim().toLowerCase();
    const admin = createAdminClient();

    const password = "Aura@1234";
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: input.name }, app_metadata: { must_reset_password: true },
    });
    if (cErr || !created?.user) return { success: false, error: cErr?.message ?? "Could not create the login." };

    const { data, error } = await admin.from("parents").insert({
      institution_id: input.institutionId, name: input.name.trim(), email, phone: input.phone?.trim() || null, user_id: created.user.id,
    }).select("id").single();
    if (error) { await admin.auth.admin.deleteUser(created.user.id); return { success: false, error: error.message }; }

    revalidatePath(`/institutions/${input.institutionId}/parents`);
    return { success: true, data: { id: data.id as string, email, password } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function linkStudent(input: {
  institutionId: string; parentId: string; studentId: string; relationship: Relationship; isPrimary?: boolean;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("parent_student_links").insert({
      parent_id: input.parentId, student_id: input.studentId, relationship: input.relationship, is_primary: input.isPrimary ?? false,
    });
    if (error) {
      if (error.code === "23505") return { success: false, error: "This child is already linked to this parent." };
      return { success: false, error: error.message };
    }
    revalidatePath(`/institutions/${input.institutionId}/parents`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function unlinkStudent(input: { institutionId: string; linkId: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("parent_student_links").delete().eq("id", input.linkId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/parents`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
