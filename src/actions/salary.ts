"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit, logAuditBatch } from "@/lib/auditLog";
import { notifySalaryDisbursed, notifySalaryDisbursedBulk } from "@/actions/notificationTriggers";
import type {
  SalaryStructure, SalaryDisbursement, SalarySummary,
  StaffWithoutSalary, DisbursementMode, DisbursementStatus,
} from "@/types/finance";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function revalidateSalary(institutionId: string) {
  revalidatePath(`/institutions/${institutionId}/finance/salary`);
  revalidatePath("/finance");
}

// ── getSalaryStructures ───────────────────────────────────────────────────────

export async function getSalaryStructures(
  institutionId: string
): Promise<{ success: true; data: SalaryStructure[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("salary_structures")
      .select("*, staff(full_name, title, designation, department_id, departments!department_id(name))")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("staff(full_name)", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as SalaryStructure[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStaffWithoutSalaryStructure ────────────────────────────────────────────

export async function getStaffWithoutSalaryStructure(
  institutionId: string
): Promise<{ success: true; data: StaffWithoutSalary[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // Get staff_ids that already have an active structure
    const { data: structured } = await supabase
      .from("salary_structures")
      .select("staff_id")
      .eq("institution_id", institutionId)
      .eq("is_active", true);

    const structuredIds = (structured ?? []).map(s => s.staff_id as string);

    let query = supabase
      .from("staff")
      .select("id, full_name, title, designation, department_id, departments!department_id(name)")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (structuredIds.length > 0) {
      query = query.not("id", "in", `(${structuredIds.join(",")})`);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as StaffWithoutSalary[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── createSalaryStructure ─────────────────────────────────────────────────────

export type SalaryStructurePayload = {
  institution_id:   string;
  staff_id:         string;
  basic_salary:     number;
  hra:              number;
  ta:               number;
  da:               number;
  other_allowances: number;
  pf_deduction:     number;
  esi_deduction:    number;
  tds_deduction:    number;
  other_deductions: number;
  effective_from:   string;
};

export async function createSalaryStructure(
  payload: SalaryStructurePayload
): Promise<{ success: true; data: SalaryStructure } | { success: false; error: string }> {
  if (!payload.staff_id)       return { success: false, error: "Staff member is required." };
  if (!payload.basic_salary || payload.basic_salary <= 0)
    return { success: false, error: "Basic salary must be greater than 0." };
  if (!payload.effective_from) return { success: false, error: "Effective date is required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const today = new Date().toISOString().split("T")[0];

    // Deactivate any existing active structure for this staff member
    await supabase
      .from("salary_structures")
      .update({ is_active: false, effective_to: today, updated_at: new Date().toISOString() })
      .eq("institution_id", payload.institution_id)
      .eq("staff_id", payload.staff_id)
      .eq("is_active", true);

    const { data, error } = await supabase
      .from("salary_structures")
      .insert({
        institution_id:   payload.institution_id,
        staff_id:         payload.staff_id,
        basic_salary:     payload.basic_salary,
        hra:              payload.hra,
        ta:               payload.ta,
        da:               payload.da,
        other_allowances: payload.other_allowances,
        pf_deduction:     payload.pf_deduction,
        esi_deduction:    payload.esi_deduction,
        tds_deduction:    payload.tds_deduction,
        other_deductions: payload.other_deductions,
        effective_from:   payload.effective_from,
      })
      .select("*, staff(full_name, title, designation, department_id, departments!department_id(name))")
      .single();

    if (error) return { success: false, error: error.message };

    revalidateSalary(payload.institution_id);
    return { success: true, data: data as unknown as SalaryStructure };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── updateSalaryStructure ─────────────────────────────────────────────────────

export async function updateSalaryStructure(
  id: string,
  institutionId: string,
  payload: Partial<Omit<SalaryStructurePayload, "institution_id" | "staff_id">>
): Promise<{ success: true; data: SalaryStructure } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Structure ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields: (keyof Omit<SalaryStructurePayload, "institution_id" | "staff_id">)[] = [
      "basic_salary", "hra", "ta", "da", "other_allowances",
      "pf_deduction", "esi_deduction", "tds_deduction", "other_deductions", "effective_from",
    ];
    for (const f of fields) {
      if (payload[f] !== undefined) update[f] = payload[f];
    }

    const { data, error } = await supabase
      .from("salary_structures")
      .update(update)
      .eq("id", id)
      .select("*, staff(full_name, title, designation, department_id, departments!department_id(name))")
      .single();

    if (error) return { success: false, error: error.message };

    revalidateSalary(institutionId);
    return { success: true, data: data as unknown as SalaryStructure };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getDisbursements ──────────────────────────────────────────────────────────

export async function getDisbursements(
  institutionId: string,
  month: string
): Promise<{ success: true; data: SalaryDisbursement[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };
  if (!month)         return { success: false, error: "Month is required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("salary_disbursements")
      .select("*, staff(full_name, title, designation)")
      .eq("institution_id", institutionId)
      .eq("month", month)
      .order("staff(full_name)", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as SalaryDisbursement[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── generateMonthlyDisbursements ──────────────────────────────────────────────

export async function generateMonthlyDisbursements(
  institutionId: string,
  month: string
): Promise<
  | { success: true; data: { generated: number; skipped: number } }
  | { success: false; error: string }
> {
  if (!institutionId) return { success: false, error: "Institution ID required." };
  if (!month)         return { success: false, error: "Month is required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // Get all active structures for this institution
    const { data: structures, error: strErr } = await supabase
      .from("salary_structures")
      .select("id, staff_id, net_salary")
      .eq("institution_id", institutionId)
      .eq("is_active", true);

    if (strErr) return { success: false, error: strErr.message };
    if (!structures?.length) {
      return { success: true, data: { generated: 0, skipped: 0 } };
    }

    // Get staff_ids that already have a disbursement for this month
    const { data: existing } = await supabase
      .from("salary_disbursements")
      .select("staff_id")
      .eq("institution_id", institutionId)
      .eq("month", month);

    const existingSet = new Set((existing ?? []).map(d => d.staff_id as string));
    const skipped = existingSet.size;

    const toInsert = structures
      .filter(s => !existingSet.has(s.staff_id))
      .map(s => ({
        institution_id:      institutionId,
        staff_id:            s.staff_id,
        salary_structure_id: s.id,
        month,
        amount_disbursed:    s.net_salary ?? 0,
        payment_mode:        "bank_transfer" as DisbursementMode,
        status:              "pending"      as DisbursementStatus,
      }));

    if (toInsert.length === 0) {
      return { success: true, data: { generated: 0, skipped } };
    }

    const { data: inserted, error: insErr } = await supabase
      .from("salary_disbursements")
      .insert(toInsert)
      .select("id, staff_id, month, amount_disbursed, status");
    if (insErr) return { success: false, error: insErr.message };

    await logAuditBatch(
      (inserted ?? []).map(row => ({
        institutionId,
        performedBy: user.id,
        tableName: "salary_disbursements",
        recordId: row.id as string,
        action: "INSERT" as const,
        afterData: row,
        notes: `Disbursement run generated for ${month}`,
      }))
    );

    revalidateSalary(institutionId);
    return { success: true, data: { generated: toInsert.length, skipped } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── processDisbursement ───────────────────────────────────────────────────────

export async function processDisbursement(
  disbursementId: string,
  institutionId: string,
  payload: { payment_mode: DisbursementMode; transaction_ref?: string; remarks?: string }
): Promise<{ success: true } | { success: false; error: string }> {
  if (!disbursementId) return { success: false, error: "Disbursement ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: before } = await supabase
      .from("salary_disbursements")
      .select("status, amount_disbursed, payment_mode, transaction_ref, staff_id, month")
      .eq("id", disbursementId)
      .maybeSingle();

    const { error } = await supabase
      .from("salary_disbursements")
      .update({
        status:          "processed",
        disbursed_at:    new Date().toISOString(),
        payment_mode:    payload.payment_mode,
        transaction_ref: payload.transaction_ref?.trim() || null,
        remarks:         payload.remarks?.trim() || null,
        processed_by:    user.id,
        updated_at:      new Date().toISOString(),
      })
      .eq("id", disbursementId);

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId,
      performedBy: user.id,
      tableName: "salary_disbursements",
      recordId: disbursementId,
      action: "UPDATE",
      beforeData: before ?? null,
      afterData: {
        status: "processed",
        payment_mode: payload.payment_mode,
        transaction_ref: payload.transaction_ref?.trim() || null,
      },
      notes: "Salary disbursement processed",
    });

    // Notify the staff member (fire-and-forget)
    if (before?.staff_id) {
      await notifySalaryDisbursed({
        institutionId,
        staffId: before.staff_id as string,
        month:   (before.month as string) ?? null,
        amount:  before.amount_disbursed != null ? Number(before.amount_disbursed) : null,
      });
    }

    revalidateSalary(institutionId);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── bulkProcessDisbursements ──────────────────────────────────────────────────

export async function bulkProcessDisbursements(
  disbursementIds: string[],
  institutionId: string,
  payload: { payment_mode: DisbursementMode; remarks?: string }
): Promise<
  | { success: true; data: { processed: number; failed: number } }
  | { success: false; error: string }
> {
  if (!disbursementIds.length) return { success: false, error: "No disbursements selected." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const now = new Date().toISOString();
    let processed = 0;
    let failed    = 0;

    // One before-snapshot for the whole batch (audit trail)
    const { data: beforeRows } = await supabase
      .from("salary_disbursements")
      .select("id, status, amount_disbursed, payment_mode, staff_id, month")
      .in("id", disbursementIds);
    const beforeById = new Map((beforeRows ?? []).map(r => [r.id as string, r]));

    // Process in chunks of 10 to avoid query size limits
    for (let i = 0; i < disbursementIds.length; i += 10) {
      const chunk = disbursementIds.slice(i, i + 10);
      const { error } = await supabase
        .from("salary_disbursements")
        .update({
          status:       "processed",
          disbursed_at: now,
          payment_mode: payload.payment_mode,
          remarks:      payload.remarks?.trim() || null,
          processed_by: user.id,
          updated_at:   now,
        })
        .in("id", chunk);

      if (error) { failed += chunk.length; continue; }
      processed += chunk.length;

      await logAuditBatch(
        chunk.map(id => ({
          institutionId,
          performedBy: user.id,
          tableName: "salary_disbursements",
          recordId: id,
          action: "UPDATE" as const,
          beforeData: beforeById.get(id) ?? null,
          afterData: { status: "processed", payment_mode: payload.payment_mode },
          notes: "Bulk salary disbursement run",
        }))
      );
    }

    // Notify each staff member whose disbursement was in this run (fire-and-forget)
    await notifySalaryDisbursedBulk({
      institutionId,
      staffIds: (beforeRows ?? []).map((r) => r.staff_id as string).filter(Boolean),
    });

    revalidateSalary(institutionId);
    return { success: true, data: { processed, failed } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getSalarySummary ──────────────────────────────────────────────────────────

export async function getSalarySummary(
  institutionId: string,
  month: string
): Promise<{ success: true; data: SalarySummary } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const [
      { count: totalStaff },
      { count: structuresSetup },
      { data: disbursements },
      { data: structures },
    ] = await Promise.all([
      supabase.from("staff")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .eq("is_active", true),
      supabase.from("salary_structures")
        .select("*", { count: "exact", head: true })
        .eq("institution_id", institutionId)
        .eq("is_active", true),
      supabase.from("salary_disbursements")
        .select("status, amount_disbursed")
        .eq("institution_id", institutionId)
        .eq("month", month),
      supabase.from("salary_structures")
        .select("net_salary")
        .eq("institution_id", institutionId)
        .eq("is_active", true),
    ]);

    const d        = disbursements ?? [];
    const pending  = d.filter(x => x.status === "pending").length;
    const processed = d.filter(x => x.status === "processed").length;
    const disbursed = d
      .filter(x => x.status === "processed")
      .reduce((s, x) => s + Number(x.amount_disbursed), 0);
    const payroll  = (structures ?? []).reduce((s, x) => s + Number(x.net_salary ?? 0), 0);

    return {
      success: true,
      data: {
        totalStaff:             totalStaff      ?? 0,
        structuresSetup:        structuresSetup ?? 0,
        pendingDisbursements:   pending,
        processedDisbursements: processed,
        totalPayroll:           payroll,
        totalDisbursed:         disbursed,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
