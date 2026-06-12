-- ─────────────────────────────────────────────────────────────
-- Phase 2.5B follow-up — tighten table privileges 🔐
--
-- Supabase's default privileges GRANT ALL on new public tables to
-- anon/authenticated, which silently widened the column-level UPDATE
-- grants in 20260612160000_phase2_5b_dpdp_compliance.sql back to all
-- columns (and added DELETE). RLS still scoped *which rows* a user
-- could touch, but a user could have rewritten the audit columns of
-- their own consent rows. Revoke the defaults and re-apply only the
-- intended column-level grants.
-- ─────────────────────────────────────────────────────────────

-- data_consent_logs: consent rows immutable except withdrawn_at; no deletes
REVOKE ALL ON public.data_consent_logs FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.data_consent_logs FROM authenticated;
GRANT UPDATE (withdrawn_at) ON public.data_consent_logs TO authenticated;

-- data_erasure_requests: admins edit only the workflow columns; no deletes
REVOKE ALL ON public.data_erasure_requests FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.data_erasure_requests FROM authenticated;
GRANT UPDATE (status, admin_notes, resolved_at) ON public.data_erasure_requests TO authenticated;

NOTIFY pgrst, 'reload schema';
