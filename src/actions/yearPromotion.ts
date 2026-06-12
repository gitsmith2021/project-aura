"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/auditLog";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PromotionAction = "promote" | "hold" | "graduate";

export type StudentPromotionRow = {
  id: string;
  full_name: string;
  roll_number: string | null;
  year: number;
  program: string;
  is_graduated: boolean;
  department_id: string | null;
  departments: { name: string } | null;
  arrear_count: number;
  action: PromotionAction;
  max_year: number;
};

export type PromotionLog = {
  id: string;
  institution_id: string;
  academic_year_id: string | null;
  academic_year_label: string | null;
  run_by: string | null;
  run_at: string;
  total_promoted: number;
  total_held: number;
  total_graduated: number;
  can_rollback_until: string;
  rolled_back_at: string | null;
};

type SnapshotEntry = { student_id: string; prev_year: number; prev_is_graduated: boolean };

// ── Helpers ───────────────────────────────────────────────────────────────────

function maxYearForProgram(program: string): number {
  return program === "PG" ? 2 : 3; // UG = 3 years, PG = 2 years
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function previewPromotion(
  institutionId: string,
  filters?: { departmentId?: string }
) {
  const supabase = createClient(await cookies());

  let q = supabase
    .from("students")
    .select("id, full_name, roll_number, year, program, is_graduated, department_id, departments(name)")
    .eq("institution_id", institutionId)
    .eq("is_graduated", false)
    .order("department_id")
    .order("roll_number", { ascending: true, nullsFirst: false });

  if (filters?.departmentId) q = q.eq("department_id", filters.departmentId);

  const { data: students, error } = await q;
  if (error) return { success: false as const, error: error.message };

  // Count arrears per student (active uncleared failures)
  const { data: arrearRows } = await supabase
    .from("exam_results")
    .select("student_id")
    .eq("institution_id", institutionId)
    .eq("is_arrear", true);

  const arrearMap: Record<string, number> = {};
  (arrearRows ?? []).forEach(r => {
    arrearMap[r.student_id] = (arrearMap[r.student_id] ?? 0) + 1;
  });

  const rows: StudentPromotionRow[] = (students ?? []).map(s => {
    const arrearCount = arrearMap[s.id] ?? 0;
    const maxYear     = maxYearForProgram(s.program ?? "UG");
    let action: PromotionAction;

    if (arrearCount > 0) {
      action = "hold";
    } else if ((s.year ?? 1) >= maxYear) {
      action = "graduate";
    } else {
      action = "promote";
    }

    return {
      id:           s.id,
      full_name:    s.full_name,
      roll_number:  s.roll_number,
      year:         s.year ?? 1,
      program:      s.program ?? "UG",
      is_graduated: s.is_graduated ?? false,
      department_id: s.department_id,
      departments:  (s.departments as unknown) as { name: string } | null,
      arrear_count: arrearCount,
      action,
      max_year:     maxYear,
    };
  });

  return { success: true as const, data: rows };
}

export async function getPromotionLogs(institutionId: string) {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("promotion_logs")
    .select("id, institution_id, academic_year_id, academic_year_label, run_by, run_at, total_promoted, total_held, total_graduated, can_rollback_until, rolled_back_at")
    .eq("institution_id", institutionId)
    .order("run_at", { ascending: false })
    .limit(20);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as PromotionLog[] };
}

// ── Run promotion ─────────────────────────────────────────────────────────────

export async function runPromotion(
  institutionId: string,
  academicYearId: string | null,
  academicYearLabel: string
) {
  const supabase = createClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();

  const preview = await previewPromotion(institutionId);
  if (!preview.success) return { success: false as const, error: preview.error };

  const toPromote  = preview.data.filter(r => r.action === "promote");
  const toGraduate = preview.data.filter(r => r.action === "graduate");
  const toHold     = preview.data.filter(r => r.action === "hold");

  // Build rollback snapshot (every affected student's current state)
  const snapshot: SnapshotEntry[] = preview.data.map(s => ({
    student_id:        s.id,
    prev_year:         s.year,
    prev_is_graduated: s.is_graduated,
  }));

  // ── Apply promotions ──────────────────────────────────────────────────────
  // Group promote cohort by current year so we can batch-update by new year
  if (toPromote.length > 0) {
    const byYear: Record<number, string[]> = {};
    toPromote.forEach(s => {
      byYear[s.year] = [...(byYear[s.year] ?? []), s.id];
    });
    for (const [currentYear, ids] of Object.entries(byYear)) {
      const { error } = await supabase
        .from("students")
        .update({ year: Number(currentYear) + 1 })
        .in("id", ids);
      if (error) return { success: false as const, error: `Promote failed: ${error.message}` };
    }
  }

  // Graduate cohort
  if (toGraduate.length > 0) {
    const { error } = await supabase
      .from("students")
      .update({ is_graduated: true })
      .in("id", toGraduate.map(s => s.id));
    if (error) return { success: false as const, error: `Graduate failed: ${error.message}` };
  }

  // ── Write audit log ───────────────────────────────────────────────────────
  const runAt       = new Date();
  const rollbackUntil = new Date(runAt.getTime() + 24 * 60 * 60 * 1000); // +24 h

  const { data: log, error: logError } = await supabase
    .from("promotion_logs")
    .insert({
      institution_id:      institutionId,
      academic_year_id:    academicYearId,
      academic_year_label: academicYearLabel,
      run_by:              user?.id ?? null,
      run_at:              runAt.toISOString(),
      total_promoted:      toPromote.length,
      total_held:          toHold.length,
      total_graduated:     toGraduate.length,
      can_rollback_until:  rollbackUntil.toISOString(),
      rollback_snapshot:   snapshot,
    })
    .select("id")
    .single();

  if (logError) return { success: false as const, error: `Log write failed: ${logError.message}` };

  // Platform audit trail (Arch A8). promotion_logs holds the full per-student
  // rollback snapshot; this entry makes the run visible in the unified log.
  await logAudit({
    institutionId,
    performedBy: user?.id ?? null,
    tableName: "promotion_logs",
    recordId: log.id as string,
    action: "PROMOTE",
    afterData: {
      academic_year_label: academicYearLabel,
      promoted: toPromote.length,
      held: toHold.length,
      graduated: toGraduate.length,
    },
    notes: `Year promotion run for ${academicYearLabel}`,
  });

  revalidatePath(`/institutions/${institutionId}/promotion`);
  return {
    success:  true as const,
    logId:    log.id,
    promoted: toPromote.length,
    held:     toHold.length,
    graduated: toGraduate.length,
  };
}

// ── Rollback ──────────────────────────────────────────────────────────────────

export async function rollbackPromotion(logId: string, institutionId: string) {
  const supabase = createClient(await cookies());

  const { data: log, error: fetchErr } = await supabase
    .from("promotion_logs")
    .select("*")
    .eq("id", logId)
    .eq("institution_id", institutionId)
    .single();

  if (fetchErr || !log) return { success: false as const, error: "Log not found." };
  if (log.rolled_back_at)    return { success: false as const, error: "This run has already been rolled back." };
  if (new Date(log.can_rollback_until) < new Date())
    return { success: false as const, error: "The 24-hour rollback window has expired." };

  const snapshot = (log.rollback_snapshot ?? []) as SnapshotEntry[];

  // Group by (prev_year, prev_is_graduated) for efficient batch restores
  const byState: Record<string, { year: number; is_graduated: boolean; ids: string[] }> = {};
  snapshot.forEach(row => {
    const key = `${row.prev_year}-${row.prev_is_graduated}`;
    if (!byState[key]) byState[key] = { year: row.prev_year, is_graduated: row.prev_is_graduated, ids: [] };
    byState[key].ids.push(row.student_id);
  });

  for (const { year, is_graduated, ids } of Object.values(byState)) {
    const { error } = await supabase
      .from("students")
      .update({ year, is_graduated })
      .in("id", ids);
    if (error) return { success: false as const, error: `Restore failed: ${error.message}` };
  }

  await supabase
    .from("promotion_logs")
    .update({ rolled_back_at: new Date().toISOString() })
    .eq("id", logId);

  const { data: { user } } = await supabase.auth.getUser();
  await logAudit({
    institutionId,
    performedBy: user?.id ?? null,
    tableName: "promotion_logs",
    recordId: logId,
    action: "REVERT",
    beforeData: {
      total_promoted: log.total_promoted,
      total_graduated: log.total_graduated,
      academic_year_label: log.academic_year_label,
    },
    afterData: { students_restored: snapshot.length },
    notes: `Promotion run rolled back (${log.academic_year_label ?? "unknown year"})`,
  });

  revalidatePath(`/institutions/${institutionId}/promotion`);
  return { success: true as const };
}
