-- ============================================================
-- AURA: Fix get_user_authorizations after schema rename
--
-- tenant_users → institution_members
-- tenant_id    → institution_id
--
-- Postgres does NOT rewrite function bodies on column/table
-- renames, so private.get_user_authorizations() still referenced
-- the old names and failed at runtime.  We redefine it here to
-- query institution_members with institution_id, while keeping
-- the output column named "tenant_id" so all existing RLS
-- policies (g.tenant_id = …) continue to work unchanged.
-- ============================================================

-- ── 1. Redefine private implementation ──────────────────────
CREATE OR REPLACE FUNCTION private.get_user_authorizations()
RETURNS TABLE (
  role            public.user_role,
  tenant_id       uuid,
  department_id   uuid,
  shift_id        uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN tu.role IN ('SUPER_ADMIN', 'INST_ADMIN', 'DEPARTMENT_HEAD', 'STAFF', 'STUDENT')
      THEN tu.role::public.user_role
      ELSE NULL
    END AS role,
    tu.institution_id  AS tenant_id,
    tu.department_id,
    tu.shift_id
  FROM public.institution_members tu
  WHERE tu.profile_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION private.get_user_authorizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_user_authorizations() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_authorizations() TO service_role;

-- ── 2. Public wrapper (unchanged — delegates to private) ─────
CREATE OR REPLACE FUNCTION public.get_user_authorizations()
RETURNS TABLE (
  role            public.user_role,
  tenant_id       uuid,
  department_id   uuid,
  shift_id        uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.get_user_authorizations();
$$;

REVOKE ALL ON FUNCTION public.get_user_authorizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_authorizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_authorizations() TO service_role;

-- ── 3. Repair RLS policies on institution_members ────────────
-- The old policies referenced tenant_users.tenant_id in their
-- expressions.  After the column rename those references break.
-- Drop the old policies and recreate them using institution_id.

ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_members TO authenticated;

DROP POLICY IF EXISTS "tenant_users: select own and scoped admins"    ON public.institution_members;
DROP POLICY IF EXISTS "tenant_users: insert super and inst admin"      ON public.institution_members;
DROP POLICY IF EXISTS "tenant_users: update super and inst admin"      ON public.institution_members;
DROP POLICY IF EXISTS "tenant_users: delete super and inst admin"      ON public.institution_members;
DROP POLICY IF EXISTS "institution_members: select own and scoped admins" ON public.institution_members;
DROP POLICY IF EXISTS "institution_members: insert super and inst admin"  ON public.institution_members;
DROP POLICY IF EXISTS "institution_members: update super and inst admin"  ON public.institution_members;
DROP POLICY IF EXISTS "institution_members: delete super and inst admin"  ON public.institution_members;

CREATE POLICY "institution_members: select own and scoped admins"
  ON public.institution_members FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = institution_members.institution_id
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.tenant_id = institution_members.institution_id
        AND g.department_id IS NOT DISTINCT FROM institution_members.department_id
    )
  );

CREATE POLICY "institution_members: insert super and inst admin"
  ON public.institution_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = institution_members.institution_id
    )
  );

CREATE POLICY "institution_members: update super and inst admin"
  ON public.institution_members FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = institution_members.institution_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = institution_members.institution_id
    )
  );

CREATE POLICY "institution_members: delete super and inst admin"
  ON public.institution_members FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = institution_members.institution_id
    )
  );
