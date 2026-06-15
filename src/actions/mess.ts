"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdHocDemand } from "@/actions/feeDemands";
import type { DayOfWeek, MealType, MessPlan, MessBill } from "@/lib/messMaintenance";

type Result<T> = { success: true; data: T } | { success: false; error: string };

export type MenuCell = { day_of_week: DayOfWeek; meal_type: MealType; menu_items: string[] };

export async function getMessMenu(hostelId: string): Promise<Result<MenuCell[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.from("mess_menu").select("day_of_week, meal_type, menu_items").eq("hostel_id", hostelId);
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as MenuCell[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function updateMessMenu(input: {
  hostelId: string; institutionId: string; day: DayOfWeek; meal: MealType; items: string[];
}): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("mess_menu")
      .upsert(
        { hostel_id: input.hostelId, day_of_week: input.day, meal_type: input.meal, menu_items: input.items, updated_at: new Date().toISOString() },
        { onConflict: "hostel_id,day_of_week,meal_type" }
      );
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${input.institutionId}/hostels/cafeteria`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export type MessBillWithStudent = MessBill & { student_name: string; roll_no: string | null };

export async function getMessBills(hostelId: string, month: string): Promise<Result<MessBillWithStudent[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase
      .from("mess_billing")
      .select("id, institution_id, student_id, hostel_id, month, plan_type, amount, is_paid, paid_at, students(full_name, roll_no)")
      .eq("hostel_id", hostelId).eq("month", month)
      .order("is_paid");
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((b) => {
        const s = b.students as unknown as { full_name: string; roll_no: string | null } | null;
        return { ...(b as unknown as MessBill), student_name: s?.full_name ?? "Unknown", roll_no: s?.roll_no ?? null };
      }),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Generate a bill for every actively-allocated student in the hostel (skips existing). */
export async function generateMessBills(input: {
  institutionId: string; hostelId: string; month: string; planType: MessPlan; amount: number;
}): Promise<Result<{ generated: number }>> {
  try {
    if (!input.month || !/^\d{4}-\d{2}$/.test(input.month)) return { success: false, error: "Pick a valid month." };
    if (input.amount <= 0) return { success: false, error: "Amount must be greater than 0." };

    const supabase = createClient(await cookies());
    const { data: allocs, error } = await supabase
      .from("hostel_allocations").select("student_id").eq("hostel_id", input.hostelId).eq("status", "active");
    if (error) return { success: false, error: error.message };
    const studentIds = Array.from(new Set((allocs ?? []).map((a) => a.student_id as string)));
    if (studentIds.length === 0) return { success: true, data: { generated: 0 } };

    const rows = studentIds.map((student_id) => ({
      institution_id: input.institutionId, student_id, hostel_id: input.hostelId,
      month: input.month, plan_type: input.planType, amount: input.amount,
    }));
    // ignore students already billed for this month (UNIQUE student_id, month)
    const { data: inserted, error: insErr } = await supabase
      .from("mess_billing")
      .upsert(rows, { onConflict: "student_id,month", ignoreDuplicates: true })
      .select("id");
    if (insErr) return { success: false, error: insErr.message };

    revalidatePath(`/institutions/${input.institutionId}/hostels/cafeteria/billing`);
    return { success: true, data: { generated: inserted?.length ?? 0 } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function markMessPaid(billId: string, institutionId: string): Promise<Result<null>> {
  try {
    const supabase = createClient(await cookies());
    const { error } = await supabase
      .from("mess_billing")
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq("id", billId).eq("institution_id", institutionId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/institutions/${institutionId}/hostels/cafeteria/billing`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

/** Post a mess bill into the central fee ledger as an ad-hoc demand (4C-1).
 *  Idempotent per bill (source_ref = bill id); due on the 28th of the billed month. */
export async function postMessBillToLedger(billId: string, institutionId: string): Promise<Result<{ created: boolean }>> {
  try {
    const supabase = createClient(await cookies());
    const { data: bill, error } = await supabase
      .from("mess_billing").select("student_id, month, amount").eq("id", billId).eq("institution_id", institutionId).maybeSingle();
    if (error) return { success: false, error: error.message };
    if (!bill) return { success: false, error: "Mess bill not found." };

    const res = await createAdHocDemand({
      institutionId,
      studentId: bill.student_id as string,
      title: `Mess charges — ${bill.month}`,
      amount: Number(bill.amount),
      dueDate: `${bill.month}-28`,
      source: "mess",
      sourceRef: billId,
    });
    if (!res.success) return res;
    revalidatePath(`/institutions/${institutionId}/hostels/cafeteria/billing`);
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

export async function getMyMessBills(): Promise<Result<MessBill[]>> {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized." };
    const { data: student } = await supabase.from("students").select("id").eq("profile_id", user.id).maybeSingle();
    if (!student) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("mess_billing")
      .select("id, institution_id, student_id, hostel_id, month, plan_type, amount, is_paid, paid_at")
      .eq("student_id", student.id as string).order("month", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as unknown as MessBill[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
