"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  CERTIFICATE_PREFIX, formatCertificateNo, requesterOf,
  type CertificateType, type CertStatus, type CertContext,
} from "@/lib/certificates";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function db() {
  return createClient(await cookies());
}

export type CertRequestRow = {
  id: string;
  requesterType: "student" | "staff";
  certificateType: CertificateType;
  holderName: string;
  holderRef: string | null;       // roll no / employee id
  purpose: string | null;
  status: CertStatus;
  remarks: string | null;
  certificateNo: string | null;
  issuedAt: string | null;
  createdAt: string;
};

function mapRow(r: Record<string, unknown>): CertRequestRow {
  const student = r.students as { full_name: string; roll_no: string | null } | null;
  const staff = r.staff as { full_name: string; employee_id: string | null } | null;
  const requesterType = r.requester_type as "student" | "staff";
  return {
    id: r.id as string,
    requesterType,
    certificateType: r.certificate_type as CertificateType,
    holderName: (requesterType === "student" ? student?.full_name : staff?.full_name) ?? "—",
    holderRef: (requesterType === "student" ? student?.roll_no : staff?.employee_id) ?? null,
    purpose: (r.purpose as string | null) ?? null,
    status: r.status as CertStatus,
    remarks: (r.remarks as string | null) ?? null,
    certificateNo: (r.certificate_no as string | null) ?? null,
    issuedAt: (r.issued_at as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

const SELECT = "id, requester_type, certificate_type, purpose, status, remarks, certificate_no, issued_at, created_at, students(full_name, roll_no), staff(full_name, employee_id)";

// ── Admin: list & lifecycle ───────────────────────────────────────────────────

export async function getCertificateRequests(institutionId: string): Promise<Result<CertRequestRow[]>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("certificate_requests")
      .select(SELECT)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function approveCertificate(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("certificate_requests")
      .update({ status: "approved", reviewed_by: user?.id ?? null, remarks: null })
      .eq("id", input.id).eq("status", "requested");
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/certificates`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function rejectCertificate(input: { institutionId: string; id: string; remarks: string }): Promise<Result<null>> {
  try {
    if (!input.remarks.trim()) return { success: false, error: "Please give a reason for rejection." };
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("certificate_requests")
      .update({ status: "rejected", reviewed_by: user?.id ?? null, remarks: input.remarks.trim() })
      .eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/certificates`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Assign a unique number and mark the request issued. */
export async function issueCertificate(input: { institutionId: string; id: string }): Promise<Result<{ certificateNo: string }>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: row, error: rErr } = await supabase
      .from("certificate_requests").select("certificate_type, status, certificate_no")
      .eq("id", input.id).maybeSingle();
    if (rErr) return { success: false, error: rErr.message };
    if (!row) return { success: false, error: "Request not found." };
    if (row.status === "rejected") return { success: false, error: "A rejected request cannot be issued." };
    if (row.certificate_no) {
      // already issued — idempotent
      await supabase.from("certificate_requests").update({ status: "issued" }).eq("id", input.id);
      return { success: true, data: { certificateNo: row.certificate_no as string } };
    }

    const type = row.certificate_type as CertificateType;
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("certificate_requests").select("id", { count: "exact", head: true })
      .eq("institution_id", input.institutionId).eq("certificate_type", type).eq("status", "issued");
    const certificateNo = formatCertificateNo(CERTIFICATE_PREFIX[type], year, (count ?? 0) + 1);

    const { error } = await supabase.from("certificate_requests")
      .update({ status: "issued", certificate_no: certificateNo, issued_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
      .eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/certificates`);
    return { success: true, data: { certificateNo } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Admin issues a staff document directly (no student-style request flow). */
export async function issueStaffCertificate(input: {
  institutionId: string; staffId: string; certificateType: CertificateType; purpose?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (requesterOf(input.certificateType) !== "staff") return { success: false, error: "Not a staff certificate type." };
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();

    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("certificate_requests").select("id", { count: "exact", head: true })
      .eq("institution_id", input.institutionId).eq("certificate_type", input.certificateType).eq("status", "issued");
    const certificateNo = formatCertificateNo(CERTIFICATE_PREFIX[input.certificateType], year, (count ?? 0) + 1);

    const { data, error } = await supabase.from("certificate_requests").insert({
      institution_id: input.institutionId,
      requester_type: "staff",
      staff_id: input.staffId,
      certificate_type: input.certificateType,
      purpose: input.purpose?.trim() || null,
      status: "issued",
      certificate_no: certificateNo,
      issued_at: new Date().toISOString(),
      requested_by: user?.id ?? null,
      reviewed_by: user?.id ?? null,
    }).select("id").single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/certificates`);
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteCertificateRequest(input: { institutionId: string; id: string }): Promise<Result<null>> {
  try {
    const supabase = await db();
    const { error } = await supabase.from("certificate_requests").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/certificates`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student portal ────────────────────────────────────────────────────────────

export async function getStudentCertificates(): Promise<Result<CertRequestRow[]>> {
  try {
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };
    const { data, error } = await supabase
      .from("certificate_requests").select(SELECT)
      .eq("requester_type", "student")
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function requestCertificate(input: {
  certificateType: CertificateType; purpose?: string | null;
}): Promise<Result<null>> {
  try {
    if (requesterOf(input.certificateType) !== "student") return { success: false, error: "Not a student certificate type." };
    const supabase = await db();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase
      .from("students").select("id, institution_id").eq("email", user.email).maybeSingle();
    if (!student) return { success: false, error: "No student profile found for this account." };

    const { error } = await supabase.from("certificate_requests").insert({
      institution_id: student.institution_id as string,
      requester_type: "student",
      student_id: student.id as string,
      certificate_type: input.certificateType,
      purpose: input.purpose?.trim() || null,
      status: "requested",
      requested_by: user.id,
    });
    if (error) return { success: false, error: error.message };
    revalidatePath("/student-portal/certificates");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Printable document context (admin or the owning student via RLS) ───────────

export type CertPrintData = {
  certificateType: CertificateType;
  certificateNo: string | null;
  status: CertStatus;
  issuedAt: string | null;
  context: CertContext;
};

export async function getCertificateForPrint(id: string): Promise<Result<CertPrintData>> {
  try {
    const supabase = await db();
    const { data, error } = await supabase
      .from("certificate_requests")
      .select("certificate_type, status, certificate_no, issued_at, purpose, requester_type, institution_id, students(full_name, roll_no, student_program, student_year, departments(name)), staff(full_name, employee_id, designation, qualification, joining_date), institutions(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Certificate not found or not accessible." };

    const inst = data.institutions as unknown as { name: string } | null;
    const student = data.students as unknown as { full_name: string; roll_no: string | null; student_program: string | null; student_year: number | null; departments: { name: string } | null } | null;
    const staff = data.staff as unknown as { full_name: string; employee_id: string | null; designation: string | null; qualification: string | null; joining_date: string | null } | null;
    const requesterType = data.requester_type as "student" | "staff";

    const context: CertContext = {
      holderName: (requesterType === "student" ? student?.full_name : staff?.full_name) ?? "—",
      institution: inst?.name ?? "—",
      purpose: (data.purpose as string | null) ?? null,
      issuedDate: (data.issued_at as string | null)?.slice(0, 10) ?? null,
      ...(requesterType === "student"
        ? {
            rollNo: student?.roll_no ?? null,
            program: student?.student_program ?? null,
            year: student?.student_year ?? null,
            department: student?.departments?.name ?? null,
          }
        : {
            designation: staff?.designation ?? null,
            employeeId: staff?.employee_id ?? null,
            qualification: staff?.qualification ?? null,
            joiningDate: staff?.joining_date ?? null,
          }),
    };

    return {
      success: true,
      data: {
        certificateType: data.certificate_type as CertificateType,
        certificateNo: (data.certificate_no as string | null) ?? null,
        status: data.status as CertStatus,
        issuedAt: (data.issued_at as string | null) ?? null,
        context,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
