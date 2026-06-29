# Infrastructure — Razorpay (Payments)

## Purpose

Razorpay is the online payment gateway for Aura Campus fee collection (student fee payments and reconciliation).

## Current Configuration

- **SDK:** `razorpay` `^2.9.6` ([package.json](../../package.json)).
- **Env vars (verified in code/CI):**
  - `RAZORPAY_KEY_ID` — server key id.
  - `RAZORPAY_KEY_SECRET` — **server secret** (server-only).
  - `RAZORPAY_WEBHOOK_SECRET` — HMAC secret used to verify incoming webhooks.
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID` — public key id for the browser checkout (safe to expose).
- **Webhook:** `POST /api/razorpay-webhook` — exempt from the auth redirect ([middleware.ts](../../src/utils/supabase/middleware.ts)); authenticates via **HMAC signature**. Webhook events are persisted to the `razorpay_webhook_events` table (idempotency / audit).
- Fee payment flows live in `src/actions/feePayments.ts` and related finance actions.

## Current Production Status

**Live / production** for fee collection. Test vs. live mode is configured by the keys in use — `TODO — Requires Manual Verification` (which mode the production keys are in is not derivable from the repo).

## Deployment Flow

- Keys are set in Vercel (production) and `.env.local` (local). The webhook URL (`https://<production-domain>/api/razorpay-webhook`) and its secret must be registered in the Razorpay dashboard.

## Recovery Notes

- **Leaked `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`:** rotate in the Razorpay dashboard, update Vercel + `.env.local`, re-register the webhook secret, redeploy.
- **Missed/duplicate webhooks:** the `razorpay_webhook_events` table provides an idempotent audit trail; reconcile from there.
- **Payment disputes / refunds:** handled in the Razorpay dashboard; ensure the app's fee ledger is reconciled afterwards.

## ⚠️ Security Finding

`.env.local` currently defines **`NEXT_PUBLIC_RAZORPAY_KEY_SECRET`**. Any `NEXT_PUBLIC_*` variable is **shipped to the browser**. A Razorpay *secret* must never be public. **Action:** confirm this value is not used in client code, remove the `NEXT_PUBLIC_` variant, and **rotate the secret** if it was ever deployed. Tracked in [Secrets](Secrets.md).

## Future Improvements

- Remove `NEXT_PUBLIC_RAZORPAY_KEY_SECRET` and rotate (see finding above).
- Document production vs. test key mode and the registered webhook endpoint.
- Add automated reconciliation reporting between `razorpay_webhook_events` and the fee ledger.

## Related Documents

- [Secrets](Secrets.md) · [Environment Variables](../operations/Environment Variables.md) · [Architecture Overview](../architecture/Architecture Overview.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
