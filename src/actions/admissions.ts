"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { logAudit } from "@/lib/auditLog";
import { generateRollNo, isValidEmail, type Admission, type AdmissionStatus } from "@/lib/admissions";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const ADM_COLS =
  "id, institution_id, applicant_name, applicant_email, applicant_phone, program_applied, department_id, dob, address, previous_school, marks_percentage, documents_url, status, admin_notes, applied_at, updated_at, departments!department_id(name)";

// ── Public (no auth) ──────────────────────────────────────────────────────────

export type PublicInstitution = { id: string; name: string; slug: string; departments: { id: string; name: string }[] };

/** Resolve an institution + its departments for the public apply page.
 *  Uses the service-role client so anonymous visitors can read this public data
 *  without broad RLS exposure on institutions/departments. */
export async function getPublicInstitution(slug: string): Promise<Result<PublicInstitution>> {
  try {
    const admin = createAdminClient();
    const { data: inst, error } = await admin.from("institutions").select("id, name, slug").eq("slug", slug).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!inst) return { success: false, error: "Institution not found." };
    const { data: depts } = await admin.from("departments").select("id, name").eq("institution_id", inst.id as string).order("name");
    return {
      success: true,
      data: { id: inst.id as string, name: inst.name as string, slug: inst.slug as string, departments: (depts ?? []).map((d) => ({ id: d.id as string, name: d.name as string })) },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type ApplicationInput = {
  institutionId: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string | null;
  program_applied: "UG" | "PG";
  department_id?: string | null;
  dob?: string | null;
  address?: string | null;
  previous_school?: string | null;
  marks_percentage?: number | null;
  documents_url?: { name: string; url: string }[] | null;
};

/** Public application submission (anonymous). RLS allows the insert only with
 *  status='applied'; everything else is admin-controlled. */
export async function submitApplication(input: ApplicationInput): Promise<Result<{ id: string }>> {
  try {
    if (!input.applicant_name.trim()) return { success: false, error: "Your name is required." };
    if (!isValidEmail(input.applicant_email)) return { success: false, error: "Enter a valid email." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("admissions")
      .insert({
        institution_id: input.institutionId,
        applicant_name: input.applicant_name.trim(),
        applicant_email: input.applicant_email.trim().toLowerCase(),
        applicant_phone: input.applicant_phone?.trim() || null,
        program_applied: input.program_applied,
        department_id: input.department_id || null,
        dob: input.dob || null,
        address: input.address?.trim() || null,
        previous_school: input.previous_school?.trim() || null,
        marks_percentage: input.marks_percentage ?? null,
        documents_url: input.documents_url ?? null,
        status: "applied",
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type StatusCheckResult = { applicant_name: string; program_applied: string; status: AdmissionStatus; applied_at: string };

/** Applicant self status-check by email + DOB (service-role validated lookup). */
export async function checkApplicationStatus(slug: string, email: string, dob: string): Promise<Result<StatusCheckResult[]>> {
  try {
    if (!isValidEmail(email) || !dob) return { success: false, error: "Enter the email and date of birth you applied with." };
    const admin = createAdminClient();
    const { data: inst } = await admin.from("institutions").select("id").eq("slug", slug).maybeSingle();
    if (!inst) return { success: false, error: "Institution not found." };
    const { data, error } = await admin
      .from("admissions")
      .select("applicant_name, program_applied, status, applied_at")
      .eq("institution_id", inst.id as string)
      .eq("applicant_email", email.trim().toLowerCase())
      .eq("dob", dob)
      .order("applied_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StatusCheckResult[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getApplications(institutionId: string): Promise<Result<Admission[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("admissions").select(ADM_COLS).eq("institution_id", institutionId).order("applied_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Admission[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getApplication(applicationId: string): Promise<Result<Admission>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("admissions").select(ADM_COLS).eq("id", applicationId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Application not found." };
    return { success: true, data: data as unknown as Admission };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateApplicationStatus(input: {
  institutionId: string; applicationId: string; status: AdmissionStatus; notes?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { status: input.status, updated_at: new Date().toISOString() };
    if (input.notes !== undefined) patch.admin_notes = input.notes?.trim() || null;
    const { error } = await supabase.from("admissions").update(patch).eq("id", input.applicationId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/admissions`);
    revalidatePath(`/institutions/${input.institutionId}/admissions/${input.applicationId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Enroll an admitted applicant: creates an auth account + profile + student
 * record, then marks the application `enrolled`. Returns the login + temp
 * password for the admin to share.
 */
export async function enrollStudent(input: {
  institutionId: string; applicationId: string; studentYear?: number;
}): Promise<Result<{ email: string; password: string; rollNo: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: app, error: appErr } = await supabase.from("admissions").select("*").eq("id", input.applicationId).maybeSingle();
    if (appErr) return { success: false, error: appErr.message };
    if (!app) return { success: false, error: "Application not found." };
    if (app.status === "enrolled") return { success: false, error: "This applicant is already enrolled." };
    if (app.status !== "admitted") return { success: false, error: "Only admitted applicants can be enrolled." };

    const admin = createAdminClient();
    const email = (app.applicant_email as string).trim().toLowerCase();

    // guard against a clashing existing account
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (list?.users?.some((u) => u.email === email)) {
      return { success: false, error: `An account already exists for ${email}.` };
    }

    const password = `Aura@${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: app.applicant_name },
    });
    if (cErr || !created?.user) return { success: false, error: cErr?.message ?? "Could not create the login." };
    const uid = created.user.id;

    const program = app.program_applied as "UG" | "PG";
    const year = new Date().getFullYear();
    const { count } = await admin.from("students").select("id", { count: "exact", head: true }).eq("institution_id", input.institutionId);
    const rollNo = generateRollNo(program, year, (count ?? 0) + 1);
    const studentYear = input.studentYear ?? 1;

    // profile (role STUDENT) + student record, both keyed to the auth user id
    const { error: pErr } = await admin.from("profiles").insert({
      id: uid, full_name: app.applicant_name, email, role: "STUDENT",
      tenant_id: input.institutionId, department_id: app.department_id ?? null,
      student_program: program, student_year: studentYear,
    });
    if (pErr) { await admin.auth.admin.deleteUser(uid); return { success: false, error: `Profile creation failed: ${pErr.message}` }; }

    const { error: sErr } = await admin.from("students").insert({
      institution_id: input.institutionId, full_name: app.applicant_name, email,
      roll_no: rollNo, programme: program, student_year: studentYear,
      department_id: app.department_id ?? null, profile_id: uid,
    });
    if (sErr) { await admin.auth.admin.deleteUser(uid); return { success: false, error: `Student record failed: ${sErr.message}` }; }

    await supabase.from("admissions").update({ status: "enrolled", updated_at: new Date().toISOString() }).eq("id", input.applicationId);

    await logAudit({
      institutionId: input.institutionId, performedBy: user.id, tableName: "students",
      recordId: uid, action: "INSERT",
      afterData: { from_admission: input.applicationId, roll_no: rollNo, email },
      notes: "Student enrolled from admission",
    });

    revalidatePath(`/institutions/${input.institutionId}/admissions`);
    return { success: true, data: { email, password, rollNo } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
