"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  summarizeMonth, parseMonth, daysInMonth,
  type StaffAttendance, type StaffAttStatus, type MonthlySummary, type ReportRow,
} from "@/lib/staffAttendance";

type Result<T> = { success: true; data: T } | { success: false; error: string };

function monthRange(month: string): { from: string; to: string } {
  const { year, month: m } = parseMonth(month);
  const last = daysInMonth(year, m);
  const mm = String(m).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
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

// ── Daily register ───────────────────────────────────────────────────────────

export type RegisterRow = {
  staffId: string; name: string; designation: string | null; department: string | null;
  status: StaffAttStatus | null; checkIn: string | null; lateReason: string | null; remarks: string | null;
};

export async function getDailyRegister(institutionId: string, date: string): Promise<Result<RegisterRow[]>> {
  try {
    const supabase = createClient(await cookies());
    const [{ data: staff }, { data: att }, { data: depts }] = await Promise.all([
      supabase.from("staff").select("id, full_name, designation, department_id").eq("institution_id", institutionId).eq("is_active", true).order("full_name"),
      supabase.from("staff_attendance").select("staff_id, status, check_in_time, late_reason, remarks").eq("institution_id", institutionId).eq("date", date),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId),
    ]);
    const deptMap = new Map((depts ?? []).map((d) => [d.id as string, d.name as string]));
    const attMap = new Map((att ?? []).map((a) => [a.staff_id as string, a]));
    const rows: RegisterRow[] = (staff ?? []).map((s) => {
      const a = attMap.get(s.id as string);
      return {
        staffId: s.id as string,
        name: s.full_name as string,
        designation: (s.designation as string | null) ?? null,
        department: s.department_id ? (deptMap.get(s.department_id as string) ?? null) : null,
        status: (a?.status as StaffAttStatus | undefined) ?? null,
        checkIn: (a?.check_in_time as string | null) ?? null,
        lateReason: (a?.late_reason as string | null) ?? null,
        remarks: (a?.remarks as string | null) ?? null,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function markStaffAttendance(input: {
  institutionId: string; staffId: string; date: string; status: StaffAttStatus;
  checkInTime?: string | null; checkOutTime?: string | null; lateReason?: string | null; remarks?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("staff_attendance").upsert({
      institution_id: input.institutionId,
      staff_id: input.staffId,
      date: input.date,
      status: input.status,
      check_in_time: input.checkInTime || null,
      check_out_time: input.checkOutTime || null,
      late_reason: input.lateReason?.trim() || null,
      remarks: input.remarks?.trim() || null,
      logged_by: user?.id ?? null,
    }, { onConflict: "staff_id,date" });
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/staff-attendance`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Mark every active staff member present for the day — skips anyone already marked. */
export async function bulkMarkPresent(input: { institutionId: string; date: string }): Promise<Result<{ marked: number }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: staff }, { data: existing }] = await Promise.all([
      supabase.from("staff").select("id").eq("institution_id", input.institutionId).eq("is_active", true),
      supabase.from("staff_attendance").select("staff_id").eq("institution_id", input.institutionId).eq("date", input.date),
    ]);
    const done = new Set((existing ?? []).map((r) => r.staff_id as string));
    const toInsert = (staff ?? [])
      .filter((s) => !done.has(s.id as string))
      .map((s) => ({ institution_id: input.institutionId, staff_id: s.id as string, date: input.date, status: "present" as StaffAttStatus, logged_by: user?.id ?? null }));
    if (toInsert.length === 0) return { success: true, data: { marked: 0 } };
    const { error } = await supabase.from("staff_attendance").insert(toInsert);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/staff-attendance`);
    return { success: true, data: { marked: toInsert.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Monthly report ────────────────────────────────────────────────────────────

export async function getMonthlyReport(institutionId: string, month: string): Promise<Result<ReportRow[]>> {
  try {
    const supabase = createClient(await cookies());
    const { from, to } = monthRange(month);
    const [{ data: staff }, { data: att }, { data: depts }] = await Promise.all([
      supabase.from("staff").select("id, full_name, department_id").eq("institution_id", institutionId).eq("is_active", true).order("full_name"),
      supabase.from("staff_attendance").select("staff_id, status").eq("institution_id", institutionId).gte("date", from).lte("date", to),
      supabase.from("departments").select("id, name").eq("institution_id", institutionId),
    ]);
    const deptMap = new Map((depts ?? []).map((d) => [d.id as string, d.name as string]));
    const byStaff = new Map<string, { status: StaffAttStatus }[]>();
    for (const a of att ?? []) {
      const arr = byStaff.get(a.staff_id as string) ?? [];
      arr.push({ status: a.status as StaffAttStatus });
      byStaff.set(a.staff_id as string, arr);
    }
    const rows: ReportRow[] = (staff ?? []).map((s) => ({
      name: s.full_name as string,
      department: s.department_id ? (deptMap.get(s.department_id as string) ?? null) : null,
      summary: summarizeMonth(byStaff.get(s.id as string) ?? []),
    }));
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Staff self-service ───────────────────────────────────────────────────────

export async function getMyAttendance(month: string): Promise<Result<{ records: StaffAttendance[]; summary: MonthlySummary }>> {
  try {
    const supabase = createClient(await cookies());
    const staffId = await currentStaffId(supabase);
    const empty = summarizeMonth([]);
    if (!staffId) return { success: true, data: { records: [], summary: empty } };
    const { from, to } = monthRange(month);
    const { data, error } = await supabase
      .from("staff_attendance")
      .select("id, institution_id, staff_id, date, check_in_time, check_out_time, status, late_reason, remarks, logged_by, created_at")
      .eq("staff_id", staffId)
      .gte("date", from).lte("date", to)
      .order("date", { ascending: true });
    if (error) return { success: false, error: error.message };
    const records = (data ?? []) as unknown as StaffAttendance[];
    return { success: true, data: { records, summary: summarizeMonth(records) } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
