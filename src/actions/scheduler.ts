"use server";

/*
  Required Supabase migration — run once in the SQL editor before using this action:

  create table if not exists draft_schedules (
    id            uuid        primary key default gen_random_uuid(),
    institution_id uuid       not null references institutions(id) on delete cascade,
    department_id uuid        not null references departments(id)  on delete cascade,
    academic_year text        not null,
    schedule_data jsonb       not null,
    status        text        not null default 'DRAFT',
    generated_at  timestamptz not null default now(),
    created_at    timestamptz not null default now()
  );

  alter table draft_schedules enable row level security;

  create policy "Tenant members can manage their own draft schedules"
    on draft_schedules for all
    using (
      tenant_id = (
        select tenant_id from profiles where id = auth.uid() limit 1
      )
    );
*/

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

const SCHEDULER_URL = process.env.SCHEDULER_API_URL ?? "http://127.0.0.1:8000";

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

export async function generateDepartmentSchedule(
  institutionId: string,
  departmentId: string,
  academicYear: string,
): Promise<SchedulerResult> {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // ── Step A: Fetch active staff for this department ───────────────────
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

    // ── Step B: Map Supabase rows → Python API payload ───────────────────
    const payload: SolverPayload = {
      staff: (staffRows as StaffRow[]).map((s) => ({
        id: s.id,
        name: s.full_name,
        max_hours_per_week: s.max_hours_per_week ?? DEFAULT_MAX_HOURS_PER_WEEK,
      })),
      cohorts: [...DEPARTMENT_COHORTS],
      settings: INSTITUTION_SETTINGS,
    };

    // ── Step C: Call the Python scheduling engine ────────────────────────
    let solverResponse: SolverResponse;

    try {
      const res = await fetch(`${SCHEDULER_URL}/generate-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const body = await res.json();

      if (!res.ok) {
        // The Python API returns { detail: { message, solver_status, error } } on 400.
        const detail = body?.detail;
        const message =
          detail?.message ??
          detail?.error ??
          `Scheduling engine returned HTTP ${res.status}.`;
        return { success: false, error: message };
      }

      solverResponse = body as SolverResponse;
    } catch (err) {
      const message =
        err instanceof Error
          ? `Network error: ${err.message}`
          : "Could not reach the scheduling engine. Make sure it is running on port 8000.";
      return { success: false, error: message };
    }

    // ── Step D: Persist as a draft schedule in Supabase ─────────────────
    const { data: draft, error: insertError } = await supabase
      .from("draft_schedules")
      .insert({
        institution_id: institutionId,
        department_id: departmentId,
        academic_year: academicYear,
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
