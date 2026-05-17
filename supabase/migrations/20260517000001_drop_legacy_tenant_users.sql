-- ============================================================
-- AURA: Drop legacy tenant_users view
--
-- tenant_users is a compatibility VIEW (not a table) that was
-- created to keep old queries working after the rename to
-- institution_members.  All real data lives in institution_members.
-- Now that the frontend is fully updated, the view can go.
-- ============================================================

DROP VIEW IF EXISTS public.tenant_users;
