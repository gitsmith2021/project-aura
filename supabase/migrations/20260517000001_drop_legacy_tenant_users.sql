-- ============================================================
-- AURA: Drop legacy tenant_users table
--
-- institution_members is the renamed, canonical table.
-- tenant_users is a leftover legacy table.
--
-- Copies any rows missing from institution_members (by id),
-- then drops tenant_users.
-- ============================================================

-- ── Safety: backfill any missing rows ───────────────────────
-- Only copies rows whose id does not already exist in
-- institution_members. Uses only the columns guaranteed to
-- exist on both tables.
INSERT INTO public.institution_members (
  id,
  profile_id,
  institution_id,
  role,
  department_id,
  shift_id,
  status
)
SELECT
  tu.id,
  tu.profile_id,
  tu.institution_id,
  tu.role,
  tu.department_id,
  tu.shift_id,
  COALESCE(tu.status, 'ACTIVE')
FROM public.tenant_users tu
WHERE NOT EXISTS (
  SELECT 1 FROM public.institution_members im WHERE im.id = tu.id
);

-- ── Drop legacy table ────────────────────────────────────────
DROP TABLE IF EXISTS public.tenant_users;
