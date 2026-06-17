"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  computeOverallScore, scheduleDurationHours, summarizeWorkload,
  type StaffAppraisal, type AppraisalActivity, type ActivityType, type WorkloadRow, type WorkloadSlot,
} from "@/lib/appraisals";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const APPRAISAL_COLS =
  "id, institution_id, staff_id, academic_year_id, appraisal_period, teaching_score, research_score, admin_score, overall_score, self_remarks, feedback, appraised_by, status, submitted_at, reviewed_at, created_at, updated_at, staff!staff_id(full_name, designation, department_id)";

const ACTIVITY_COLS =
  "id, appraisal_id, activity_type, title, description, date_of_activity, document_url, created_at";

/** Attach department names to embedded staff (resolved via a separate query to avoid PostgREST embed ambiguity). */
async function attachDeptNames(
  supabase: ReturnType<typeof createClient>,
  institutionId: string,
  rows: StaffAppraisal[]
): Promise<StaffAppraisal[]> {
  const { data: depts } = await supabase.from("departments").select("id, name").eq("institution_id", institutionId);
  const map = new Map((depts ?? []).map((d) => [d.id as string, d.name as string]));
  for (const r of rows) {
    if (r.staff) r.staff.departments = r.staff.department_id ? { name: map.get(r.staff.department_id) ?? "" } : null;
  }
  return rows;
}

/** Resolve the staff row for the current user (profile_id, else email). */
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

// ── Admin / HOD: overview & review ───────────────────────────────────────────

export async function getAppraisals(institutionId: string): Promise<Result<StaffAppraisal[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("staff_appraisals")
      .select(APPRAISAL_COLS)
      .eq("institution_id", institutionId)
      .order("appraisal_period", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) return { success: false, error: error.message };
    const rows = await attachDeptNames(supabase, institutionId, (data ?? []) as unknown as StaffAppraisal[]);
    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getAppraisal(id: string): Promise<Result<StaffAppraisal>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("staff_appraisals").select(APPRAISAL_COLS).eq("id", id).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Appraisal not found." };
    const row = data as unknown as StaffAppraisal;
    await attachDeptNames(supabase, row.institution_id, [row]);
    return { success: true, data: row };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getAppraisalActivities(appraisalId: string): Promise<Result<AppraisalActivity[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("staff_appraisal_activities")
      .select(ACTIVITY_COLS)
      .eq("appraisal_id", appraisalId)
      .order("date_of_activity", { ascending: false, nullsFirst: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as AppraisalActivity[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Create a pending appraisal for every active staff member who doesn't yet have one for this period. */
export async function createAppraisalCycle(input: {
  institutionId: string;
  period: string;
  academicYearId?: string | null;
}): Promise<Result<{ created: number }>> {
  try {
    if (!input.period.trim()) return { success: false, error: "An appraisal period is required." };
    const supabase = createClient(await cookies());

    const { data: staff, error: sErr } = await supabase
      .from("staff")
      .select("id")
      .eq("institution_id", input.institutionId)
      .eq("is_active", true);
    if (sErr) return { success: false, error: sErr.message };
    if (!staff || staff.length === 0) return { success: false, error: "No active staff to appraise." };

    const { data: existing } = await supabase
      .from("staff_appraisals")
      .select("staff_id")
      .eq("institution_id", input.institutionId)
      .eq("appraisal_period", input.period.trim());
    const seen = new Set((existing ?? []).map((r) => r.staff_id));

    const toInsert = staff
      .filter((s) => !seen.has(s.id))
      .map((s) => ({
        institution_id: input.institutionId,
        staff_id: s.id as string,
        appraisal_period: input.period.trim(),
        academic_year_id: input.academicYearId || null,
      }));
    if (toInsert.length === 0) return { success: true, data: { created: 0 } };

    const { error: insErr } = await supabase.from("staff_appraisals").insert(toInsert);
    if (insErr) return { success: false, error: insErr.message };
    revalidatePath(`/institutions/${input.institutionId}/appraisals`);
    return { success: true, data: { created: toInsert.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Reviewer assigns scores + feedback. `finalize` moves the appraisal to completed. */
export async function reviewAppraisal(input: {
  institutionId: string;
  appraisalId: string;
  teaching: number | null;
  research: number | null;
  admin: number | null;
  feedback?: string | null;
  finalize?: boolean;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const overall = computeOverallScore(input.teaching, input.research, input.admin);
    const reviewerStaffId = await currentStaffId(supabase);
    const { error } = await supabase
      .from("staff_appraisals")
      .update({
        teaching_score: input.teaching,
        research_score: input.research,
        admin_score: input.admin,
        overall_score: overall,
        feedback: input.feedback?.trim() || null,
        appraised_by: reviewerStaffId,
        status: input.finalize ? "completed" : "reviewed",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.appraisalId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/appraisals`);
    revalidatePath(`/institutions/${input.institutionId}/appraisals/${input.appraisalId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Staff self-service ───────────────────────────────────────────────────────

export async function getMyAppraisals(): Promise<Result<StaffAppraisal[]>> {
  try {
    const supabase = createClient(await cookies());
    const staffId = await currentStaffId(supabase);
    if (!staffId) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("staff_appraisals")
      .select(APPRAISAL_COLS)
      .eq("staff_id", staffId)
      .order("appraisal_period", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StaffAppraisal[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function submitAppraisal(input: {
  appraisalId: string;
  selfRemarks?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("staff_appraisals")
      .update({
        self_remarks: input.selfRemarks?.trim() || null,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.appraisalId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/staff-portal/appraisal");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Save self-remarks without submitting (keeps status as pending). */
export async function saveAppraisalRemarks(input: {
  appraisalId: string;
  selfRemarks?: string | null;
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("staff_appraisals")
      .update({ self_remarks: input.selfRemarks?.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", input.appraisalId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/staff-portal/appraisal");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function addAppraisalActivity(input: {
  appraisalId: string;
  activityType: ActivityType;
  title: string;
  description?: string | null;
  dateOfActivity?: string | null;
  documentUrl?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    if (!input.title.trim()) return { success: false, error: "Activity title is required." };
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("staff_appraisal_activities")
      .insert({
        appraisal_id: input.appraisalId,
        activity_type: input.activityType,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        date_of_activity: input.dateOfActivity || null,
        document_url: input.documentUrl?.trim() || null,
      })
      .select("id")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath("/staff-portal/appraisal");
    return { success: true, data: { id: data.id as string } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteAppraisalActivity(input: { id: string }): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase.from("staff_appraisal_activities").delete().eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/staff-portal/appraisal");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Workload report ──────────────────────────────────────────────────────────

/**
 * Per-staff teaching workload: planned weekly hours from class_schedules, and
 * actual hours from distinct attendance sessions (schedule × date) in the range.
 */
export async function generateWorkloadReport(input: {
  institutionId: string;
  from?: string | null;
  to?: string | null;
}): Promise<Result<WorkloadRow[]>> {
  try {
    const supabase = createClient(await cookies());

    const { data: schedules, error: schErr } = await supabase
      .from("class_schedules")
      .select("id, staff_id, start_time, end_time")
      .eq("institution_id", input.institutionId)
      .not("staff_id", "is", null);
    if (schErr) return { success: false, error: schErr.message };
    if (!schedules || schedules.length === 0) return { success: true, data: [] };

    const scheduleIds = schedules.map((s) => s.id as string);
    const staffIds = [...new Set(schedules.map((s) => s.staff_id as string))];

    // Staff names + departments
    const { data: staffRows } = await supabase
      .from("staff")
      .select("id, full_name, department_id")
      .in("id", staffIds);
    const { data: depts } = await supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", input.institutionId);
    const deptMap = new Map((depts ?? []).map((d) => [d.id as string, d.name as string]));
    const staffMap = new Map(
      (staffRows ?? []).map((s) => [s.id as string, {
        name: s.full_name as string,
        dept: s.department_id ? (deptMap.get(s.department_id as string) ?? null) : null,
      }])
    );

    // Conducted sessions: distinct (schedule_id, attendance date) within range.
    let attQ = supabase.from("attendance").select("schedule_id, created_at").in("schedule_id", scheduleIds);
    if (input.from) attQ = attQ.gte("created_at", input.from);
    if (input.to) attQ = attQ.lte("created_at", input.to);
    const { data: attendance } = await attQ;

    const sessionKeys = new Set<string>();
    const sessionsBySchedule = new Map<string, number>();
    for (const a of attendance ?? []) {
      const sid = a.schedule_id as string;
      const day = String(a.created_at).slice(0, 10);
      const key = `${sid}|${day}`;
      if (sessionKeys.has(key)) continue;
      sessionKeys.add(key);
      sessionsBySchedule.set(sid, (sessionsBySchedule.get(sid) ?? 0) + 1);
    }

    const slots: WorkloadSlot[] = schedules.map((s) => {
      const meta = staffMap.get(s.staff_id as string);
      return {
        staffId: s.staff_id as string,
        staffName: meta?.name ?? "Unknown",
        department: meta?.dept ?? null,
        durationHours: scheduleDurationHours(s.start_time as string | null, s.end_time as string | null),
        sessionsConducted: sessionsBySchedule.get(s.id as string) ?? 0,
      };
    });

    return { success: true, data: summarizeWorkload(slots) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
