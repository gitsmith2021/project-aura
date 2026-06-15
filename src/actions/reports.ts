"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import type {
  MonthlyPLData, StudentFeeReportRow, SalaryReportRow,
  BudgetReportRow, FinancialSummary,
} from "@/types/finance";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function emptyMonths(): MonthlyPLData[] {
  return MONTH_NAMES.map((m, i) => ({
    month: m, month_num: i + 1, income: 0, expenses: 0, salary: 0, net: 0,
  }));
}

// ── getMonthlyPLReport ────────────────────────────────────────────────────────

export async function getMonthlyPLReport(
  institutionId: string,
  year: string
): Promise<{ success: true; data: MonthlyPLData[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase  = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const y         = parseInt(year, 10);
    const startDate = `${y}-01-01`;
    const endDate   = `${y + 1}-01-01`;

    const [feeRes, expRes, salRes] = await Promise.all([
      supabase.from("fee_payments")
        .select("paid_at, amount_paid")
        .eq("institution_id", institutionId)
        .eq("payment_status", "completed")
        .gte("paid_at", startDate)
        .lt ("paid_at", endDate)
        .not("paid_at", "is", null),
      supabase.from("expenses")
        .select("expense_date, amount")
        .eq("institution_id", institutionId)
        .gte("expense_date", startDate)
        .lt ("expense_date", endDate),
      supabase.from("salary_disbursements")
        .select("month, amount_disbursed")
        .eq("institution_id", institutionId)
        .eq("status", "processed")
        .gte("month", `${y}-01`)
        .lte("month", `${y}-12`),
    ]);

    const months = emptyMonths();

    for (const p of feeRes.data ?? []) {
      if (!p.paid_at) continue;
      const idx = new Date(p.paid_at).getMonth();
      months[idx].income += Number(p.amount_paid);
    }
    for (const e of expRes.data ?? []) {
      const idx = new Date(e.expense_date).getMonth();
      months[idx].expenses += Number(e.amount);
    }
    for (const s of salRes.data ?? []) {
      const idx = parseInt((s.month as string).split("-")[1], 10) - 1;
      if (idx >= 0 && idx < 12) months[idx].salary += Number(s.amount_disbursed);
    }
    for (const m of months) m.net = m.income - m.expenses - m.salary;

    return { success: true, data: months };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getStudentFeeReport ───────────────────────────────────────────────────────

export async function getStudentFeeReport(
  institutionId: string,
  filters?: { academicYear?: string; departmentId?: string; status?: "fully_paid" | "partially_paid" | "unpaid" }
): Promise<{ success: true; data: StudentFeeReportRow[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // Resolve fee_structure_ids for academic year filter
    let feeStructureIds: string[] | null = null;
    if (filters?.academicYear) {
      const { data: structs } = await supabase
        .from("fee_structures")
        .select("id")
        .eq("institution_id", institutionId)
        .eq("academic_year", filters.academicYear);
      feeStructureIds = (structs ?? []).map(s => s.id as string);
      if (feeStructureIds.length === 0) return { success: true, data: [] };
    }

    // Build queries
    let studentsQ = supabase
      .from("students")
      .select("id, full_name, roll_no, student_program, student_year, department_id, departments(name)")
      .eq("institution_id", institutionId)
      .order("full_name");

    if (filters?.departmentId) studentsQ = studentsQ.eq("department_id", filters.departmentId);

    let paymentsQ = supabase
      .from("fee_payments")
      .select("student_id, amount_paid, payment_status, paid_at, fee_structure_id")
      .eq("institution_id", institutionId);

    if (feeStructureIds !== null && feeStructureIds.length > 0) {
      paymentsQ = paymentsQ.in("fee_structure_id", feeStructureIds);
    }

    const [{ data: students }, { data: payments }] = await Promise.all([studentsQ, paymentsQ]);

    // Aggregate by student
    const map = new Map<string, StudentFeeReportRow>();
    for (const s of students ?? []) {
      map.set(s.id, {
        student_id:        s.id,
        full_name:         s.full_name,
        roll_no:           s.roll_no ?? null,
        student_program:   s.student_program ?? null,
        student_year:      s.student_year ?? null,
        department_name:   (s.departments as unknown as { name: string } | null)?.name ?? null,
        total_due:         0,
        total_paid:        0,
        balance_due:       0,
        last_payment_date: null,
        status:            "unpaid",
      });
    }

    for (const p of payments ?? []) {
      const row = map.get(p.student_id);
      if (!row) continue;
      row.total_due += Number(p.amount_paid);
      if (p.payment_status === "completed") {
        row.total_paid += Number(p.amount_paid);
        if (p.paid_at && (!row.last_payment_date || p.paid_at > row.last_payment_date)) {
          row.last_payment_date = p.paid_at;
        }
      }
    }

    // Compute balance and status
    let result = Array.from(map.values()).map(row => {
      row.balance_due = row.total_due - row.total_paid;
      row.status = row.total_due === 0 || row.balance_due <= 0
        ? "fully_paid"
        : row.total_paid === 0
          ? "unpaid"
          : "partially_paid";
      return row;
    });

    // Apply status filter
    if (filters?.status) result = result.filter(r => r.status === filters.status);

    // Sort by balance_due DESC
    result.sort((a, b) => b.balance_due - a.balance_due);

    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getSalaryDisbursementReport ───────────────────────────────────────────────

export async function getSalaryDisbursementReport(
  institutionId: string,
  filters?: { month?: string; departmentId?: string; status?: string }
): Promise<{ success: true; data: SalaryReportRow[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const month = filters?.month ?? new Date().toISOString().slice(0, 7);

    let staffQ = supabase
      .from("staff")
      .select("id, full_name, title, designation, department_id, departments!department_id(name)")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("full_name");

    if (filters?.departmentId) staffQ = staffQ.eq("department_id", filters.departmentId);

    let disbQ = supabase
      .from("salary_disbursements")
      .select("staff_id, amount_disbursed, status, disbursed_at, transaction_ref, payment_mode")
      .eq("institution_id", institutionId)
      .eq("month", month);

    if (filters?.status) disbQ = disbQ.eq("status", filters.status);

    const [{ data: staff }, { data: disbursements }, { data: structures }] = await Promise.all([
      staffQ,
      disbQ,
      supabase.from("salary_structures")
        .select("staff_id, net_salary")
        .eq("institution_id", institutionId)
        .eq("is_active", true),
    ]);

    const disbMap  = new Map<string, typeof disbursements extends (infer T)[] | null ? T : never>();
    for (const d of disbursements ?? []) disbMap.set(d.staff_id, d);

    const salMap   = new Map<string, number>();
    for (const s of structures ?? []) salMap.set(s.staff_id, Number(s.net_salary ?? 0));

    const result: SalaryReportRow[] = (staff ?? []).map(s => {
      const disb = disbMap.get(s.id);
      return {
        staff_id:            s.id,
        full_name:           s.full_name,
        title:               s.title ?? null,
        designation:         s.designation ?? null,
        department_name:     (s.departments as unknown as { name: string } | null)?.name ?? null,
        net_salary:          salMap.get(s.id) ?? 0,
        disbursement_status: disb?.status ?? null,
        disbursed_at:        disb?.disbursed_at ?? null,
        transaction_ref:     disb?.transaction_ref ?? null,
        payment_mode:        disb?.payment_mode ?? null,
      };
    });

    // Filter by status if provided (handles null case for "not yet generated")
    const filtered = filters?.status
      ? result.filter(r => r.disbursement_status === filters.status)
      : result;

    return { success: true, data: filtered };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getDepartmentBudgetReport ─────────────────────────────────────────────────

export async function getDepartmentBudgetReport(
  institutionId: string,
  academicYear:  string
): Promise<{ success: true; data: BudgetReportRow[] } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // Map AY "YYYY-YY" to date range (Indian AY: April–March)
    const startYear = parseInt(academicYear.split("-")[0], 10);
    const rangeStart = `${startYear}-04-01`;
    const rangeEnd   = `${startYear + 1}-03-31`;

    const [{ data: budgets }, { data: expenses }] = await Promise.all([
      supabase.from("budgets")
        .select("*, departments(name)")
        .eq("institution_id", institutionId)
        .eq("academic_year", academicYear),
      supabase.from("expenses")
        .select("category, amount, department_id")
        .eq("institution_id", institutionId)
        .gte("expense_date", rangeStart)
        .lte("expense_date", rangeEnd),
    ]);

    const expenseData = (expenses ?? []) as { category: string; amount: number; department_id: string | null }[];

    const result: BudgetReportRow[] = (budgets ?? []).map(b => {
      const actual = expenseData
        .filter(e => e.category === b.category && e.department_id === b.department_id)
        .reduce((s, e) => s + Number(e.amount), 0);

      const allocated    = Number(b.allocated_amount);
      const remaining    = allocated - actual;
      const utilisation  = allocated > 0 ? (actual / allocated) * 100 : 0;

      return {
        department_id:   b.department_id ?? null,
        department_name: (b.departments as { name: string } | null)?.name ?? "Institution-wide",
        category:        b.category,
        academic_year:   b.academic_year,
        allocated,
        actual_spent:    actual,
        remaining,
        utilisation_pct: Math.round(utilisation * 10) / 10,
      };
    });

    return {
      success: true,
      data: result.sort((a, b) => b.utilisation_pct - a.utilisation_pct),
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getFinancialSummaryReport ─────────────────────────────────────────────────

export async function getFinancialSummaryReport(
  institutionId: string,
  dateRange: { from: string; to: string }
): Promise<{ success: true; data: FinancialSummary } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const [feeRes, expRes, salRes, feePendRes] = await Promise.all([
      supabase.from("fee_payments")
        .select("amount_paid, paid_at")
        .eq("institution_id", institutionId)
        .eq("payment_status", "completed")
        .gte("paid_at", dateRange.from)
        .lte("paid_at", dateRange.to),
      supabase.from("expenses")
        .select("amount, category, expense_date")
        .eq("institution_id", institutionId)
        .gte("expense_date", dateRange.from)
        .lte("expense_date", dateRange.to),
      supabase.from("salary_disbursements")
        .select("amount_disbursed, month")
        .eq("institution_id", institutionId)
        .eq("status", "processed"),
      supabase.from("fee_payments")
        .select("amount_paid")
        .eq("institution_id", institutionId),
    ]);

    const fees    = feeRes.data   ?? [];
    const exps    = expRes.data   ?? [];
    const sals    = salRes.data   ?? [];
    const allFees = feePendRes.data ?? [];

    const totalIncome = fees.reduce((s, r) => s + Number(r.amount_paid), 0);
    const totalExp    = exps.reduce((s, r) => s + Number(r.amount), 0);
    const totalSal    = sals.reduce((s, r) => s + Number(r.amount_disbursed), 0);
    const totalExpend = totalExp + totalSal;
    const totalDue    = allFees.reduce((s, r) => s + Number(r.amount_paid), 0);

    // Category breakdown
    const catMap = new Map<string, number>();
    for (const e of exps) catMap.set(e.category, (catMap.get(e.category) ?? 0) + Number(e.amount));
    const topExpenseCategories = Array.from(catMap, ([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Monthly income/expense for finding highest months
    const monthIncome  = new Map<string, number>();
    const monthExpense = new Map<string, number>();
    for (const f of fees) {
      if (!f.paid_at) continue;
      const m = f.paid_at.slice(0, 7);
      monthIncome.set(m, (monthIncome.get(m) ?? 0) + Number(f.amount_paid));
    }
    for (const e of exps) {
      const m = e.expense_date.slice(0, 7);
      monthExpense.set(m, (monthExpense.get(m) ?? 0) + Number(e.amount));
    }
    const highestIncomeMonth  = [...monthIncome.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const highestExpenseMonth = [...monthExpense.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return {
      success: true,
      data: {
        totalIncome,
        totalExpenditure:  totalExpend,
        netSurplus:        totalIncome - totalExpend,
        feeCollectionRate: totalDue > 0 ? (totalIncome / totalDue) * 100 : 0,
        payrollPct:        totalExpend > 0 ? (totalSal / totalExpend) * 100 : 0,
        topExpenseCategories,
        highestIncomeMonth,
        highestExpenseMonth,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── exportReportAsCSV ─────────────────────────────────────────────────────────

export async function exportReportAsCSV(
  reportType: string,
  data: Record<string, unknown>[]
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    if (!data.length) return { success: true, data: "" };

    const headers = Object.keys(data[0]);
    const rows    = data.map(row =>
      headers
        .map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [`# ${reportType}`, headers.join(","), ...rows].join("\n");
    return { success: true, data: csv };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
