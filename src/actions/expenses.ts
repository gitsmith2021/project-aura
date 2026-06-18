"use server";

/*
  Supabase Storage setup required:
  Storage → New Bucket → Name: "receipts" → Public: true
  Receipt files are stored at path: {institution_id}/{uuid}-{filename}
*/

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  Expense, ExpenseCategory, ExpenseSummary,
  ExpensePaymentMode,
} from "@/types/finance";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

async function revalidateExpenses(institutionId: string) {
  revalidatePath(`/institutions/${institutionId}/finance/expenses`);
  revalidatePath("/finance");
}

async function currentAY(): Promise<string> {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth() + 1;
  const sy  = m >= 4 ? y : y - 1;
  return `${sy}-${String(sy + 1).slice(-2)}`;
}

const ALL_CATEGORIES: ExpenseCategory[] = [
  "utilities", "maintenance", "vendor", "events",
  "stationery", "infrastructure", "it", "other",
];

// ── getExpenses ───────────────────────────────────────────────────────────────

export async function getExpenses(
  institutionId: string,
  filters?: {
    category?:     ExpenseCategory;
    departmentId?: string;
    month?:        string;   // "YYYY-MM"
    search?:       string;
    page?:         number;
    pageSize?:     number;
  }
): Promise<
  | { success: true; data: Expense[]; total: number }
  | { success: false; error: string }
> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const page     = filters?.page     ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const from     = (page - 1) * pageSize;
    const to       = from + pageSize - 1;

    let query = supabase
      .from("expenses")
      .select("*, departments(name)", { count: "exact" })
      .eq("institution_id", institutionId)
      .order("expense_date", { ascending: false })
      .range(from, to);

    if (filters?.category)     query = query.eq("category",      filters.category);
    if (filters?.departmentId) query = query.eq("department_id", filters.departmentId);

    if (filters?.month) {
      const [y, m] = filters.month.split("-").map(Number);
      query = query
        .gte("expense_date", new Date(y, m - 1, 1).toISOString().split("T")[0])
        .lt ("expense_date", new Date(y, m, 1).toISOString().split("T")[0]);
    }

    if (filters?.search?.trim()) {
      query = query.or(
        `description.ilike.%${filters.search}%,vendor_name.ilike.%${filters.search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []) as unknown as Expense[], total: count ?? 0 };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── createExpense ─────────────────────────────────────────────────────────────

export type CreateExpensePayload = {
  institution_id: string;
  department_id?: string | null;
  category:       ExpenseCategory;
  description:    string;
  amount:         number;
  payment_mode:   ExpensePaymentMode;
  vendor_name?:   string | null;
  receipt_url?:   string | null;
  expense_date:   string;
  notes?:         string | null;
};

export async function createExpense(
  payload: CreateExpensePayload
): Promise<{ success: true; data: Expense } | { success: false; error: string }> {
  if (!payload.description?.trim()) return { success: false, error: "Description is required." };
  if (!payload.amount || payload.amount <= 0) return { success: false, error: "Amount must be > 0." };
  if (!payload.expense_date) return { success: false, error: "Expense date is required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        institution_id: payload.institution_id,
        department_id:  payload.department_id  ?? null,
        category:       payload.category,
        description:    payload.description.trim(),
        amount:         payload.amount,
        payment_mode:   payload.payment_mode,
        vendor_name:    payload.vendor_name?.trim() || null,
        receipt_url:    payload.receipt_url    ?? null,
        expense_date:   payload.expense_date,
        notes:          payload.notes?.trim()  || null,
        recorded_by:    user.id,
      })
      .select("*, departments(name)")
      .single();

    if (error) return { success: false, error: error.message };

    await revalidateExpenses(payload.institution_id);
    return { success: true, data: data as unknown as Expense };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── updateExpense ─────────────────────────────────────────────────────────────

export async function updateExpense(
  id: string,
  institutionId: string,
  payload: Partial<Omit<CreateExpensePayload, "institution_id">>
): Promise<{ success: true; data: Expense } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Expense ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    const fields: (keyof Omit<CreateExpensePayload, "institution_id">)[] = [
      "department_id", "category", "description", "amount", "payment_mode",
      "vendor_name", "receipt_url", "expense_date", "notes",
    ];
    for (const f of fields) {
      if (payload[f] !== undefined) update[f] = payload[f] ?? null;
    }

    const { data, error } = await supabase
      .from("expenses")
      .update(update)
      .eq("id", id)
      .select("*, departments(name)")
      .single();

    if (error) return { success: false, error: error.message };

    await revalidateExpenses(institutionId);
    return { success: true, data: data as unknown as Expense };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── deleteExpense ─────────────────────────────────────────────────────────────

export async function deleteExpense(
  id: string,
  institutionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!id) return { success: false, error: "Expense ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    // Get receipt URL before deletion
    const { data: existing } = await supabase
      .from("expenses")
      .select("receipt_url")
      .eq("id", id)
      .single();

    // Delete from storage if receipt exists
    if (existing?.receipt_url) {
      try {
        const url       = new URL(existing.receipt_url);
        const pathParts = url.pathname.split("/receipts/");
        if (pathParts[1]) {
          await supabase.storage.from("receipts").remove([decodeURIComponent(pathParts[1])]);
        }
      } catch { /* swallow storage delete error */ }
    }

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    await revalidateExpenses(institutionId);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getExpenseSummary ─────────────────────────────────────────────────────────

export async function getExpenseSummary(
  institutionId: string,
  month?: string   // "YYYY-MM", defaults to current month
): Promise<{ success: true; data: ExpenseSummary } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return { success: false, error: "Unauthorized." };

    const now     = new Date();
    const y       = month ? parseInt(month.split("-")[0], 10) : now.getFullYear();
    const m       = month ? parseInt(month.split("-")[1], 10) : now.getMonth() + 1;
    const mStart  = new Date(y, m - 1, 1).toISOString().split("T")[0];
    const mEnd    = new Date(y, m, 1).toISOString().split("T")[0];

    const [monthlyRes, allTimeRes] = await Promise.all([
      supabase.from("expenses")
        .select("category, amount, department_id, vendor_name, departments(name)")
        .eq("institution_id", institutionId)
        .gte("expense_date", mStart)
        .lt ("expense_date", mEnd),
      supabase.from("expenses")
        .select("category, amount, department_id, vendor_name, departments(name)")
        .eq("institution_id", institutionId),
    ]);

    const monthly  = (monthlyRes.data  ?? []) as unknown as { category: string; amount: number; vendor_name: string | null; departments: { name: string } | null }[];
    const allTime  = (allTimeRes.data  ?? []) as unknown as typeof monthly;

    // byCategory (monthly)
    const byCategory = ALL_CATEGORIES.reduce<Record<ExpenseCategory, number>>((acc, cat) => {
      acc[cat] = monthly.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
      return acc;
    }, {} as Record<ExpenseCategory, number>);

    // byDepartment (all-time)
    const deptMap = new Map<string, number>();
    for (const e of allTime) {
      const name = e.departments?.name ?? "Institution-wide";
      deptMap.set(name, (deptMap.get(name) ?? 0) + Number(e.amount));
    }
    const byDepartment = Array.from(deptMap, ([department_name, total]) => ({ department_name, total }))
      .sort((a, b) => b.total - a.total);

    // topVendors (all-time)
    const vendorMap = new Map<string, { total: number; count: number }>();
    for (const e of allTime) {
      if (!e.vendor_name) continue;
      const v = vendorMap.get(e.vendor_name) ?? { total: 0, count: 0 };
      v.total += Number(e.amount);
      v.count += 1;
      vendorMap.set(e.vendor_name, v);
    }
    const topVendors = Array.from(vendorMap, ([vendor_name, v]) => ({ vendor_name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      success: true,
      data: {
        totalExpenses:        monthly.reduce((s, e) => s + Number(e.amount), 0),
        totalExpensesAllTime: allTime.reduce((s, e) => s + Number(e.amount), 0),
        byCategory,
        byDepartment,
        topVendors,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export { currentAY };
