"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import {
  serviceYears, isOffboardingEvent, CAREER_EVENT_LABELS,
  type CareerEventType, type StaffCareerEvent,
} from "@/lib/staffCareer";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const CAREER_COLS =
  "*, staff!inner(full_name, designation, department_id, is_active, departments!department_id(name))";

async function getSupabase() {
  return createClient(await cookies());
}

async function currentStaffId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: byProfile } = await supabase.from("staff").select("id").eq("profile_id", user.id).maybeSingle();
  if (byProfile) return byProfile.id as string;
  if (user.email) {
    const { data: byEmail } = await supabase.from("staff").select("id").eq("email", user.email).maybeSingle();
    if (byEmail) return byEmail.id as string;
  }
  return null;
}

function revalidateCareer(institutionId: string, staffId?: string) {
  revalidatePath(`/institutions/${institutionId}/staff/career`);
  if (staffId) revalidatePath(`/institutions/${institutionId}/staff/career/${staffId}`);
  revalidatePath("/staff-portal/career");
}

// ── getCareerEvents (admin log — all staff, filterable) ───────────────────────

export async function getCareerEvents(
  institutionId: string,
  filters?: { eventType?: CareerEventType; departmentId?: string; from?: string; to?: string }
): Promise<Result<StaffCareerEvent[]>> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    let query = supabase
      .from("staff_career_events")
      .select(CAREER_COLS)
      .eq("institution_id", institutionId)
      .order("effective_date", { ascending: false });

    if (filters?.eventType)    query = query.eq("event_type", filters.eventType);
    if (filters?.departmentId) query = query.eq("staff.department_id", filters.departmentId);
    if (filters?.from)         query = query.gte("effective_date", filters.from);
    if (filters?.to)           query = query.lte("effective_date", filters.to);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StaffCareerEvent[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getCareerTimeline (single staff member, admin/HOD view) ──────────────────

export async function getCareerTimeline(staffId: string): Promise<Result<StaffCareerEvent[]>> {
  if (!staffId) return { success: false, error: "Staff ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("staff_career_events")
      .select(CAREER_COLS)
      .eq("staff_id", staffId)
      .order("effective_date", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StaffCareerEvent[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getMyCareerTimeline (staff-portal self-service, read-only) ───────────────

export type MyCareerTimeline = {
  events: StaffCareerEvent[];
  joiningDate: string | null;
  designation: string | null;
  departmentName: string | null;
};

export async function getMyCareerTimeline(): Promise<Result<MyCareerTimeline>> {
  try {
    const supabase = await getSupabase();
    const staffId = await currentStaffId(supabase);
    if (!staffId) return { success: false, error: "Staff record not found." };

    const { data: staffRow } = await supabase
      .from("staff")
      .select("joining_date, designation, departments!department_id(name)")
      .eq("id", staffId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("staff_career_events")
      .select("*")
      .eq("staff_id", staffId)
      .order("effective_date", { ascending: true });
    if (error) return { success: false, error: error.message };

    const depts = (staffRow as unknown as { departments?: { name: string } | null } | null)?.departments;

    return {
      success: true,
      data: {
        events: (data ?? []) as unknown as StaffCareerEvent[],
        joiningDate: (staffRow?.joining_date as string | undefined) ?? null,
        designation: (staffRow?.designation as string | undefined) ?? null,
        departmentName: depts?.name ?? null,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── recordCareerEvent ──────────────────────────────────────────────────────────

export type RecordCareerEventPayload = {
  institutionId: string;
  staffId: string;
  eventType: CareerEventType;
  effectiveDate: string;
  previousValue?: string | null;
  newValue?: string | null;
  orderNumber?: string | null;
  documentUrl?: string | null;
  remarks?: string | null;
  /** Increment only — drives a new salary_structures row. */
  newBasicSalary?: number;
  /** Promotion only — drives staff.designation. */
  newDesignation?: string;
  /** Transfer only — drives staff.department_id. */
  newDepartmentId?: string;
};

export async function recordCareerEvent(
  payload: RecordCareerEventPayload
): Promise<Result<StaffCareerEvent>> {
  if (!payload.institutionId) return { success: false, error: "Institution ID required." };
  if (!payload.staffId)       return { success: false, error: "Staff member is required." };
  if (!payload.effectiveDate) return { success: false, error: "Effective date is required." };
  if (payload.eventType === "increment" && (!payload.newBasicSalary || payload.newBasicSalary <= 0))
    return { success: false, error: "A new basic salary greater than 0 is required for an increment." };
  if (payload.eventType === "promotion" && !payload.newDesignation?.trim())
    return { success: false, error: "A new designation is required for a promotion." };
  if (payload.eventType === "transfer" && !payload.newDepartmentId)
    return { success: false, error: "A destination department is required for a transfer." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: staffBefore, error: staffErr } = await supabase
      .from("staff")
      .select("full_name, designation, department_id, is_active, departments!department_id(name)")
      .eq("id", payload.staffId)
      .maybeSingle();
    if (staffErr || !staffBefore) return { success: false, error: "Staff member not found." };

    let previousValue = payload.previousValue ?? null;
    let newValue       = payload.newValue ?? null;

    if (payload.eventType === "increment") {
      const { data: activeStructure } = await supabase
        .from("salary_structures")
        .select("*")
        .eq("institution_id", payload.institutionId)
        .eq("staff_id", payload.staffId)
        .eq("is_active", true)
        .maybeSingle();

      if (!activeStructure) {
        return { success: false, error: "No active salary structure found — create one in the Salaries module first." };
      }

      previousValue = previousValue ?? `₹${Number(activeStructure.basic_salary).toLocaleString("en-IN")}`;
      newValue      = newValue      ?? `₹${Number(payload.newBasicSalary).toLocaleString("en-IN")}`;

      await supabase
        .from("salary_structures")
        .update({ is_active: false, effective_to: payload.effectiveDate, updated_at: new Date().toISOString() })
        .eq("id", activeStructure.id);

      const { data: newStructure, error: insErr } = await supabase
        .from("salary_structures")
        .insert({
          institution_id:   payload.institutionId,
          staff_id:         payload.staffId,
          basic_salary:     payload.newBasicSalary,
          hra:              activeStructure.hra,
          ta:               activeStructure.ta,
          da:               activeStructure.da,
          other_allowances: activeStructure.other_allowances,
          pf_deduction:     activeStructure.pf_deduction,
          esi_deduction:    activeStructure.esi_deduction,
          tds_deduction:    activeStructure.tds_deduction,
          other_deductions: activeStructure.other_deductions,
          effective_from:   payload.effectiveDate,
        })
        .select("id")
        .single();
      if (insErr) return { success: false, error: insErr.message };

      await logAudit({
        institutionId: payload.institutionId,
        performedBy: user.id,
        tableName: "salary_structures",
        recordId: newStructure.id as string,
        action: "INSERT",
        beforeData: activeStructure,
        afterData: { basic_salary: payload.newBasicSalary, effective_from: payload.effectiveDate },
        notes: `Increment recorded via staff career event for ${staffBefore.full_name}`,
      });
    } else if (payload.eventType === "promotion") {
      previousValue = previousValue ?? (staffBefore.designation as string | null);
      newValue       = newValue      ?? payload.newDesignation ?? null;

      const { error: updErr } = await supabase
        .from("staff")
        .update({ designation: payload.newDesignation })
        .eq("id", payload.staffId);
      if (updErr) return { success: false, error: updErr.message };

      await logAudit({
        institutionId: payload.institutionId,
        performedBy: user.id,
        tableName: "staff",
        recordId: payload.staffId,
        action: "UPDATE",
        beforeData: { designation: staffBefore.designation },
        afterData: { designation: payload.newDesignation },
        notes: "Promotion recorded via staff career event",
      });
    } else if (payload.eventType === "transfer") {
      const deptBefore = (staffBefore as unknown as { departments?: { name: string } | null }).departments?.name ?? null;
      previousValue = previousValue ?? deptBefore;

      const { data: newDept } = await supabase
        .from("departments")
        .select("name")
        .eq("id", payload.newDepartmentId)
        .maybeSingle();
      newValue = newValue ?? (newDept?.name as string | undefined) ?? null;

      const { error: updErr } = await supabase
        .from("staff")
        .update({ department_id: payload.newDepartmentId })
        .eq("id", payload.staffId);
      if (updErr) return { success: false, error: updErr.message };

      await logAudit({
        institutionId: payload.institutionId,
        performedBy: user.id,
        tableName: "staff",
        recordId: payload.staffId,
        action: "UPDATE",
        beforeData: { department_id: staffBefore.department_id },
        afterData: { department_id: payload.newDepartmentId },
        notes: "Transfer recorded via staff career event",
      });
    } else if (isOffboardingEvent(payload.eventType)) {
      previousValue = previousValue ?? "Active";
      newValue       = newValue      ?? CAREER_EVENT_LABELS[payload.eventType];

      const { error: updErr } = await supabase
        .from("staff")
        .update({ is_active: false })
        .eq("id", payload.staffId);
      if (updErr) return { success: false, error: updErr.message };

      await logAudit({
        institutionId: payload.institutionId,
        performedBy: user.id,
        tableName: "staff",
        recordId: payload.staffId,
        action: "UPDATE",
        beforeData: { is_active: true },
        afterData: { is_active: false },
        notes: `${CAREER_EVENT_LABELS[payload.eventType]} recorded via staff career event`,
      });
    }

    const { data: event, error: eventErr } = await supabase
      .from("staff_career_events")
      .insert({
        institution_id: payload.institutionId,
        staff_id:       payload.staffId,
        event_type:     payload.eventType,
        effective_date: payload.effectiveDate,
        previous_value: previousValue,
        new_value:      newValue,
        order_number:   payload.orderNumber?.trim() || null,
        document_url:   payload.documentUrl || null,
        remarks:        payload.remarks?.trim() || null,
        recorded_by:    user.id,
      })
      .select(CAREER_COLS)
      .single();

    if (eventErr) return { success: false, error: eventErr.message };

    revalidateCareer(payload.institutionId, payload.staffId);
    return { success: true, data: event as unknown as StaffCareerEvent };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── processResignation / processRetirement ────────────────────────────────────

type OffboardingPayload = {
  institutionId: string;
  staffId: string;
  effectiveDate: string;
  orderNumber?: string;
  documentUrl?: string;
  remarks?: string;
};

export async function processResignation(payload: OffboardingPayload): Promise<Result<StaffCareerEvent>> {
  return recordCareerEvent({ ...payload, eventType: "resignation" });
}

export async function processRetirement(payload: OffboardingPayload): Promise<Result<StaffCareerEvent>> {
  return recordCareerEvent({ ...payload, eventType: "retirement" });
}

// ── getServiceYears ────────────────────────────────────────────────────────────

export async function getServiceYears(staffId: string): Promise<Result<number | null>> {
  if (!staffId) return { success: false, error: "Staff ID required." };

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("staff")
      .select("joining_date")
      .eq("id", staffId)
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    return { success: true, data: serviceYears((data?.joining_date as string | undefined) ?? null) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
