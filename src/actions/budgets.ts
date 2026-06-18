"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import {
  EDITABLE_STATUSES, CATEGORY_TO_EXPENSE_CATEGORY,
  type BudgetLineCategory, type DepartmentBudget, type BudgetLineItem,
} from "@/lib/budgets";

type Result<T> = { success: true; data: T } | { success: false; error: string };

const BUDGET_COLS = "*, departments!department_id(name)";

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

/** Approve/reject is an admin-only decision — HODs may draft and submit their
 *  own department's budget (enforced by RLS) but may not decide on it. */
async function isInstitutionAdmin(supabase: ReturnType<typeof createClient>, userId: string, institutionId: string): Promise<boolean> {
  const { data } = await supabase.from("institution_members").select("role, institution_id").eq("profile_id", userId);
  return (data ?? []).some(
    (m) => m.role === "SUPER_ADMIN" || (m.institution_id === institutionId && (m.role === "INST_ADMIN" || m.role === "PRINCIPAL"))
  );
}

function revalidateBudgets(institutionId: string, departmentId?: string) {
  revalidatePath(`/institutions/${institutionId}/finance/budgets`);
  if (departmentId) revalidatePath(`/institutions/${institutionId}/finance/budgets/${departmentId}`);
}

async function recomputeTotalAllocated(supabase: ReturnType<typeof createClient>, budgetId: string) {
  const { data: items } = await supabase.from("budget_line_items").select("planned_amt").eq("budget_id", budgetId);
  const total = (items ?? []).reduce((s, i) => s + Number(i.planned_amt), 0);
  await supabase.from("department_budgets").update({ total_allocated: total, updated_at: new Date().toISOString() }).eq("id", budgetId);
}

// ── getDepartmentBudgets (admin overview — all departments for an AY) ────────

export type DepartmentBudgetRow = { department: { id: string; name: string }; budget: DepartmentBudget | null };

export async function getDepartmentBudgets(
  institutionId: string,
  academicYearId: string
): Promise<Result<DepartmentBudgetRow[]>> {
  if (!institutionId)  return { success: false, error: "Institution ID required." };
  if (!academicYearId) return { success: false, error: "Academic year is required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const [{ data: departments, error: deptErr }, { data: budgets, error: budErr }] = await Promise.all([
      supabase.from("departments").select("id, name").eq("institution_id", institutionId).order("name", { ascending: true }),
      supabase.from("department_budgets").select(`${BUDGET_COLS}, budget_line_items(*)`).eq("institution_id", institutionId).eq("academic_year_id", academicYearId),
    ]);
    if (deptErr) return { success: false, error: deptErr.message };
    if (budErr)  return { success: false, error: budErr.message };

    const byDept = new Map<string, DepartmentBudget>();
    for (const b of (budgets ?? []) as unknown as (DepartmentBudget & { budget_line_items: BudgetLineItem[] })[]) {
      byDept.set(b.department_id, { ...b, line_items: b.budget_line_items });
    }

    const rows: DepartmentBudgetRow[] = (departments ?? []).map((d) => ({
      department: { id: d.id as string, name: d.name as string },
      budget: byDept.get(d.id as string) ?? null,
    }));

    return { success: true, data: rows };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getOrCreateDepartmentBudget (detail page entry point) ────────────────────

export async function getOrCreateDepartmentBudget(
  institutionId: string,
  departmentId: string,
  academicYearId: string
): Promise<Result<DepartmentBudget>> {
  if (!institutionId)  return { success: false, error: "Institution ID required." };
  if (!departmentId)   return { success: false, error: "Department ID required." };
  if (!academicYearId) return { success: false, error: "Academic year is required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: existing, error: exErr } = await supabase
      .from("department_budgets")
      .select(`${BUDGET_COLS}, budget_line_items(*)`)
      .eq("department_id", departmentId)
      .eq("academic_year_id", academicYearId)
      .maybeSingle();
    if (exErr) return { success: false, error: exErr.message };

    if (existing) {
      const row = existing as unknown as DepartmentBudget & { budget_line_items: BudgetLineItem[] };
      return { success: true, data: { ...row, line_items: row.budget_line_items } };
    }

    const { data: created, error: insErr } = await supabase
      .from("department_budgets")
      .insert({ institution_id: institutionId, department_id: departmentId, academic_year_id: academicYearId })
      .select(BUDGET_COLS)
      .single();
    if (insErr) return { success: false, error: insErr.message };

    return { success: true, data: { ...(created as unknown as DepartmentBudget), line_items: [] } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Line items ─────────────────────────────────────────────────────────────────

export async function addLineItem(payload: {
  institutionId: string;
  budgetId: string;
  category: BudgetLineCategory;
  description: string;
  plannedAmt: number;
}): Promise<Result<BudgetLineItem>> {
  if (!payload.budgetId)            return { success: false, error: "Budget ID required." };
  if (!payload.description?.trim()) return { success: false, error: "Description is required." };
  if (!payload.plannedAmt || payload.plannedAmt <= 0) return { success: false, error: "Planned amount must be greater than 0." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: budget } = await supabase.from("department_budgets").select("status, department_id").eq("id", payload.budgetId).maybeSingle();
    if (!budget) return { success: false, error: "Budget not found." };
    if (!EDITABLE_STATUSES.includes(budget.status as DepartmentBudget["status"]))
      return { success: false, error: "This budget is locked — only draft or rejected budgets can be edited." };

    const { data, error } = await supabase
      .from("budget_line_items")
      .insert({ budget_id: payload.budgetId, category: payload.category, description: payload.description.trim(), planned_amt: payload.plannedAmt })
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };

    await recomputeTotalAllocated(supabase, payload.budgetId);
    revalidateBudgets(payload.institutionId, budget.department_id as string);
    return { success: true, data: data as unknown as BudgetLineItem };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateLineItem(payload: {
  id: string;
  institutionId: string;
  budgetId: string;
  category?: BudgetLineCategory;
  description?: string;
  plannedAmt?: number;
}): Promise<Result<null>> {
  if (!payload.id) return { success: false, error: "Line item ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: budget } = await supabase.from("department_budgets").select("status, department_id").eq("id", payload.budgetId).maybeSingle();
    if (!budget) return { success: false, error: "Budget not found." };
    if (!EDITABLE_STATUSES.includes(budget.status as DepartmentBudget["status"]))
      return { success: false, error: "This budget is locked — only draft or rejected budgets can be edited." };

    const update: Record<string, unknown> = {};
    if (payload.category)             update.category = payload.category;
    if (payload.description?.trim()) update.description = payload.description.trim();
    if (payload.plannedAmt !== undefined) update.planned_amt = payload.plannedAmt;

    const { error } = await supabase.from("budget_line_items").update(update).eq("id", payload.id);
    if (error) return { success: false, error: error.message };

    await recomputeTotalAllocated(supabase, payload.budgetId);
    revalidateBudgets(payload.institutionId, budget.department_id as string);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Actual spend tracking stays open regardless of approval status — the plan
 *  (planned_amt) is what gets locked once submitted, not the running actuals. */
export async function updateLineItemActual(payload: {
  id: string;
  institutionId: string;
  budgetId: string;
  actualAmt: number;
}): Promise<Result<null>> {
  if (!payload.id) return { success: false, error: "Line item ID required." };
  if (payload.actualAmt < 0) return { success: false, error: "Actual amount cannot be negative." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: budget } = await supabase.from("department_budgets").select("department_id").eq("id", payload.budgetId).maybeSingle();
    if (!budget) return { success: false, error: "Budget not found." };

    const { error } = await supabase.from("budget_line_items").update({ actual_amt: payload.actualAmt }).eq("id", payload.id);
    if (error) return { success: false, error: error.message };

    revalidateBudgets(payload.institutionId, budget.department_id as string);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function deleteLineItem(payload: { id: string; institutionId: string; budgetId: string }): Promise<Result<null>> {
  if (!payload.id) return { success: false, error: "Line item ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: budget } = await supabase.from("department_budgets").select("status, department_id").eq("id", payload.budgetId).maybeSingle();
    if (!budget) return { success: false, error: "Budget not found." };
    if (!EDITABLE_STATUSES.includes(budget.status as DepartmentBudget["status"]))
      return { success: false, error: "This budget is locked — only draft or rejected budgets can be edited." };

    const { error } = await supabase.from("budget_line_items").delete().eq("id", payload.id);
    if (error) return { success: false, error: error.message };

    await recomputeTotalAllocated(supabase, payload.budgetId);
    revalidateBudgets(payload.institutionId, budget.department_id as string);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── Workflow: submit / approve / reject ───────────────────────────────────────

export async function submitBudget(institutionId: string, budgetId: string): Promise<Result<null>> {
  if (!budgetId) return { success: false, error: "Budget ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: before } = await supabase
      .from("department_budgets")
      .select("status, department_id, budget_line_items(id)")
      .eq("id", budgetId)
      .maybeSingle();
    if (!before) return { success: false, error: "Budget not found." };
    if (!EDITABLE_STATUSES.includes(before.status as DepartmentBudget["status"]))
      return { success: false, error: "Only draft or rejected budgets can be submitted." };
    const lineItemCount = ((before as unknown as { budget_line_items: unknown[] }).budget_line_items ?? []).length;
    if (lineItemCount === 0) return { success: false, error: "Add at least one line item before submitting." };

    const staffId = await currentStaffId(supabase);
    const { error } = await supabase
      .from("department_budgets")
      .update({ status: "submitted", submitted_by: staffId, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", budgetId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId, performedBy: user.id, tableName: "department_budgets", recordId: budgetId,
      action: "UPDATE", beforeData: { status: before.status }, afterData: { status: "submitted" },
      notes: "Department budget submitted for approval",
    });

    revalidateBudgets(institutionId, before.department_id as string);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function approveBudget(institutionId: string, budgetId: string, adminNotes?: string): Promise<Result<null>> {
  if (!budgetId) return { success: false, error: "Budget ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };
    if (!(await isInstitutionAdmin(supabase, user.id, institutionId)))
      return { success: false, error: "Only institution admins can approve budgets." };

    const { data: before } = await supabase.from("department_budgets").select("status, department_id").eq("id", budgetId).maybeSingle();
    if (!before) return { success: false, error: "Budget not found." };
    if (before.status !== "submitted") return { success: false, error: "Only submitted budgets can be approved." };

    const { error } = await supabase
      .from("department_budgets")
      .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString(), admin_notes: adminNotes?.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", budgetId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId, performedBy: user.id, tableName: "department_budgets", recordId: budgetId,
      action: "UPDATE", beforeData: { status: "submitted" }, afterData: { status: "approved" },
      notes: "Department budget approved",
    });

    revalidateBudgets(institutionId, before.department_id as string);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function rejectBudget(institutionId: string, budgetId: string, adminNotes: string): Promise<Result<null>> {
  if (!budgetId) return { success: false, error: "Budget ID required." };
  if (!adminNotes?.trim()) return { success: false, error: "A reason is required when rejecting a budget." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };
    if (!(await isInstitutionAdmin(supabase, user.id, institutionId)))
      return { success: false, error: "Only institution admins can reject budgets." };

    const { data: before } = await supabase.from("department_budgets").select("status, department_id").eq("id", budgetId).maybeSingle();
    if (!before) return { success: false, error: "Budget not found." };
    if (before.status !== "submitted") return { success: false, error: "Only submitted budgets can be rejected." };

    const { error } = await supabase
      .from("department_budgets")
      .update({ status: "rejected", approved_by: user.id, approved_at: new Date().toISOString(), admin_notes: adminNotes.trim(), updated_at: new Date().toISOString() })
      .eq("id", budgetId);
    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId, performedBy: user.id, tableName: "department_budgets", recordId: budgetId,
      action: "UPDATE", beforeData: { status: "submitted" }, afterData: { status: "rejected" },
      notes: `Department budget rejected: ${adminNotes.trim()}`,
    });

    revalidateBudgets(institutionId, before.department_id as string);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── refreshActuals — sync from expense logger + flag PO spend ────────────────

export async function refreshActuals(
  institutionId: string,
  budgetId: string
): Promise<Result<{ updated: number; poSpend: number }>> {
  if (!budgetId) return { success: false, error: "Budget ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data: budget } = await supabase
      .from("department_budgets")
      .select("department_id, academic_year_id, budget_line_items(id, category)")
      .eq("id", budgetId)
      .maybeSingle();
    if (!budget) return { success: false, error: "Budget not found." };

    const { data: ay } = await supabase.from("academic_years").select("start_date, end_date").eq("id", budget.academic_year_id).maybeSingle();
    if (!ay) return { success: false, error: "Academic year not found." };

    const lineItems = (budget as unknown as { budget_line_items: { id: string; category: BudgetLineCategory }[] }).budget_line_items ?? [];
    let updated = 0;

    for (const item of lineItems) {
      const expenseCategory = CATEGORY_TO_EXPENSE_CATEGORY[item.category];
      if (!expenseCategory) continue; // no reliable automatic source — left for manual entry

      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("institution_id", institutionId)
        .eq("department_id", budget.department_id)
        .eq("category", expenseCategory)
        .gte("expense_date", ay.start_date)
        .lte("expense_date", ay.end_date);

      const total = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0);
      await supabase.from("budget_line_items").update({ actual_amt: total }).eq("id", item.id);
      updated++;
    }

    // Purchase orders have no per-category breakdown — surfaced as a department-level
    // figure for manual review rather than force-attributed to a specific line item.
    const { data: pos } = await supabase
      .from("purchase_orders")
      .select("total_amount, paid_at, received_at")
      .eq("institution_id", institutionId)
      .eq("department_id", budget.department_id)
      .in("status", ["received", "paid"]);

    const poSpend = (pos ?? [])
      .filter((p) => {
        const d = (p.paid_at ?? p.received_at) as string | null;
        return d && d >= ay.start_date && d <= ay.end_date;
      })
      .reduce((s, p) => s + Number(p.total_amount), 0);

    revalidateBudgets(institutionId, budget.department_id as string);
    return { success: true, data: { updated, poSpend } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
