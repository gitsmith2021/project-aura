-- ─────────────────────────────────────────────────────────────
-- Phase 2.5A — Razorpay Webhook Security 🔒
-- Ledger for incoming Razorpay webhook events:
--   1. Idempotency / replay-attack prevention (UNIQUE event_id)
--   2. Audit trail of rejected (invalid-signature) attempts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS razorpay_webhook_events (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  -- x-razorpay-event-id header. UNIQUE => a replayed/duplicate event can
  -- never be processed twice. NULL for rejected-signature attempts
  -- (attacker-controlled headers are not trusted as identifiers).
  event_id             TEXT,
  event_type           TEXT,
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  institution_id       UUID         REFERENCES institutions(id) ON DELETE SET NULL,
  fee_payment_id       UUID         REFERENCES fee_payments(id) ON DELETE SET NULL,
  status               TEXT         NOT NULL DEFAULT 'processing'
                       CHECK (status IN ('processing','processed','ignored','rejected_signature','error')),
  error_message        TEXT,
  -- Raw event payload (truncated for rejected attempts) kept for audit/forensics
  payload              JSONB,
  received_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  processed_at         TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_razorpay_webhook_events_event_id
  ON razorpay_webhook_events(event_id) WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_order
  ON razorpay_webhook_events(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_received
  ON razorpay_webhook_events(received_at);

-- RLS on, and deliberately NO policies: this table is written/read only by
-- the webhook route via the service-role client. anon/authenticated get nothing.
ALTER TABLE razorpay_webhook_events ENABLE ROW LEVEL SECURITY;
