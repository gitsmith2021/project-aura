-- ─────────────────────────────────────────────────────────────
-- Phase 2.5C — Scheduler Resilience ☁️
-- Error ledger for the Python scheduler microservice (port 8000).
-- Every failed call through callScheduler() lands here so admins
-- can see outages instead of users hitting silent failures.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scheduler_error_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID         REFERENCES public.institutions(id) ON DELETE SET NULL,
  endpoint        TEXT         NOT NULL,            -- e.g. /generate-schedule
  error_kind      TEXT         NOT NULL DEFAULT 'network'
                  CHECK (error_kind IN ('network','timeout','http_error','invalid_response')),
  status_code     INTEGER,                          -- HTTP status when error_kind = http_error
  error_message   TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_error_logs_created
  ON public.scheduler_error_logs (created_at DESC);

-- RLS on, deliberately NO policies: written only by the callScheduler()
-- wrapper via the service-role client (same pattern as razorpay_webhook_events).
-- Surfaced to admins later through the Phase 7D platform health dashboard.
ALTER TABLE public.scheduler_error_logs ENABLE ROW LEVEL SECURITY;

-- Supabase default privileges GRANT ALL on new public tables to anon/
-- authenticated — revoke them (lesson from Phase 2.5B): service-role only.
REVOKE ALL ON public.scheduler_error_logs FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
