-- ============================================================
-- AURA: Fix departments RLS for tenant-scoped RBAC
-- ============================================================

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Clean up any permissive/legacy policy names if present
DROP POLICY IF EXISTS "departments: authenticated can select" ON public.departments;
DROP POLICY IF EXISTS "departments: authenticated can insert" ON public.departments;
DROP POLICY IF EXISTS "departments: authenticated can update" ON public.departments;
DROP POLICY IF EXISTS "departments: authenticated can delete" ON public.departments;

DROP POLICY IF EXISTS "departments rbac: read tenant scope" ON public.departments;
CREATE POLICY "departments rbac: read tenant scope"
  ON public.departments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.tenant_id = departments.tenant_id
    )
  );

DROP POLICY IF EXISTS "departments rbac: insert tenant admins" ON public.departments;
CREATE POLICY "departments rbac: insert tenant admins"
  ON public.departments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = departments.tenant_id
    )
  );

DROP POLICY IF EXISTS "departments rbac: update tenant admins" ON public.departments;
CREATE POLICY "departments rbac: update tenant admins"
  ON public.departments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = departments.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = departments.tenant_id
    )
  );

DROP POLICY IF EXISTS "departments rbac: delete tenant admins" ON public.departments;
CREATE POLICY "departments rbac: delete tenant admins"
  ON public.departments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = departments.tenant_id
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
