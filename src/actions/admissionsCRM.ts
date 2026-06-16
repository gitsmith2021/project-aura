"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import {
  type Enquiry, type EnquiryStatus, type EnquirySource, type ProgramInterest,
} from "@/lib/admissionsCRM";
import { type Admission } from "@/lib/admissions";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const ENQ_COLS =
  "id, institution_id, name, phone, email, program_interest, department_id, source, enquiry_date, follow_up_date, status, notes, converted_admission_id, created_at, updated_at, departments!department_id(name)";

// ── Queries ─────────────────────────────────────────────────────────────────────

export async function getEnquiries(institutionId: string): Promise<Result<Enquiry[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("admission_enquiries")
      .select(ENQ_COLS)
      .eq("institution_id", institutionId)
      .order("enquiry_date", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Enquiry[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Admitted/applied/admissions rows for the merit list generator. */
export async function getMeritList(institutionId: string): Promise<Result<Admission[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("admissions")
      .select(
        "id, institution_id, applicant_name, applicant_email, applicant_phone, program_applied, department_id, dob, address, previous_school, marks_percentage, documents_url, status, admin_notes, applied_at, updated_at, departments!department_id(name)",
      )
      .eq("institution_id", institutionId)
      .in("status", ["applied", "shortlisted", "interview", "admitted", "enrolled"])
      .order("marks_percentage", { ascending: false, nullsFirst: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as Admission[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Mutations ───────────────────────────────────────────────────────────────────

export type EnquiryInput = {
  institutionId: string;
  name: string;
  phone: string;
  email?: string | null;
  program_interest: ProgramInterest;
  department_id?: string | null;
  source: EnquirySource;
  follow_up_date?: string | null;
  notes?: string | null;
};

export async function createEnquiry(input: EnquiryInput): Promise<Result<{ id: string }>> {
  try {
    if (!input.name.trim()) return { success: false, error: "Name is required." };
    if (!input.phone.trim()) return { success: false, error: "Phone number is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("admission_enquiries")
      .insert({
        institution_id: input.institutionId,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim().toLowerCase() || null,
        program_interest: input.program_interest,
        department_id: input.department_id || null,
        source: input.source,
        follow_up_date: input.follow_up_date || null,
        notes: input.notes?.trim() || null,
        status: "new",
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/admissions/crm`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateEnquiry(input: {
  institutionId: string;
  enquiryId: string;
  patch: Partial<{
    name: string; phone: string; email: string | null; program_interest: ProgramInterest;
    department_id: string | null; source: EnquirySource; follow_up_date: string | null; notes: string | null;
  }>;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const p = input.patch;
    if (p.name !== undefined) patch.name = p.name.trim();
    if (p.phone !== undefined) patch.phone = p.phone.trim();
    if (p.email !== undefined) patch.email = p.email?.trim().toLowerCase() || null;
    if (p.program_interest !== undefined) patch.program_interest = p.program_interest;
    if (p.department_id !== undefined) patch.department_id = p.department_id || null;
    if (p.source !== undefined) patch.source = p.source;
    if (p.follow_up_date !== undefined) patch.follow_up_date = p.follow_up_date || null;
    if (p.notes !== undefined) patch.notes = p.notes?.trim() || null;
    const { error } = await supabase.from("admission_enquiries").update(patch).eq("id", input.enquiryId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/admissions/crm`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateEnquiryStatus(input: {
  institutionId: string; enquiryId: string; status: EnquiryStatus;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("admission_enquiries")
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", input.enquiryId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/admissions/crm`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function scheduleFollowUp(input: {
  institutionId: string; enquiryId: string; followUpDate: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("admission_enquiries")
      .update({ follow_up_date: input.followUpDate || null, updated_at: new Date().toISOString() })
      .eq("id", input.enquiryId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/admissions/crm`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/**
 * Convert an enquiry into a formal application: inserts an `admissions` row
 * (status 'applied'), links it back to the enquiry, and marks the enquiry
 * 'applied'. Diploma/Certificate interests map to UG for the application form.
 */
export async function convertEnquiryToApplication(input: {
  institutionId: string; enquiryId: string;
}): Promise<Result<{ applicationId: string }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: enq, error: eErr } = await supabase
      .from("admission_enquiries").select("*").eq("id", input.enquiryId).maybeSingle();
    if (eErr) return { success: false, error: eErr.message };
    if (!enq) return { success: false, error: "Enquiry not found." };
    if (enq.converted_admission_id) return { success: false, error: "This enquiry is already converted." };

    const program: "UG" | "PG" = enq.program_interest === "PG" ? "PG" : "UG";

    const { data: app, error: aErr } = await supabase
      .from("admissions")
      .insert({
        institution_id: input.institutionId,
        applicant_name: enq.name,
        applicant_email: enq.email || `${(enq.phone as string).replace(/\D/g, "")}@enquiry.local`,
        applicant_phone: enq.phone,
        program_applied: program,
        department_id: enq.department_id ?? null,
        status: "applied",
        admin_notes: enq.notes ? `From enquiry: ${enq.notes}` : "Converted from CRM enquiry",
      })
      .select("id")
      .single();
    if (aErr) return { success: false, error: aErr.message };

    await supabase
      .from("admission_enquiries")
      .update({ status: "applied", converted_admission_id: app.id, updated_at: new Date().toISOString() })
      .eq("id", input.enquiryId);

    await logAudit({
      institutionId: input.institutionId, performedBy: user.id, tableName: "admissions",
      recordId: app.id as string, action: "INSERT",
      afterData: { from_enquiry: input.enquiryId },
      notes: "Application created from CRM enquiry",
    });

    revalidatePath(`/institutions/${input.institutionId}/admissions/crm`);
    revalidatePath(`/institutions/${input.institutionId}/admissions`);
    return { success: true, data: { applicationId: app.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteEnquiry(input: { institutionId: string; enquiryId: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("admission_enquiries").delete().eq("id", input.enquiryId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/admissions/crm`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
