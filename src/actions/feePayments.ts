"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { logAudit } from "@/lib/auditLog";
import type { FeePayment, PaymentMode, PaymentStatus, PaymentSummary } from "@/types/finance";

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

function revalidatePayments(institutionId: string) {
  revalidatePath(`/institutions/${institutionId}/finance/fees/payments`);
  revalidatePath("/finance");
}

function generateReceiptNumber(): string {
  const year  = new Date().getFullYear();
  const rand  = Math.floor(Math.random() * 100_000).toString().padStart(5, "0");
  return `RCP-${year}-${rand}`;
}

// ── getFeePayments ────────────────────────────────────────────────────────────

export async function getFeePayments(
  institutionId: string,
  filters?: {
    status?:    PaymentStatus;
    studentId?: string;
    month?:     string;         // "YYYY-MM"
    page?:      number;
    pageSize?:  number;
  }
): Promise<
  | { success: true; data: FeePayment[]; total: number }
  | { success: false; error: string }
> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const page     = filters?.page     ?? 1;
    const pageSize = filters?.pageSize ?? 10;
    const from     = (page - 1) * pageSize;
    const to       = from + pageSize - 1;

    let query = supabase
      .from("fee_payments")
      .select(
        "id, institution_id, student_id, fee_structure_id, amount_paid, payment_mode, payment_status, razorpay_order_id, razorpay_payment_id, receipt_number, paid_at, notes, created_at, students(full_name, roll_no), fee_structures(name, fee_type)",
        { count: "exact" }
      )
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.status)    query = query.eq("payment_status", filters.status);
    if (filters?.studentId) query = query.eq("student_id",     filters.studentId);

    if (filters?.month) {
      const [y, m]  = filters.month.split("-").map(Number);
      const start   = new Date(y, m - 1, 1).toISOString();
      const end     = new Date(y, m, 1).toISOString();
      query         = query.gte("paid_at", start).lt("paid_at", end);
    }

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: (data ?? []) as unknown as FeePayment[], total: count ?? 0 };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── recordManualPayment ───────────────────────────────────────────────────────

export type ManualPaymentPayload = {
  student_id:       string;
  fee_structure_id?: string | null;
  amount_paid:      number;
  payment_mode:     PaymentMode;
  payment_status:   "completed" | "pending";
  receipt_number?:  string | null;
  paid_at?:         string | null;
  notes?:           string | null;
  institution_id:   string;
};

export async function recordManualPayment(
  payload: ManualPaymentPayload
): Promise<{ success: true; data: FeePayment } | { success: false; error: string }> {
  if (!payload.student_id)    return { success: false, error: "Student is required." };
  if (!payload.amount_paid || payload.amount_paid <= 0)
    return { success: false, error: "Amount must be greater than 0." };
  if (!payload.institution_id) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    // Auto-generate receipt number if not provided; retry once on collision
    let receiptNumber = payload.receipt_number?.trim() || generateReceiptNumber();

    const insertRow = () => ({
      student_id:       payload.student_id,
      fee_structure_id: payload.fee_structure_id ?? null,
      amount_paid:      payload.amount_paid,
      payment_mode:     payload.payment_mode,
      payment_status:   payload.payment_status,
      receipt_number:   receiptNumber,
      paid_at:          payload.payment_status === "completed"
                          ? (payload.paid_at ?? new Date().toISOString())
                          : null,
      notes:            payload.notes?.trim() || null,
      institution_id:   payload.institution_id,
      recorded_by:      user.id,
    });

    let { data, error } = await supabase
      .from("fee_payments")
      .insert(insertRow())
      .select("*, students(full_name, roll_no), fee_structures(name, fee_type)")
      .single();

    // Retry once if receipt_number collision
    if (error?.code === "23505") {
      receiptNumber = generateReceiptNumber();
      ({ data, error } = await supabase
        .from("fee_payments")
        .insert(insertRow())
        .select("*, students(full_name, roll_no), fee_structures(name, fee_type)")
        .single());
    }

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institution_id,
      performedBy: user.id,
      tableName: "fee_payments",
      recordId: (data as { id: string }).id,
      action: "INSERT",
      afterData: {
        student_id: payload.student_id,
        amount_paid: payload.amount_paid,
        payment_mode: payload.payment_mode,
        payment_status: payload.payment_status,
        receipt_number: receiptNumber,
      },
      notes: "Manual payment recorded",
    });

    revalidatePayments(payload.institution_id);
    return { success: true, data: data as unknown as FeePayment };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── createRazorpayOrder ───────────────────────────────────────────────────────

export async function createRazorpayOrder(payload: {
  amount:          number;   // in INR
  studentId:       string;
  feeStructureId:  string;
  institutionId:   string;
}): Promise<
  | { success: true; orderId: string; amount: number; currency: string; keyId: string; feePaymentId: string }
  | { success: false; error: string }
> {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return { success: false, error: "Razorpay credentials not configured." };
  }
  if (!payload.amount || payload.amount <= 0) {
    return { success: false, error: "Amount must be greater than 0." };
  }

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    // Dynamic import avoids SSR issues when env vars are missing
    const Razorpay = (await import("razorpay")).default;
    const rzp      = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await rzp.orders.create({
      amount:   Math.round(payload.amount * 100), // paise
      currency: "INR",
      receipt:  `rcpt_${Date.now()}`,
    });

    // Create a pending payment row so we can update it on webhook/verify
    const { data: paymentRow, error: dbErr } = await supabase
      .from("fee_payments")
      .insert({
        institution_id:    payload.institutionId,
        student_id:        payload.studentId,
        fee_structure_id:  payload.feeStructureId,
        amount_paid:       payload.amount,
        payment_mode:      "razorpay" as PaymentMode,
        payment_status:    "pending",
        razorpay_order_id: order.id,
        receipt_number:    generateReceiptNumber(),
        recorded_by:       user.id,
      })
      .select("id")
      .single();

    if (dbErr) return { success: false, error: dbErr.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "fee_payments",
      recordId: paymentRow.id as string,
      action: "INSERT",
      afterData: {
        student_id: payload.studentId,
        amount_paid: payload.amount,
        payment_mode: "razorpay",
        payment_status: "pending",
        razorpay_order_id: order.id,
      },
      notes: "Razorpay order created (pending payment)",
    });

    return {
      success:       true,
      orderId:       order.id,
      amount:        payload.amount,
      currency:      "INR",
      keyId,
      feePaymentId:  paymentRow.id,
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── verifyRazorpayPayment ─────────────────────────────────────────────────────

export async function verifyRazorpayPayment(payload: {
  razorpay_order_id:   string;
  razorpay_payment_id: string;
  razorpay_signature:  string;
  fee_payment_id:      string;
  institutionId:       string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return { success: false, error: "Razorpay not configured." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    // Verify HMAC-SHA256 signature
    const body     = payload.razorpay_order_id + "|" + payload.razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    const isValid = expected === payload.razorpay_signature;

    const { data: before } = await supabase
      .from("fee_payments")
      .select("payment_status, razorpay_payment_id, paid_at")
      .eq("id", payload.fee_payment_id)
      .maybeSingle();

    const { error } = await supabase
      .from("fee_payments")
      .update({
        payment_status:      isValid ? "completed" : "failed",
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_signature:  payload.razorpay_signature,
        paid_at:             isValid ? new Date().toISOString() : null,
        updated_at:          new Date().toISOString(),
      })
      .eq("id", payload.fee_payment_id);

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId: payload.institutionId,
      performedBy: user.id,
      tableName: "fee_payments",
      recordId: payload.fee_payment_id,
      action: "UPDATE",
      beforeData: before ?? null,
      afterData: {
        payment_status: isValid ? "completed" : "failed",
        razorpay_payment_id: payload.razorpay_payment_id,
      },
      notes: isValid
        ? "Razorpay checkout signature verified"
        : "Razorpay checkout signature INVALID — marked failed",
    });

    revalidatePayments(payload.institutionId);

    if (!isValid) return { success: false, error: "Payment verification failed: invalid signature." };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── getPaymentSummary ─────────────────────────────────────────────────────────

export async function getPaymentSummary(
  institutionId: string
): Promise<{ success: true; data: PaymentSummary } | { success: false; error: string }> {
  if (!institutionId) return { success: false, error: "Institution ID required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const base = () =>
      supabase.from("fee_payments").select("amount_paid, payment_mode").eq("institution_id", institutionId);

    const [collected, pending, failed, all] = await Promise.all([
      base().eq("payment_status", "completed"),
      base().eq("payment_status", "pending"),
      base().eq("payment_status", "failed"),
      base(),
    ]);

    const sum   = (rows: { amount_paid: number }[] | null) =>
      (rows ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);

    const modes: PaymentMode[] = ["cash", "upi", "razorpay", "bank_transfer", "cheque", "dd"];
    const countByMode = modes.reduce<Record<PaymentMode, number>>((acc, m) => {
      acc[m] = (all.data ?? []).filter(r => r.payment_mode === m).length;
      return acc;
    }, {} as Record<PaymentMode, number>);

    return {
      success: true,
      data: {
        totalCollected:    sum(collected.data as { amount_paid: number }[]),
        totalPending:      sum(pending.data   as { amount_paid: number }[]),
        totalFailed:       (failed.data ?? []).length,
        totalTransactions: (all.data ?? []).length,
        countByMode,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}

// ── markPaymentCompleted ──────────────────────────────────────────────────────

export async function markPaymentCompleted(
  paymentId: string,
  institutionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  if (!paymentId) return { success: false, error: "Payment ID required." };

  try {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized." };

    const { data: before } = await supabase
      .from("fee_payments")
      .select("payment_status, paid_at, amount_paid, student_id")
      .eq("id", paymentId)
      .maybeSingle();

    const { error } = await supabase
      .from("fee_payments")
      .update({
        payment_status: "completed",
        paid_at:        new Date().toISOString(),
        updated_at:     new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (error) return { success: false, error: error.message };

    await logAudit({
      institutionId,
      performedBy: user.id,
      tableName: "fee_payments",
      recordId: paymentId,
      action: "UPDATE",
      beforeData: before ?? null,
      afterData: { payment_status: "completed" },
      notes: "Manual status override: marked completed",
    });

    revalidatePayments(institutionId);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unexpected error." };
  }
}
