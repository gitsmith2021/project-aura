import crypto from "crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
// RLS bypass justified: webhooks arrive from Razorpay's servers with no user
// session, so cookie-based auth is impossible. Every request is instead
// authenticated cryptographically via the HMAC-SHA256 signature below.
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Razorpay webhook receiver (Phase 2.5A).
 *
 * Security model:
 *  1. HMAC-SHA256 of the RAW request body, verified against the
 *     `x-razorpay-signature` header with a timing-safe comparison.
 *     Invalid signatures are logged to `razorpay_webhook_events`
 *     (status `rejected_signature`) and answered with 400.
 *  2. Idempotency / replay prevention: the `x-razorpay-event-id` header is
 *     recorded with a UNIQUE constraint — a duplicate or replayed event is
 *     acknowledged with 200 but never processed twice.
 *  3. Amount cross-check: a `payment.captured` event only completes a
 *     fee_payment if the captured paise amount matches the pending row.
 *
 * Configure in Razorpay Dashboard → Settings → Webhooks with events
 * `payment.captured` and `payment.failed`; the webhook secret goes in
 * RAZORPAY_WEBHOOK_SECRET.
 */

type RazorpayPaymentEntity = {
  id: string;
  order_id: string | null;
  amount: number; // paise
  status: string;
};

type RazorpayWebhookEvent = {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
  };
};

const HANDLED_EVENTS = new Set(["payment.captured", "payment.failed"]);

function timingSafeEqualHex(expected: string, received: string): boolean {
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("razorpay-webhook: RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  // Raw body BEFORE any JSON parsing — a re-serialized body breaks the HMAC.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const eventId = req.headers.get("x-razorpay-event-id") ?? null;

  const supabase = createAdminClient();

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!signature || !timingSafeEqualHex(expected, signature)) {
    // Audit the forged/misconfigured attempt. Payload is attacker-controlled:
    // store it truncated, as an opaque string.
    await supabase.from("razorpay_webhook_events").insert({
      event_id: null,
      status: "rejected_signature",
      error_message: "x-razorpay-signature missing or invalid",
      payload: { raw: rawBody.slice(0, 2000) },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Idempotency ledger ──────────────────────────────────────────────────
  // Claim the event id before processing. A duplicate delivery (Razorpay
  // retry or replay attack) hits the unique index and is acknowledged
  // without being processed again — unless the prior attempt errored, in
  // which case the retry takes the claim over.
  const { data: claim, error: claimErr } = await supabase
    .from("razorpay_webhook_events")
    .insert({
      event_id: eventId,
      event_type: event.event,
      status: "processing",
      payload: event as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  let ledgerId: string;
  if (claimErr) {
    if (claimErr.code !== "23505") {
      console.error("razorpay-webhook: ledger insert failed:", claimErr);
      return NextResponse.json({ error: "Ledger write failed" }, { status: 500 });
    }
    const { data: existing } = await supabase
      .from("razorpay_webhook_events")
      .select("id, status")
      .eq("event_id", eventId)
      .single();
    if (!existing || existing.status !== "error") {
      return NextResponse.json({ status: "duplicate", message: "Event already processed" });
    }
    // Previous attempt failed mid-flight — take over and reprocess.
    await supabase
      .from("razorpay_webhook_events")
      .update({ status: "processing", error_message: null })
      .eq("id", existing.id);
    ledgerId = existing.id;
  } else {
    ledgerId = claim.id;
  }

  const finishLedger = (fields: Record<string, unknown>) =>
    supabase
      .from("razorpay_webhook_events")
      .update({ ...fields, processed_at: new Date().toISOString() })
      .eq("id", ledgerId);

  // ── Event processing ────────────────────────────────────────────────────
  const entity = event.payload?.payment?.entity;

  if (!HANDLED_EVENTS.has(event.event) || !entity?.order_id) {
    await finishLedger({ status: "ignored" });
    return NextResponse.json({ status: "ignored" });
  }

  const { data: payment, error: lookupErr } = await supabase
    .from("fee_payments")
    .select("id, institution_id, payment_status, amount_paid")
    .eq("razorpay_order_id", entity.order_id)
    .maybeSingle();

  if (lookupErr) {
    await finishLedger({ status: "error", error_message: lookupErr.message });
    return NextResponse.json({ error: "Payment lookup failed" }, { status: 500 });
  }

  if (!payment) {
    await finishLedger({
      status: "ignored",
      razorpay_order_id: entity.order_id,
      razorpay_payment_id: entity.id,
      error_message: "No fee_payment matches this razorpay_order_id",
    });
    return NextResponse.json({ status: "ignored" });
  }

  const ledgerContext = {
    razorpay_order_id: entity.order_id,
    razorpay_payment_id: entity.id,
    fee_payment_id: payment.id,
    institution_id: payment.institution_id,
  };

  if (payment.payment_status === "completed" || payment.payment_status === "refunded") {
    // Late or out-of-order delivery — never regress a settled payment.
    await finishLedger({ ...ledgerContext, status: "ignored" });
    return NextResponse.json({ status: "ignored", message: "Payment already settled" });
  }

  if (event.event === "payment.captured") {
    const expectedPaise = Math.round(Number(payment.amount_paid) * 100);
    if (entity.amount !== expectedPaise) {
      // Genuine Razorpay signature but wrong amount — flag, never complete.
      await finishLedger({
        ...ledgerContext,
        status: "error",
        error_message: `Amount mismatch: captured ${entity.amount} paise, expected ${expectedPaise}`,
      });
      return NextResponse.json({ status: "amount_mismatch" });
    }

    const { error: updateErr } = await supabase
      .from("fee_payments")
      .update({
        payment_status: "completed",
        razorpay_payment_id: entity.id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updateErr) {
      await finishLedger({ ...ledgerContext, status: "error", error_message: updateErr.message });
      return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
    }
  } else {
    // payment.failed — only a still-pending row may move to failed.
    const { error: updateErr } = await supabase
      .from("fee_payments")
      .update({
        payment_status: "failed",
        razorpay_payment_id: entity.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .eq("payment_status", "pending");

    if (updateErr) {
      await finishLedger({ ...ledgerContext, status: "error", error_message: updateErr.message });
      return NextResponse.json({ error: "Payment update failed" }, { status: 500 });
    }
  }

  await finishLedger({ ...ledgerContext, status: "processed" });

  revalidatePath(`/institutions/${payment.institution_id}/finance/fees/payments`);
  revalidatePath("/finance");

  return NextResponse.json({ status: "processed" });
}
