"use server";

/*
  draft_schedules stores AI-generated timetable drafts before they are published
  into `schedules`. Academic year is keyed by `academic_year_id` (uuid FK →
  academic_years), NOT a free-text column — see migration
  20260609000007_foundation_2pre_b_academic_year_fk_migration. Callers pass an
  academic_year_id; reads join academic_years(label) for display.
*/

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { SHIFT_PERIOD_TIMES } from "@/lib/scheduleConstants";
import { callScheduler } from "@/lib/scheduler";
import { isSettingEnabled } from "@/lib/configServer";
import { notifySchedulePublished } from "@/actions/notificationTriggers";

// Cohort definitions are fixed per academic structure. Adjust required_hours_per_day
// to match your institution's timetable grid.
const DEPARTMENT_COHORTS = [
  { id: "ug-1", name: "UG-1", required_hours_per_day: 6 },
  { id: "ug-2", name: "UG-2", required_hours_per_day: 6 },
  { id: "ug-3", name: "UG-3", required_hours_per_day: 6 },
  { id: "pg-1", name: "PG-1", required_hours_per_day: 5 },
  { id: "pg-2", name: "PG-2", required_hours_per_day: 5 },
] as const;

const INSTITUTION_SETTINGS = {
  days_per_week: 5,
  periods_per_day: 6,
} as const;

// Fallback weekly cap when the profiles row has no explicit value set.
const DEFAULT_MAX_HOURS_PER_WEEK = 20;

type StaffRow = {
  id: string;
  full_name: string;
  max_hours_per_week: number | null;
};

type SolverPayload = {
  staff: { id: string; name: string; max_hours_per_week: number }[];
  cohorts: (typeof DEPARTMENT_COHORTS)[number][];
  settings: typeof INSTITUTION_SETTINGS;
};

type SolverResponse = {
  status: string;
  solve_time_seconds: number;
  timetable: unknown[];
  staff_workload: unknown[];
};

export type SchedulerResult =
  | { success: true; draftId: string; solverStatus: string; solveTime: number }
  | { success: false; error: string };

export type DraftTimetableEntry = {
  staff_id: string;
  staff_name: string;
  cohort_id: string;
  cohort_name: string;
  day: number;
  day_name: string;
  period: number;
};

export type DraftStaffWorkload = {
  staff_id: string;
  staff_name: string;
  total_hours_week: number;
};

export type DraftScheduleData = {
  id: string;
  institution_id: string;
  department_id: string;
  academic_year: string;
  status: string;
  timetable: DraftTimetableEntry[];
  staff_workload: DraftStaffWorkload[];
};

export type PublishResult =
  | { success: true; count: number }
  | { success: false; error: string };



export type DraftSummary = {
  id: string;
  academic_year: string;
  status: string;
  generated_at: string;
  slot_count: number;
};

export async function listDraftSchedules(
  institutionId: string,
  departmentId: string,
): Promise<{ data: DraftSummary[]; error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("draft_schedules")
    .select("id, status, generated_at, schedule_data, academic_years(label)")
    .eq("institution_id", institutionId)
    .eq("department_id", departmentId)
    .order("generated_at", { ascending: false })
    .limit(10);

  if (error) return { data: [], error: error.message };

  const summaries: DraftSummary[] = (data ?? []).map((row) => {
    const sd = row.schedule_data as Record<string, unknown>;
    const timetable = (sd?.timetable as unknown[]) ?? [];
    const ay = row.academic_years as unknown as { label: string } | null;
    return {
      id: row.id as string,
      academic_year: ay?.label ?? "—",
      status: row.status as string,
      generated_at: row.generated_at as string,
      slot_count: timetable.length,
    };
  });

  return { data: summaries, error: null };
}

export async function getDraftSchedule(
  draftId: string,
): Promise<{ data: DraftScheduleData | null; error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data, error } = await supabase
    .from("draft_schedules")
    .select("id, institution_id, department_id, status, schedule_data, academic_years(label)")
    .eq("id", draftId)
    .single();

  if (error || !data) return { data: null, error: error?.message ?? "Draft not found" };

  const sd = data.schedule_data as Record<string, unknown>;
  const ay = data.academic_years as unknown as { label: string } | null;
  return {
    data: {
      id: data.id as string,
      institution_id: data.institution_id as string,
      department_id: data.department_id as string,
      academic_year: ay?.label ?? "—",
      status: data.status as string,
      timetable: (sd.timetable as DraftTimetableEntry[]) ?? [],
      staff_workload: (sd.staff_workload as DraftStaffWorkload[]) ?? [],
    },
    error: null,
  };
}

export async function deleteDraftSchedule(draftId: string): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from("draft_schedules").delete().eq("id", draftId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function clearDepartmentSchedules(
  institutionId: string,
  departmentId: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Count before deleting so we can report how many were removed
  const { count } = await supabase
    .from("schedules")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", institutionId)
    .eq("department_id", departmentId);

  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("tenant_id", institutionId)
    .eq("department_id", departmentId);

  if (error) return { success: false, count: 0, error: error.message };

  // Reset all published drafts for this dept back to DRAFT
  await supabase
    .from("draft_schedules")
    .update({ status: "DRAFT" })
    .eq("institution_id", institutionId)
    .eq("department_id", departmentId)
    .eq("status", "PUBLISHED");

  revalidatePath("/schedules");
  return { success: true, count: count ?? 0 };
}

export async function publishDraftSchedule(draftId: string): Promise<PublishResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: draft, error: fetchError } = await supabase
    .from("draft_schedules")
    .select("institution_id, department_id, schedule_data, status")
    .eq("id", draftId)
    .single();

  if (fetchError || !draft) return { success: false, error: fetchError?.message ?? "Draft not found" };

  const { data: dept } = await supabase
    .from("departments")
    .select("session_type")
    .eq("id", draft.department_id as string)
    .maybeSingle();
  const periodTimes = SHIFT_PERIOD_TIMES[(dept?.session_type as string) ?? "NORMAL"] ?? SHIFT_PERIOD_TIMES.NORMAL;
  if ((draft.status as string) === "PUBLISHED") return { success: false, error: "This schedule is already published." };

  // ── Unpublish any existing published schedule for this department ─────
  const { data: prevPublished } = await supabase
    .from("draft_schedules")
    .select("id")
    .eq("institution_id", draft.institution_id as string)
    .eq("department_id", draft.department_id as string)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (prevPublished) {
    // Remove schedule rows that came from the previous published draft
    await supabase
      .from("schedules")
      .delete()
      .eq("draft_schedule_id", prevPublished.id);

    // Revert its status back to DRAFT
    await supabase
      .from("draft_schedules")
      .update({ status: "DRAFT" })
      .eq("id", prevPublished.id);
  }

  // ── Insert new schedule rows ──────────────────────────────────────────
  const sd = draft.schedule_data as Record<string, unknown>;
  const timetable = (sd.timetable as DraftTimetableEntry[]) ?? [];

  const rows = timetable.map((e) => ({
    day_of_week:       e.day_name,
    start_time:        periodTimes[e.period]?.start ?? "09:00:00",
    end_time:          periodTimes[e.period]?.end   ?? "10:00:00",
    department_id:     draft.department_id as string,
    subject_name:      e.cohort_name,
    staff_id:          e.staff_id,
    tenant_id:         draft.institution_id as string,
    draft_schedule_id: draftId,
  }));

  const { error: insertError } = await supabase.from("schedules").insert(rows);
  if (insertError) return { success: false, error: insertError.message };

  await supabase.from("draft_schedules").update({ status: "PUBLISHED" }).eq("id", draftId);

  // Notify the department's staff + students (fire-and-forget)
  await notifySchedulePublished({
    institutionId: draft.institution_id as string,
    departmentId:  draft.department_id as string,
  });

  revalidatePath("/schedules");

  return { success: true, count: rows.length };
}

export async function generateDepartmentSchedule(
  institutionId: string,
  departmentId: string,
  academicYearId: string,
): Promise<SchedulerResult> {
  try {
    if (!academicYearId) return { success: false, error: "Please select an academic year first." };

    // CF-1: respect the AI-timetable-engine toggle (fail-open).
    if (!(await isSettingEnabled(institutionId, "integrations.scheduler_engine"))) {
      return { success: false, error: "The AI timetable engine is disabled for this institution." };
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // ── Step A: Reject if a draft already exists for this dept + year ───
    const { data: existing } = await supabase
      .from("draft_schedules")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("department_id", departmentId)
      .eq("academic_year_id", academicYearId)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `A schedule for this academic year already exists for this department. Delete the existing one from Past Schedules first, or choose a different year.`,
      };
    }

    // ── Step B: Fetch active staff for this department ───────────────────
    const { data: staffRows, error: staffError } = await supabase
      .from("staff")
      .select("id, full_name, max_hours_per_week")
      .eq("institution_id", institutionId)
      .eq("department_id", departmentId);

    if (staffError) {
      return { success: false, error: `Failed to fetch staff: ${staffError.message}` };
    }

    if (!staffRows || staffRows.length === 0) {
      return {
        success: false,
        error:
          "No staff found for this department. Please add faculty members before generating a schedule.",
      };
    }

    // ── Step C: Map Supabase rows → Python API payload ───────────────────
    const payload: SolverPayload = {
      staff: (staffRows as StaffRow[]).map((s) => ({
        id: s.id,
        name: s.full_name,
        max_hours_per_week: s.max_hours_per_week ?? DEFAULT_MAX_HOURS_PER_WEEK,
      })),
      cohorts: [...DEPARTMENT_COHORTS],
      settings: INSTITUTION_SETTINGS,
    };

    // ── Step D: Call the Python scheduling engine ────────────────────────
    // Dev Rule 14: always via callScheduler() — 30s timeout, failures
    // logged to scheduler_error_logs, never throws.
    const call = await callScheduler<SolverResponse>("/generate-schedule", {
      method: "POST",
      body: payload,
      institutionId,
    });

    if (!call.success) {
      // The Python API returns { detail: { message, solver_status, error } } on 400.
      const detail = (call.detail as { detail?: { message?: string; error?: string } } | null)?.detail;
      const message = detail?.message ?? detail?.error ?? call.error;
      return { success: false, error: message };
    }

    const solverResponse: SolverResponse = call.data;

    // ── Step E: Persist as a draft schedule in Supabase ─────────────────
    const { data: draft, error: insertError } = await supabase
      .from("draft_schedules")
      .insert({
        institution_id: institutionId,
        department_id: departmentId,
        academic_year_id: academicYearId,
        schedule_data: solverResponse,
        status: "DRAFT",
        generated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      return {
        success: false,
        error: `Schedule generated but could not be saved: ${insertError.message}`,
      };
    }

    revalidatePath("/institutions");

    return {
      success: true,
      draftId: draft.id as string,
      solverStatus: solverResponse.status,
      solveTime: solverResponse.solve_time_seconds,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}
