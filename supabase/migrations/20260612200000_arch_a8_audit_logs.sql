-- ─────────────────────────────────────────────────────────────
-- Arch A8 — Platform-Wide Audit Log 🧾  (NAAC / UGC / ISO 27001)
--
-- Single append-only ledger for every mutation of high-stakes
-- records (marks, fees, salaries, promotions, roles, leave).
-- Written ONLY by logAudit() (src/lib/auditLog.ts) via the
-- service-role client; institution admins read their own rows.
--
-- Dev Rule 17: audit logs are immutable — there is deliberately
-- no UPDATE or DELETE policy/grant, and no INSERT for users.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID         REFERENCES public.institutions(id) ON DELETE SET NULL,
  -- NULL = system action (e.g. Razorpay webhook capture) — the spec said
  -- NOT NULL, but webhooks legitimately mutate fee_payments with no user.
  performed_by   UUID         REFERENCES auth.users(id),
  table_name     TEXT         NOT NULL,    -- e.g. 'exam_results', 'fee_payments'
  record_id      UUID         NOT NULL,    -- PK of the affected row
  action         TEXT         NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','PROMOTE','REVERT')),
  before_data    JSONB,                    -- row snapshot before change (NULL for INSERT)
  after_data     JSONB,                    -- row snapshot after change (NULL for DELETE)
  ip_address     TEXT,
  user_agent     TEXT,
  notes          TEXT,                     -- human-readable reason / context
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_institution
  ON public.audit_logs (institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON public.audit_logs (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by
  ON public.audit_logs (performed_by);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Institution admins read their own institution's trail.
-- (Roles in this platform are SUPER_ADMIN / INST_ADMIN — the A8 spec's
-- 'ADMIN'/'HOD' names don't exist. HODs are excluded: the trail includes
-- salary and fee data beyond a department head's remit.)
CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = audit_logs.institution_id
        AND a.role IN ('SUPER_ADMIN', 'INST_ADMIN')
    )
  );

-- Supabase default privileges GRANT ALL on new tables — revoke (Phase 2.5B
-- lesson), then allow read-only access. Writes happen via service role only.
REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

NOTIFY pgrst, 'reload schema';
