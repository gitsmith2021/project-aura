"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import { eachDateInRange } from "@/lib/staffAttendance";
import { notifyLeaveRequested, notifyLeaveReviewed } from "@/actions/notificationTriggers";
import type {
  StaffProfile, StaffScheduleSlot, AttendanceSummaryRow,
  LeaveRequest, SalarySlip, StaffDashboardStats, AdminLeaveRequest,
  LeaveType,
} from "@/types/staffPortal";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function todayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

// ── getStaffProfile ───────────────────────────────────────────────────────────
// Cached per request so layout + pages don't duplicate the DB call

export const getStaffProfile = cache(
  async (): Promise<{ success: true; data: StaffProfile } | { success: false; error: string }> => {
    try {
      const supabase = await getSupabase();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) return { success: false, error: "Unauthorized." };

      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name, title, designation, department_id, institution_id, employment_type, email, staff_type, daily_wage_rate, departments!department_id(name), institutions(name)")
        .eq("email", user.email)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data)  return { success: false, error: "No staff profile found for this account." };

      return { success: true, data: data as unknown as StaffProfile };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
    }
  }
);

// ── getStaffSchedule ──────────────────────────────────────────────────────────

export async function getStaffSchedule(
  staffId: string
): Promise<{ success: true; data: StaffScheduleSlot[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("schedules")
      .select("id, day_of_week, start_time, end_time, subject_name, department_id, departments(name)")
      .eq("staff_id", staffId)
      .order("start_time", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StaffScheduleSlot[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStaffAttendanceSummary ─────────────────────────────────────────────────

export async function getStaffAttendanceSummary(
  staffId: string
): Promise<{ success: true; data: AttendanceSummaryRow[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

    // Fetch schedules for this staff
    const { data: schedules, error: schedErr } = await supabase
      .from("schedules")
      .select("id, subject_name, day_of_week, start_time, end_time")
      .eq("staff_id", staffId);

    if (schedErr) return { success: false, error: schedErr.message };
    if (!schedules?.length) return { success: true, data: [] };

    const scheduleIds = schedules.map(s => s.id as string);

    // Fetch attendance records (last 30 days)
    const { data: attendance, error: attErr } = await supabase
      .from("attendance")
      .select("schedule_id, student_id, status, created_at")
      .in("schedule_id", scheduleIds)
      .gte("created_at", since30);

    if (attErr) return { success: false, error: attErr.message };

    // Aggregate per schedule
    const result: AttendanceSummaryRow[] = schedules.map(s => {
      const rows = (attendance ?? []).filter(a => a.schedule_id === s.id);
      const dates = new Set(rows.map(a => (a.created_at as string).slice(0, 10)));
      const present = rows.filter(a => a.status === "present").length;
      const total   = rows.length;
      return {
        schedule_id:    s.id,
        subject_name:   s.subject_name,
        day_of_week:    s.day_of_week,
        start_time:     s.start_time,
        end_time:       s.end_time,
        classes_held:   dates.size,
        total_present:  present,
        total_marked:   total,
        attendance_pct: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getLeaveRequests ──────────────────────────────────────────────────────────

export async function getLeaveRequests(
  staffId: string
): Promise<{ success: true; data: LeaveRequest[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("leave_requests")
      .select("id, institution_id, staff_id, leave_type, from_date, to_date, reason, status, review_note, reviewed_at, created_at")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as LeaveRequest[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── applyForLeave ─────────────────────────────────────────────────────────────

export async function applyForLeave(payload: {
  staffId:       string;
  institutionId: string;
  leave_type:    LeaveType;
  from_date:     string;
  to_date:       string;
  reason:        string;
}): Promise<{ success: true; data: LeaveRequest } | { success: false; error: string }> {
  if (!payload.reason?.trim() || payload.reason.trim().length < 10)
    return { success: false, error: "Reason must be at least 10 characters." };
  if (payload.from_date > payload.to_date)
    return { success: false, error: "From date must be on or before to date." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("leave_requests")
      .insert({
        institution_id: payload.institutionId,
        staff_id:       payload.staffId,
        leave_type:     payload.leave_type,
        from_date:      payload.from_date,
        to_date:        payload.to_date,
        reason:         payload.reason.trim(),
        status:         "pending",
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Notify institution admins of the new request (fire-and-forget)
    await notifyLeaveRequested({
      institutionId: payload.institutionId,
      staffId:       payload.staffId,
      leaveType:     payload.leave_type,
      fromDate:      payload.from_date,
      toDate:        payload.to_date,
    });

    revalidatePath("/staff-portal/leave");
    return { success: true, data: data as unknown as LeaveRequest };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getSalarySlips ────────────────────────────────────────────────────────────

export async function getSalarySlips(
  staffId: string
): Promise<{ success: true; data: SalarySlip[]; currentStructure: SalarySlip["salary_structure"] | null } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const [{ data: disbursements, error: dErr }, { data: structure }] = await Promise.all([
      supabase
        .from("salary_disbursements")
        .select("id, month, amount_disbursed, payment_mode, status, disbursed_at, transaction_ref, salary_structure_id")
        .eq("staff_id", staffId)
        .order("month", { ascending: false }),
      supabase
        .from("salary_structures")
        .select("basic_salary, hra, ta, da, other_allowances, pf_deduction, esi_deduction, tds_deduction, other_deductions, net_salary")
        .eq("staff_id", staffId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (dErr) return { success: false, error: dErr.message };

    const slips: SalarySlip[] = (disbursements ?? []).map(d => ({
      id:              d.id,
      month:           d.month,
      amount_disbursed: Number(d.amount_disbursed),
      payment_mode:    d.payment_mode,
      status:          d.status,
      disbursed_at:    d.disbursed_at,
      transaction_ref: d.transaction_ref,
      salary_structure: structure
        ? {
            basic_salary:     Number(structure.basic_salary),
            hra:              Number(structure.hra),
            ta:               Number(structure.ta),
            da:               Number(structure.da),
            other_allowances: Number(structure.other_allowances),
            pf_deduction:     Number(structure.pf_deduction),
            esi_deduction:    Number(structure.esi_deduction),
            tds_deduction:    Number(structure.tds_deduction),
            other_deductions: Number(structure.other_deductions),
            net_salary:       Number(structure.net_salary),
          }
        : null,
    }));

    const currentStructure = structure
      ? {
          basic_salary:     Number(structure.basic_salary),
          hra:              Number(structure.hra),
          ta:               Number(structure.ta),
          da:               Number(structure.da),
          other_allowances: Number(structure.other_allowances),
          pf_deduction:     Number(structure.pf_deduction),
          esi_deduction:    Number(structure.esi_deduction),
          tds_deduction:    Number(structure.tds_deduction),
          other_deductions: Number(structure.other_deductions),
          net_salary:       Number(structure.net_salary),
        }
      : null;

    return { success: true, data: slips, currentStructure };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStaffDashboardStats ────────────────────────────────────────────────────

export async function getStaffDashboardStats(
  staffId: string,
  institutionId: string
): Promise<{ success: true; data: StaffDashboardStats } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const today      = todayName();
    const now        = new Date();
    const nowHHMM    = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:00`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Fetch schedules first (attendance query needs schedule IDs)
    const { data: allSchedules } = await supabase
      .from("schedules")
      .select("id, day_of_week, start_time, end_time, subject_name, department_id, departments(name)")
      .eq("staff_id", staffId)
      .order("start_time");

    const scheduleIds = (allSchedules ?? []).map((s: { id: string }) => s.id);

    const [
      { data: students },
      { data: pendingLeaves },
      { data: monthAttendance },
    ] = await Promise.all([
      supabase.from("students")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId),
      supabase.from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", staffId)
        .eq("status", "pending"),
      scheduleIds.length > 0
        ? supabase.from("attendance")
            .select("status, schedule_id")
            .in("schedule_id", scheduleIds)
            .gte("created_at", monthStart)
        : Promise.resolve({ data: [] }),
    ]);

    const todaysClasses = (allSchedules ?? []).filter(
      (s: { day_of_week: string }) => s.day_of_week === today
    ) as unknown as StaffScheduleSlot[];

    const nextClass = todaysClasses.find(
      (s: StaffScheduleSlot) => s.start_time > nowHHMM
    ) ?? null;

    const attRows   = monthAttendance ?? [];
    const totalMark = attRows.length;
    const present   = attRows.filter((a: { status: string }) => a.status === "present").length;
    const pct       = totalMark > 0 ? Math.round((present / totalMark) * 100) : 0;

    return {
      success: true,
      data: {
        todaysClasses,
        totalStudents:       (students as unknown as { count: number } | null)?.count ?? 0,
        thisMonthAttendance: pct,
        pendingLeaves:       (pendingLeaves as unknown as { count: number } | null)?.count ?? 0,
        nextClass,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin: getInstitutionLeaveRequests ────────────────────────────────────────

export async function getInstitutionLeaveRequests(
  institutionId: string,
  statusFilter?: "pending" | "approved" | "rejected"
): Promise<{ success: true; data: AdminLeaveRequest[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    let query = supabase
      .from("leave_requests")
      .select("*, staff(full_name, title, designation)")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as AdminLeaveRequest[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Admin: reviewLeaveRequest ─────────────────────────────────────────────────

export async function reviewLeaveRequest(
  leaveId:      string,
  institutionId: string,
  payload: { status: "approved" | "rejected"; review_note?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: before } = await supabase
      .from("leave_requests")
      .select("status, staff_id, leave_type, from_date, to_date, review_note")
      .eq("id", leaveId)
      .maybeSingle();

    const { error } = await supabase
      .from("leave_requests")
      .update({
        status:      payload.status,
        review_note: payload.review_note?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      })
      .eq("id", leaveId)
      .eq("institution_id", institutionId);

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId,
      performedBy: user.id,
      tableName: "leave_requests",
      recordId: leaveId,
      action: "UPDATE",
      beforeData: before ?? null,
      afterData: { status: payload.status, review_note: payload.review_note?.trim() || null },
      notes: `Leave ${payload.status}`,
    });

    // Notify the staff member of the decision (fire-and-forget)
    if (before?.staff_id) {
      await notifyLeaveReviewed({
        institutionId,
        staffId:   before.staff_id as string,
        status:    payload.status,
        leaveType: (before.leave_type as string) ?? "",
        fromDate:  (before.from_date as string) ?? "",
        toDate:    (before.to_date as string) ?? "",
      });
    }

    // Cross-reference (Phase 5J): approved leave auto-marks those dates 'on_leave'
    // in the staff daily-attendance register, so they're not counted as LOP.
    if (payload.status === "approved" && before?.staff_id && before?.from_date && before?.to_date) {
      try {
        const dates = eachDateInRange(before.from_date as string, before.to_date as string);
        if (dates.length) {
          await supabase.from("staff_attendance").upsert(
            dates.map(d => ({
              institution_id: institutionId,
              staff_id:       before.staff_id as string,
              date:           d,
              status:         "on_leave",
              logged_by:      user.id,
            })),
            { onConflict: "staff_id,date" }
          );
        }
      } catch { /* attendance sync is best-effort — must not fail the approval */ }
    }

    revalidatePath(`/institutions/${institutionId}/leave`);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
