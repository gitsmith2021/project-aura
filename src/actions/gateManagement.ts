"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { VisitorLog, StudentOutpass } from "@/lib/gate";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const VISITOR_COLS = "id, institution_id, visitor_name, visitor_phone, id_proof_type, id_proof_number, purpose, meeting_with, vehicle_number, check_in_time, check_out_time, status, created_at";
const OUTPASS_COLS = "id, institution_id, student_id, hostel_id, reason, destination, out_time, expected_return, actual_return, approved_by, status, created_at, students(full_name, roll_no), hostels(name)";

// ── Visitors ──────────────────────────────────────────────────────────────────
export async function getVisitors(
  institutionId: string,
  opts?: { activeOnly?: boolean; limit?: number }
): Promise<Result<VisitorLog[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("visitor_log").select(VISITOR_COLS).eq("institution_id", institutionId);
    if (opts?.activeOnly) q = q.eq("status", "checked_in");
    const { data, error } = await q.order("check_in_time", { ascending: false }).limit(opts?.limit ?? 200);
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as VisitorLog[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type VisitorInput = {
  institution_id: string;
  visitor_name: string;
  purpose: string;
  visitor_phone?: string | null;
  id_proof_type?: string | null;
  id_proof_number?: string | null;
  vehicle_number?: string | null;
};

export async function logVisitor(input: VisitorInput): Promise<Result<VisitorLog>> {
  try {
    if (!input.visitor_name.trim()) return { success: false, error: "Visitor name is required." };
    if (!input.purpose.trim()) return { success: false, error: "Purpose is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("visitor_log")
      .insert({
        institution_id: input.institution_id,
        visitor_name: input.visitor_name.trim(),
        purpose: input.purpose.trim(),
        visitor_phone: input.visitor_phone?.trim() || null,
        id_proof_type: input.id_proof_type || null,
        id_proof_number: input.id_proof_number?.trim() || null,
        vehicle_number: input.vehicle_number?.trim() || null,
        status: "checked_in",
      })
      .select(VISITOR_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institution_id}/gate`);
    revalidatePath(`/institutions/${input.institution_id}/gate/visitors`);
    return { success: true, data: data as unknown as VisitorLog };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function checkOutVisitor(institutionId: string, visitorId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("visitor_log")
      .update({ status: "checked_out", check_out_time: new Date().toISOString() })
      .eq("id", visitorId).eq("status", "checked_in");
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/gate`);
    revalidatePath(`/institutions/${institutionId}/gate/visitors`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Outpasses (admin / warden side) ───────────────────────────────────────────
export async function getOutpasses(
  institutionId: string,
  opts?: { status?: string; pendingOnly?: boolean }
): Promise<Result<StudentOutpass[]>> {
  try {
    const supabase = createClient(await cookies());
    let q = supabase.from("student_outpasses").select(OUTPASS_COLS).eq("institution_id", institutionId);
    if (opts?.pendingOnly) q = q.eq("status", "pending");
    else if (opts?.status) q = q.eq("status", opts.status);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StudentOutpass[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Resolve the current user's staff id (for approved_by stamping). */
async function currentStaffId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("staff").select("id").eq("profile_id", user.id).maybeSingle();
  return (data?.id as string) ?? null;
}

export async function approveOutpass(institutionId: string, outpassId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const staffId = await currentStaffId(supabase);
    const { error } = await supabase
      .from("student_outpasses")
      .update({ status: "approved", approved_by: staffId })
      .eq("id", outpassId).eq("status", "pending");
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/gate`);
    revalidatePath(`/institutions/${institutionId}/gate/outpasses`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function rejectOutpass(institutionId: string, outpassId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const staffId = await currentStaffId(supabase);
    const { error } = await supabase
      .from("student_outpasses")
      .update({ status: "rejected", approved_by: staffId })
      .eq("id", outpassId).eq("status", "pending");
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/gate/outpasses`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Mark a student returned to campus (security desk, on re-entry). */
export async function markOutpassReturned(institutionId: string, outpassId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("student_outpasses")
      .update({ status: "returned", actual_return: new Date().toISOString() })
      .eq("id", outpassId).in("status", ["approved", "overdue"]);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/gate`);
    revalidatePath(`/institutions/${institutionId}/gate/outpasses`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Student portal: apply + track ─────────────────────────────────────────────
export type OutpassRequestInput = {
  institutionId: string;
  reason: string;
  destination: string;
  outTime: string;        // ISO
  expectedReturn: string; // ISO
};

export async function requestOutpass(input: OutpassRequestInput): Promise<Result<StudentOutpass>> {
  try {
    if (!input.reason.trim() || !input.destination.trim()) return { success: false, error: "Reason and destination are required." };
    if (new Date(input.expectedReturn).getTime() <= new Date(input.outTime).getTime()) {
      return { success: false, error: "Expected return must be after the out time." };
    }
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: student } = await supabase.from("students").select("id").eq("profile_id", user.id).maybeSingle();
    if (!student) return { success: false, error: "No student profile found." };

    // auto-link the student's active hostel, if any
    const { data: alloc } = await supabase
      .from("hostel_allocations").select("hostel_id").eq("student_id", student.id as string).eq("status", "active").maybeSingle();

    const { data, error } = await supabase
      .from("student_outpasses")
      .insert({
        institution_id: input.institutionId,
        student_id: student.id as string,
        hostel_id: (alloc?.hostel_id as string) ?? null,
        reason: input.reason.trim(),
        destination: input.destination.trim(),
        out_time: input.outTime,
        expected_return: input.expectedReturn,
        status: "pending",
      })
      .select(OUTPASS_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(`/student-portal/outpass`);
    return { success: true, data: data as unknown as StudentOutpass };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getMyOutpasses(): Promise<Result<StudentOutpass[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase.from("students").select("id, institution_id").eq("profile_id", user.id).maybeSingle();
    if (!student) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("student_outpasses").select(OUTPASS_COLS).eq("student_id", student.id as string).order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StudentOutpass[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** The current student's institution id (for the apply form). */
export async function getMyInstitutionId(): Promise<Result<string | null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data } = await supabase.from("students").select("institution_id").eq("profile_id", user.id).maybeSingle();
    return { success: true, data: (data?.institution_id as string) ?? null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Staff/warden portal: outpasses for hostels I warden ───────────────────────
export async function getWardenOutpasses(opts?: { pendingOnly?: boolean }): Promise<Result<StudentOutpass[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };

    const { data: staffRows } = await supabase.from("staff").select("id").eq("profile_id", user.id);
    const staffIds = (staffRows ?? []).map((s) => s.id as string);
    if (staffIds.length === 0) return { success: true, data: [] };

    const { data: hostels } = await supabase.from("hostels").select("id").in("warden_id", staffIds);
    const hostelIds = (hostels ?? []).map((h) => h.id as string);
    if (hostelIds.length === 0) return { success: true, data: [] };

    let q = supabase.from("student_outpasses").select(OUTPASS_COLS).in("hostel_id", hostelIds);
    if (opts?.pendingOnly) q = q.eq("status", "pending");
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StudentOutpass[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
