-- ─────────────────────────────────────────────────────────────
-- Phase 2.5B — DPDP Act 2023 Compliance Framework 🔐
--   1. data_consent_logs     — append-style consent ledger (grant rows are
--                              immutable except withdrawn_at; satisfies
--                              "free, specific, informed, unambiguous")
--   2. data_erasure_requests — data-subject erasure queue with admin
--                              review workflow (72-hour DPDP SLA)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.data_consent_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID         NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id         UUID         NOT NULL REFERENCES auth.users(id),
  consent_type    TEXT         NOT NULL CHECK (consent_type IN (
                    'platform_terms','data_processing','marketing_comms',
                    'biometric_nfc','medical_records','photo_usage')),
  consented       BOOLEAN      NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  consented_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  withdrawn_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_consent_logs_user
  ON public.data_consent_logs (user_id, consent_type, consented_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_consent_logs_institution
  ON public.data_consent_logs (institution_id, consented_at DESC);

ALTER TABLE public.data_consent_logs ENABLE ROW LEVEL SECURITY;

-- Users see their own consent history
CREATE POLICY "consent_logs_select_own"
  ON public.data_consent_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Institution admins see the full consent audit log for their institution
CREATE POLICY "consent_logs_select_admin"
  ON public.data_consent_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = data_consent_logs.institution_id
        AND a.role IN ('SUPER_ADMIN', 'INST_ADMIN')
    )
  );

-- Users record consent only about themselves. Institution membership is not
-- required here: staff/students authenticated by email fallback may have no
-- institution_members row yet, and consent capture must never be locked out.
CREATE POLICY "consent_logs_insert_own"
  ON public.data_consent_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Withdrawal flips withdrawn_at on the user's own active row. The
-- column-level GRANT below means withdrawn_at is the ONLY column
-- authenticated can touch — grant rows are otherwise immutable.
CREATE POLICY "consent_logs_update_own"
  ON public.data_consent_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT ON public.data_consent_logs TO authenticated;
GRANT UPDATE (withdrawn_at) ON public.data_consent_logs TO authenticated;
-- Deliberately NO DELETE grant or policy: consent history is an audit trail.

-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.data_erasure_requests (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID         NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  requested_by    UUID         NOT NULL REFERENCES auth.users(id),
  subject_type    TEXT         NOT NULL CHECK (subject_type IN ('student','staff','parent')),
  subject_id      UUID         NOT NULL,
  reason          TEXT,
  status          TEXT         NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_review','completed','rejected')),
  admin_notes     TEXT,
  requested_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_erasure_requests_institution
  ON public.data_erasure_requests (institution_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_erasure_requests_requester
  ON public.data_erasure_requests (requested_by);

ALTER TABLE public.data_erasure_requests ENABLE ROW LEVEL SECURITY;

-- Requesters track their own requests
CREATE POLICY "erasure_requests_select_own"
  ON public.data_erasure_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

-- Institution admins see the full erasure queue
CREATE POLICY "erasure_requests_select_admin"
  ON public.data_erasure_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = data_erasure_requests.institution_id
        AND a.role IN ('SUPER_ADMIN', 'INST_ADMIN')
    )
  );

-- Anyone authenticated can file a request about themselves / their ward
CREATE POLICY "erasure_requests_insert_own"
  ON public.data_erasure_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Only admins move requests through the workflow. Column-level GRANT below
-- restricts them to status / admin_notes / resolved_at.
CREATE POLICY "erasure_requests_update_admin"
  ON public.data_erasure_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = data_erasure_requests.institution_id
        AND a.role IN ('SUPER_ADMIN', 'INST_ADMIN')
    )
  );

GRANT SELECT, INSERT ON public.data_erasure_requests TO authenticated;
GRANT UPDATE (status, admin_notes, resolved_at) ON public.data_erasure_requests TO authenticated;
-- No DELETE: rejected requests stay on record with their documented reason.

NOTIFY pgrst, 'reload schema';
