"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit, logAuditBatch } from "@/lib/auditLog";
import {
  computeMonthlyDeductions,
  DEFAULT_CONFIG,
  type StatutoryConfig,
  type DeclaredInvestments,
  type TaxRegime,
} from "@/lib/statutoryPayroll";
import type {
  StatutoryPayrollConfig,
  StaffTaxDeclaration,
  MonthlyStatutoryDeduction,
  StatutorySummary,
} from "@/types/finance";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function revalidateStatutory(institutionId: string) {
  revalidatePath(`/institutions/${institutionId}/finance/payroll/statutory`);
  revalidatePath(`/institutions/${institutionId}/finance/payroll/statutory/form16`);
}

// ── getStatutoryConfig ────────────────────────────────────────────────────────

export async function getStatutoryConfig(
  institutionId: string,
): Promise<{ success: true; data: StatutoryPayrollConfig | null } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("statutory_payroll_config")
      .select("*")
      .eq("institution_id", institutionId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as StatutoryPayrollConfig | null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── saveStatutoryConfig ───────────────────────────────────────────────────────

export async function saveStatutoryConfig(payload: {
  institutionId:   string;
  pf_employer_pct: number;
  pf_employee_pct: number;
  epf_wage_ceiling: number;
  esi_employer_pct: number;
  esi_employee_pct: number;
  esi_wage_ceiling: number;
  tan_number?:     string | null;
  pf_number?:      string | null;
  esi_number?:     string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  if (!payload.institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const row = {
      institution_id:   payload.institutionId,
      pf_employer_pct:  payload.pf_employer_pct,
      pf_employee_pct:  payload.pf_employee_pct,
      epf_wage_ceiling: payload.epf_wage_ceiling,
      esi_employer_pct: payload.esi_employer_pct,
      esi_employee_pct: payload.esi_employee_pct,
      esi_wage_ceiling: payload.esi_wage_ceiling,
      tan_number:       payload.tan_number?.trim() || null,
      pf_number:        payload.pf_number?.trim() || null,
      esi_number:       payload.esi_number?.trim() || null,
      updated_at:       new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("statutory_payroll_config")
      .select("id")
      .eq("institution_id", payload.institutionId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from("statutory_payroll_config")
        .update(row)
        .eq("id", existing.id);
      if (error) return { success: false, error: error.message };

      await logAudit({
        institutionId: payload.institutionId,
        performedBy: user.id,
        tableName: "statutory_payroll_config",
        recordId: existing.id,
        action: "UPDATE",
        afterData: row,
        notes: "Statutory payroll config updated",
      });
    } else {
      const { data: inserted, error } = await supabase
        .from("statutory_payroll_config")
        .insert(row)
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };

      await logAudit({
        institutionId: payload.institutionId,
        performedBy: user.id,
        tableName: "statutory_payroll_config",
        recordId: inserted.id as string,
        action: "INSERT",
        afterData: row,
        notes: "Statutory payroll config created",
      });
    }

    revalidateStatutory(payload.institutionId);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getMonthlyDeductions ──────────────────────────────────────────────────────

export async function getMonthlyDeductions(
  institutionId: string,
  month: string,
): Promise<{ success: true; data: MonthlyStatutoryDeduction[] } | { success: false; error: string }> {
  if (!institutionId || !month) return { success: false, error: "Institution and month required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("monthly_statutory_deductions")
      .select("*, staff(full_name, title, designation, employee_id, departments!department_id(name))")
      .eq("institution_id", institutionId)
      .eq("month", month)
      .order("staff(full_name)", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as MonthlyStatutoryDeduction[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getForm16Data ─────────────────────────────────────────────────────────────

export async function getForm16Data(
  institutionId: string,
  fyStart: number,
): Promise<{ success: true; data: MonthlyStatutoryDeduction[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // FY runs April–March
    const months: string[] = [4,5,6,7,8,9,10,11,12,1,2,3].map(m => {
      const y = m >= 4 ? fyStart : fyStart + 1;
      return `${y}-${String(m).padStart(2, "0")}`;
    });

    const { data, error } = await supabase
      .from("monthly_statutory_deductions")
      .select("*, staff(full_name, title, designation, employee_id, departments!department_id(name))")
      .eq("institution_id", institutionId)
      .in("month", months)
      .order("staff(full_name)", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as MonthlyStatutoryDeduction[] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStaffStatutoryData (for staff portal) ──────────────────────────────────

export async function getStaffStatutoryData(
  staffId: string,
): Promise<{
  success: true;
  data: { deductions: MonthlyStatutoryDeduction[]; declaration: StaffTaxDeclaration | null };
} | { success: false; error: string }> {
  if (!staffId) return { success: false, error: "Staff ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const [deductionsRes, declarationRes] = await Promise.all([
      supabase
        .from("monthly_statutory_deductions")
        .select("*")
        .eq("staff_id", staffId)
        .order("month", { ascending: false })
        .limit(24),
      supabase
        .from("staff_tax_declarations")
        .select("*")
        .eq("staff_id", staffId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      success: true,
      data: {
        deductions:  (deductionsRes.data ?? []) as unknown as MonthlyStatutoryDeduction[],
        declaration: declarationRes.data as StaffTaxDeclaration | null,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── upsertTaxDeclaration ──────────────────────────────────────────────────────

export async function upsertTaxDeclaration(payload: {
  staffId:          string;
  institutionId:    string;
  academicYearId?:  string | null;
  taxRegime:        TaxRegime;
  declared:         DeclaredInvestments;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const total =
      (payload.declared.section_80c ?? 0) +
      (payload.declared.section_80d ?? 0) +
      (payload.declared.hra_exempt  ?? 0) +
      (payload.declared.lta_exempt  ?? 0);

    const row = {
      staff_id:             payload.staffId,
      institution_id:       payload.institutionId,
      academic_year_id:     payload.academicYearId ?? null,
      tax_regime:           payload.taxRegime,
      declared_investments: payload.declared,
      total_declared:       total,
      updated_at:           new Date().toISOString(),
    };

    const { error } = await supabase
      .from("staff_tax_declarations")
      .upsert(row, { onConflict: "staff_id,academic_year_id" });

    if (error) return { success: false, error: error.message };
    revalidatePath("/staff-portal/tax-declaration");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── runMonthlyStatutoryDeductions ─────────────────────────────────────────────
// Core payroll run: compute TDS/PF/ESI for all active salaried staff with a
// salary structure, skip daily-wage staff (non-teaching_support), create/update
// monthly_statutory_deductions rows.

export async function runMonthlyStatutoryDeductions(
  institutionId: string,
  month: string,
): Promise<
  | { success: true; data: { computed: number; skipped: number; alreadyRun: number } }
  | { success: false; error: string }
> {
  if (!institutionId || !month) return { success: false, error: "Institution and month required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // Fetch institution's statutory config (or use defaults)
    const { data: configRow } = await supabase
      .from("statutory_payroll_config")
      .select("*")
      .eq("institution_id", institutionId)
      .maybeSingle();

    const config: StatutoryConfig = configRow
      ? {
          pf_employer_pct:  Number(configRow.pf_employer_pct),
          pf_employee_pct:  Number(configRow.pf_employee_pct),
          epf_wage_ceiling: Number(configRow.epf_wage_ceiling),
          esi_employer_pct: Number(configRow.esi_employer_pct),
          esi_employee_pct: Number(configRow.esi_employee_pct),
          esi_wage_ceiling: Number(configRow.esi_wage_ceiling),
        }
      : DEFAULT_CONFIG;

    // Fetch all active salary structures (skip non-teaching_support)
    const { data: structures, error: strErr } = await supabase
      .from("salary_structures")
      .select("id, staff_id, basic_salary, hra, ta, da, other_allowances, net_salary")
      .eq("institution_id", institutionId)
      .eq("is_active", true);

    if (strErr) return { success: false, error: strErr.message };

    const staffIds = (structures ?? []).map(s => s.staff_id as string);
    if (staffIds.length === 0) return { success: true, data: { computed: 0, skipped: 0, alreadyRun: 0 } };

    // Filter out daily-wage staff
    const { data: dailyWageRows } = await supabase
      .from("staff")
      .select("id")
      .in("id", staffIds)
      .eq("staff_type", "non-teaching_support");
    const dailyWageIds = new Set((dailyWageRows ?? []).map(r => r.id as string));

    const eligibleStructures = (structures ?? []).filter(s => !dailyWageIds.has(s.staff_id as string));

    // Find which staff already have a deduction row for this month
    const { data: existingRows } = await supabase
      .from("monthly_statutory_deductions")
      .select("staff_id")
      .eq("institution_id", institutionId)
      .eq("month", month)
      .in("staff_id", eligibleStructures.map(s => s.staff_id));

    const existingSet = new Set((existingRows ?? []).map(r => r.staff_id as string));
    const alreadyRun  = existingSet.size;

    const toProcess = eligibleStructures.filter(s => !existingSet.has(s.staff_id as string));
    if (toProcess.length === 0) {
      return { success: true, data: { computed: 0, skipped: eligibleStructures.length - toProcess.length, alreadyRun } };
    }

    // Fetch tax declarations for these staff
    const { data: declarations } = await supabase
      .from("staff_tax_declarations")
      .select("staff_id, tax_regime, declared_investments")
      .in("staff_id", toProcess.map(s => s.staff_id));

    const declMap = new Map(
      (declarations ?? []).map(d => [d.staff_id as string, d])
    );

    // Fetch corresponding disbursement ids for this month (may or may not exist)
    const { data: disbursements } = await supabase
      .from("salary_disbursements")
      .select("id, staff_id")
      .eq("institution_id", institutionId)
      .eq("month", month)
      .in("staff_id", toProcess.map(s => s.staff_id));
    const disbMap = new Map((disbursements ?? []).map(d => [d.staff_id as string, d.id as string]));

    const rows = toProcess.map(s => {
      const decl       = declMap.get(s.staff_id as string);
      const taxRegime: TaxRegime = (decl?.tax_regime as TaxRegime) ?? "new";
      const declared: DeclaredInvestments = (decl?.declared_investments as DeclaredInvestments) ?? {};
      const gross = Number(s.hra) + Number(s.ta) + Number(s.da) +
                    Number(s.basic_salary) + Number(s.other_allowances);
      const result = computeMonthlyDeductions(gross, Number(s.basic_salary), taxRegime, declared, config);

      return {
        institution_id:         institutionId,
        staff_id:               s.staff_id,
        salary_disbursement_id: disbMap.get(s.staff_id as string) ?? null,
        month,
        gross_salary:           result.gross_salary,
        basic_salary:           result.basic_salary,
        tds_deducted:           result.tds_monthly,
        pf_employee:            result.pf_employee,
        pf_employer:            result.pf_employer,
        esi_employee:           result.esi_employee,
        esi_employer:           result.esi_employer,
        net_salary:             result.net_salary,
        tax_regime:             result.tax_regime,
      };
    });

    const { data: inserted, error: insErr } = await supabase
      .from("monthly_statutory_deductions")
      .insert(rows)
      .select("id, staff_id, month");

    if (insErr) return { success: false, error: insErr.message };

    await logAuditBatch(
      (inserted ?? []).map(row => ({
        institutionId,
        performedBy: user.id,
        tableName: "monthly_statutory_deductions",
        recordId: row.id as string,
        action: "INSERT" as const,
        afterData: row,
        notes: `Statutory deduction run for ${month}`,
      }))
    );

    revalidateStatutory(institutionId);
    return { success: true, data: { computed: rows.length, skipped: dailyWageIds.size, alreadyRun } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStatutorySummary ───────────────────────────────────────────────────────

export async function getStatutorySummary(
  institutionId: string,
  month: string,
): Promise<{ success: true; data: StatutorySummary } | { success: false; error: string }> {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const [deductionsRes, totalStaffRes] = await Promise.all([
      supabase
        .from("monthly_statutory_deductions")
        .select("tds_deducted, pf_employee, pf_employer, esi_employee, esi_employer")
        .eq("institution_id", institutionId)
        .eq("month", month),
      supabase
        .from("salary_structures")
        .select("staff_id", { count: "exact", head: false })
        .eq("institution_id", institutionId)
        .eq("is_active", true),
    ]);

    const rows = deductionsRes.data ?? [];
    return {
      success: true,
      data: {
        totalTds:         rows.reduce((s, r) => s + Number(r.tds_deducted), 0),
        totalPfEmployee:  rows.reduce((s, r) => s + Number(r.pf_employee), 0),
        totalPfEmployer:  rows.reduce((s, r) => s + Number(r.pf_employer), 0),
        totalEsiEmployee: rows.reduce((s, r) => s + Number(r.esi_employee), 0),
        totalEsiEmployer: rows.reduce((s, r) => s + Number(r.esi_employer), 0),
        staffProcessed:   rows.length,
        staffPending:     Math.max(0, (totalStaffRes.data?.length ?? 0) - rows.length),
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
