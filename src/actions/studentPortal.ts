"use server";

import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import type {
  StudentProfile, StudentScheduleSlot, StudentAttendanceRow,
  StudentFeePayment, StudentFeeStructure, StudentDashboardStats,
} from "@/types/studentPortal";

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function todayName(): string {
  return DAY_NAMES[new Date().getDay()];
}

// ── getStudentProfile ─────────────────────────────────────────────────────────

export const getStudentProfile = cache(
  async (): Promise<{ success: true; data: StudentProfile } | { success: false; error: string }> => {
    try {
      const supabase = await getSupabase();
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) return { success: false, error: "Unauthorized." };

      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, email, roll_no, student_program, student_year, department_id, institution_id, departments(name), institutions(name)")
        .eq("email", user.email)
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!data)  return { success: false, error: "No student profile found for this account." };

      return { success: true, data: data as unknown as StudentProfile };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
    }
  }
);

// ── getStudentTimetable ───────────────────────────────────────────────────────

export async function getStudentTimetable(
  departmentId: string
): Promise<{ success: true; data: StudentScheduleSlot[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("schedules")
      .select("id, day_of_week, start_time, end_time, subject_name, department_id")
      .eq("department_id", departmentId)
      .order("start_time", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StudentScheduleSlot[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStudentAttendanceSummary ───────────────────────────────────────────────

export async function getStudentAttendanceSummary(
  studentId: string
): Promise<{ success: true; data: StudentAttendanceRow[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // Fetch attendance records for this student
    const { data: attendance, error: attErr } = await supabase
      .from("attendance")
      .select("schedule_id, status, created_at")
      .eq("student_id", studentId);

    if (attErr) return { success: false, error: attErr.message };
    if (!attendance?.length) return { success: true, data: [] };

    const scheduleIds = [...new Set(attendance.map(a => a.schedule_id as string))];

    // Fetch schedule details
    const { data: schedules, error: schedErr } = await supabase
      .from("schedules")
      .select("id, subject_name, day_of_week, start_time, end_time")
      .in("id", scheduleIds);

    if (schedErr) return { success: false, error: schedErr.message };

    const result: StudentAttendanceRow[] = (schedules ?? []).map(s => {
      const rows   = attendance.filter(a => a.schedule_id === s.id);
      const dates  = new Set(rows.map(a => (a.created_at as string).slice(0, 10)));
      const attended = rows.filter(a => a.status === "present").length;
      const total    = rows.length;
      return {
        schedule_id:      s.id,
        subject_name:     s.subject_name,
        day_of_week:      s.day_of_week,
        start_time:       s.start_time,
        end_time:         s.end_time,
        classes_held:     dates.size,
        classes_attended: attended,
        attendance_pct:   total > 0 ? Math.round((attended / total) * 100) : 0,
      };
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStudentFeeHistory ──────────────────────────────────────────────────────

export async function getStudentFeeHistory(
  studentId: string
): Promise<{ success: true; data: StudentFeePayment[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("fee_payments")
      .select("id, amount_paid, payment_mode, payment_status, paid_at, receipt_number, created_at, fee_structure_id, fee_structures(name, fee_type, amount, academic_year)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StudentFeePayment[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStudentFeeStructures ───────────────────────────────────────────────────

export async function getStudentFeeStructures(
  institutionId: string
): Promise<{ success: true; data: StudentFeeStructure[] } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("fee_structures")
      .select("id, name, fee_type, amount, academic_year")
      .eq("tenant_id", institutionId)
      .eq("is_active", true)
      .order("academic_year", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StudentFeeStructure[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStudentDashboardStats ──────────────────────────────────────────────────

export async function getStudentDashboardStats(
  studentId: string,
  departmentId: string,
  institutionId: string
): Promise<{ success: true; data: StudentDashboardStats } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const today = todayName();

    const [todaySlots, attendanceResult, feePayments, feeStructures] = await Promise.all([
      // Today's department schedule
      supabase
        .from("schedules")
        .select("id, day_of_week, start_time, end_time, subject_name, department_id")
        .eq("department_id", departmentId)
        .eq("day_of_week", today)
        .order("start_time"),

      // All attendance for this student
      supabase
        .from("attendance")
        .select("schedule_id, status")
        .eq("student_id", studentId),

      // Fee payments (completed)
      supabase
        .from("fee_payments")
        .select("amount_paid, payment_status")
        .eq("student_id", studentId),

      // Active fee structures for this institution
      supabase
        .from("fee_structures")
        .select("amount")
        .eq("tenant_id", institutionId)
        .eq("is_active", true),
    ]);

    const todaysClasses = (todaySlots.data ?? []) as unknown as StudentScheduleSlot[];

    const attRows = attendanceResult.data ?? [];
    const overallAttendancePct =
      attRows.length > 0
        ? Math.round((attRows.filter(a => a.status === "present").length / attRows.length) * 100)
        : 0;

    const payments   = feePayments.data ?? [];
    const totalFeesPaid = payments
      .filter(p => p.payment_status === "completed")
      .reduce((s, p) => s + Number(p.amount_paid), 0);

    const structs     = feeStructures.data ?? [];
    const totalFeesDue = structs.reduce((s, f) => s + Number(f.amount), 0) - totalFeesPaid;

    return {
      success: true,
      data: {
        todaysClasses,
        overallAttendancePct,
        totalFeesDue:  Math.max(0, totalFeesDue),
        totalFeesPaid,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
