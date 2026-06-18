"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createNotification } from "@/actions/notifications";
import { logAudit } from "@/lib/auditLog";
import {
  checkEligibility, concessionTypeForScheme,
  type ScholarshipScheme, type ScholarshipApplication, type SchemeType,
  type ScholarshipStatus, type EligibilityCriteria,
} from "@/lib/scholarships";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const SCHEME_COLS = "id, institution_id, name, scheme_type, description, eligibility_criteria, amount_per_student, renewable, application_deadline, is_active, created_at";
const APP_COLS = "id, institution_id, scheme_id, student_id, academic_year_id, application_date, documents_url, status, disbursed_amount, disbursed_at, admin_notes, created_at, scholarship_schemes(name, scheme_type, amount_per_student), students(full_name, roll_no, category)";

async function currentStudent(supabase: ReturnType<typeof createClient>): Promise<{ id: string; category: string | null; institution_id: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const sel = "id, category, institution_id";
  const { data: byProfile } = await supabase.from("students").select(sel).eq("profile_id", user.id).maybeSingle();
  if (byProfile) return { id: byProfile.id as string, category: (byProfile.category as string | null) ?? null, institution_id: byProfile.institution_id as string };
  if (user.email) {
    const { data: byEmail } = await supabase.from("students").select(sel).eq("email", user.email).maybeSingle();
    if (byEmail) return { id: byEmail.id as string, category: (byEmail.category as string | null) ?? null, institution_id: byEmail.institution_id as string };
  }
  return null;
}

// ── Schemes (admin) ──────────────────────────────────────────────────────────

export async function getSchemes(institutionId: string): Promise<Result<ScholarshipScheme[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("scholarship_schemes")
      .select(`${SCHEME_COLS}, scholarship_applications(id)`)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    const schemes = (data ?? []).map((s) => ({
      ...s,
      application_count: Array.isArray(s.scholarship_applications) ? s.scholarship_applications.length : 0,
      scholarship_applications: undefined,
    }));
    return { success: true, data: schemes as unknown as ScholarshipScheme[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getScheme(schemeId: string): Promise<Result<ScholarshipScheme>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("scholarship_schemes").select(SCHEME_COLS).eq("id", schemeId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Scheme not found." };
    return { success: true, data: data as unknown as ScholarshipScheme };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function createScheme(input: {
  institutionId: string; name: string; schemeType: SchemeType; description?: string | null;
  amountPerStudent?: number | null; renewable?: boolean; applicationDeadline?: string | null;
  eligibility?: EligibilityCriteria | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Scheme name is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("scholarship_schemes").insert({
      institution_id: input.institutionId,
      name: input.name.trim(),
      scheme_type: input.schemeType,
      description: input.description?.trim() || null,
      amount_per_student: input.amountPerStudent ?? null,
      renewable: input.renewable ?? true,
      application_deadline: input.applicationDeadline || null,
      eligibility_criteria: input.eligibility ?? null,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/scholarships`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateScheme(input: {
  institutionId: string; id: string; name?: string; schemeType?: SchemeType; description?: string | null;
  amountPerStudent?: number | null; renewable?: boolean; applicationDeadline?: string | null;
  eligibility?: EligibilityCriteria | null; isActive?: boolean;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.schemeType !== undefined) patch.scheme_type = input.schemeType;
    if (input.description !== undefined) patch.description = input.description?.trim() || null;
    if (input.amountPerStudent !== undefined) patch.amount_per_student = input.amountPerStudent;
    if (input.renewable !== undefined) patch.renewable = input.renewable;
    if (input.applicationDeadline !== undefined) patch.application_deadline = input.applicationDeadline || null;
    if (input.eligibility !== undefined) patch.eligibility_criteria = input.eligibility;
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    const { error } = await supabase.from("scholarship_schemes").update(patch).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/scholarships`);
    revalidatePath(`/institutions/${input.institutionId}/scholarships/${input.id}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteScheme(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("scholarship_schemes").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/scholarships`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Applications (admin) ─────────────────────────────────────────────────────

export async function getApplications(institutionId: string): Promise<Result<ScholarshipApplication[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("scholarship_applications")
      .select(APP_COLS)
      .eq("institution_id", institutionId)
      .order("application_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as ScholarshipApplication[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getSchemeApplications(schemeId: string): Promise<Result<ScholarshipApplication[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("scholarship_applications")
      .select(APP_COLS)
      .eq("scheme_id", schemeId)
      .order("application_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as ScholarshipApplication[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

async function notifyStudent(
  supabase: ReturnType<typeof createClient>,
  institutionId: string, studentId: string, title: string, body: string
) {
  try {
    const { data: student } = await supabase.from("students").select("profile_id").eq("id", studentId).maybeSingle();
    const profileId = student?.profile_id as string | null;
    if (profileId) {
      await createNotification({
        institutionId, recipientId: profileId, type: "scholarship",
        title, body, data: { href: "/student-portal/scholarships" },
      });
    }
  } catch { /* notification failure must not break the action */ }
}

/** Verify / approve / reject — simple status transitions with optional notes. */
export async function updateApplicationStatus(input: {
  institutionId: string; schemeId: string; applicationId: string;
  status: Extract<ScholarshipStatus, "verified" | "approved" | "rejected">;
  notes?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { status: input.status };
    if (input.notes !== undefined) patch.admin_notes = input.notes?.trim() || null;
    const { data: app, error } = await supabase
      .from("scholarship_applications")
      .update(patch).eq("id", input.applicationId)
      .select("student_id, scholarship_schemes(name)")
      .single();
    if (error) return { success: false, error: error.message };

    const schemeName = (app.scholarship_schemes as unknown as { name: string } | null)?.name ?? "scholarship";
    if (input.status === "approved") {
      await notifyStudent(supabase, input.institutionId, app.student_id as string,
        "Scholarship approved", `Your application for ${schemeName} has been approved.`);
    } else if (input.status === "rejected") {
      await notifyStudent(supabase, input.institutionId, app.student_id as string,
        "Scholarship update", `Your application for ${schemeName} was not approved.`);
    }

    revalidatePath(`/institutions/${input.institutionId}/scholarships/${input.schemeId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Disburse a scholarship: marks the application disbursed AND creates an approved
 * fee_concession so the amount is deducted from the student's fee dues.
 */
export async function disburseScholarship(input: {
  institutionId: string; schemeId: string; applicationId: string; amount: number;
}): Promise<Result<null>> {
  try {
    if (!input.amount || input.amount <= 0) return { success: false, error: "Enter a valid disbursement amount." };
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: app, error: appErr } = await supabase
      .from("scholarship_applications")
      .select("id, student_id, academic_year_id, status, scholarship_schemes(name, scheme_type)")
      .eq("id", input.applicationId).maybeSingle();
    if (appErr) return { success: false, error: appErr.message };
    if (!app) return { success: false, error: "Application not found." };
    if (app.status === "disbursed") return { success: false, error: "This scholarship has already been disbursed." };
    if (app.status !== "approved") return { success: false, error: "Only approved applications can be disbursed." };

    const scheme = app.scholarship_schemes as unknown as { name: string; scheme_type: SchemeType } | null;

    // 1) Mark disbursed.
    const { error: updErr } = await supabase
      .from("scholarship_applications")
      .update({ status: "disbursed", disbursed_amount: input.amount, disbursed_at: new Date().toISOString() })
      .eq("id", input.applicationId);
    if (updErr) return { success: false, error: updErr.message };

    // 2) Fee integration — approved concession reduces the student's dues.
    const { data: concession, error: concErr } = await supabase
      .from("fee_concessions")
      .insert({
        institution_id: input.institutionId,
        student_id: app.student_id,
        academic_year_id: app.academic_year_id,
        concession_type: concessionTypeForScheme(scheme?.scheme_type ?? "institutional"),
        amount: input.amount,
        percentage: null,
        applicable_to: null,
        reason: `Scholarship: ${scheme?.name ?? "Awarded scholarship"}`,
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .select("id").single();
    if (concErr) return { success: false, error: `Disbursed, but fee adjustment failed: ${concErr.message}` };

    // Dev Rule 13 — fee_concessions mutations must be audited.
    await logAudit({
      institutionId: input.institutionId,
      performedBy: user.id,
      tableName: "fee_concessions",
      recordId: concession.id as string,
      action: "INSERT",
      afterData: { student_id: app.student_id, amount: input.amount, source: "scholarship", application_id: input.applicationId, status: "approved" },
      notes: `Scholarship disbursed → fee concession (${scheme?.name ?? "scholarship"})`,
    });

    await notifyStudent(supabase, input.institutionId, app.student_id as string,
      "Scholarship disbursed", `₹${input.amount.toLocaleString("en-IN")} from ${scheme?.name ?? "your scholarship"} has been adjusted against your fees.`);

    revalidatePath(`/institutions/${input.institutionId}/scholarships/${input.schemeId}`);
    revalidatePath(`/institutions/${input.institutionId}/finance/concessions`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student-facing ───────────────────────────────────────────────────────────

export type StudentSchemeView = ScholarshipScheme & {
  myStatus: ScholarshipStatus | null;
  eligible: boolean;
  reasons: string[];
  deadlinePassed: boolean;
};

export async function getAvailableSchemes(institutionId: string): Promise<Result<StudentSchemeView[]>> {
  try {
    const supabase = createClient(await cookies());
    const student = await currentStudent(supabase);

    const { data, error } = await supabase
      .from("scholarship_schemes")
      .select(SCHEME_COLS)
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };

    let myApps: { scheme_id: string; status: ScholarshipStatus }[] = [];
    if (student) {
      const { data: apps } = await supabase
        .from("scholarship_applications")
        .select("scheme_id, status")
        .eq("student_id", student.id);
      myApps = (apps ?? []) as { scheme_id: string; status: ScholarshipStatus }[];
    }
    const appMap = new Map(myApps.map((a) => [a.scheme_id, a.status]));
    const today = new Date().toISOString().slice(0, 10);

    const views: StudentSchemeView[] = (data ?? []).map((d) => {
      const scheme = d as unknown as ScholarshipScheme;
      const elig = checkEligibility(scheme.eligibility_criteria, { category: student?.category ?? null });
      const deadlinePassed = !!scheme.application_deadline && scheme.application_deadline < today;
      return { ...scheme, myStatus: appMap.get(scheme.id) ?? null, eligible: elig.eligible, reasons: elig.reasons, deadlinePassed };
    });
    return { success: true, data: views };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function applyForScholarship(input: {
  schemeId: string; academicYearId?: string | null; documents?: { name: string; url: string }[] | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const student = await currentStudent(supabase);
    if (!student) return { success: false, error: "Only students can apply for scholarships." };

    const { data: scheme } = await supabase
      .from("scholarship_schemes")
      .select("id, institution_id, is_active, eligibility_criteria, application_deadline")
      .eq("id", input.schemeId).maybeSingle();
    if (!scheme || !scheme.is_active) return { success: false, error: "This scheme is not open for applications." };

    const today = new Date().toISOString().slice(0, 10);
    if (scheme.application_deadline && (scheme.application_deadline as string) < today) {
      return { success: false, error: "The application deadline for this scheme has passed." };
    }

    const elig = checkEligibility(scheme.eligibility_criteria as EligibilityCriteria | null, { category: student.category });
    if (!elig.eligible) return { success: false, error: elig.reasons.join("; ") };

    const { error } = await supabase.from("scholarship_applications").insert({
      institution_id: scheme.institution_id,
      scheme_id: input.schemeId,
      student_id: student.id,
      academic_year_id: input.academicYearId || null,
      documents_url: input.documents ?? null,
      status: "applied",
    });
    if (error) {
      if (error.code === "23505") return { success: false, error: "You have already applied for this scheme." };
      return { success: false, error: error.message };
    }
    revalidatePath("/student-portal/scholarships");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getMyScholarshipApplications(): Promise<Result<ScholarshipApplication[]>> {
  try {
    const supabase = createClient(await cookies());
    const student = await currentStudent(supabase);
    if (!student) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("scholarship_applications")
      .select(APP_COLS)
      .eq("student_id", student.id)
      .order("application_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as ScholarshipApplication[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
