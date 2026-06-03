-- ============================================================
-- AURA: Enable RLS and add RBAC policies for students and staff
-- Allows scoped INST_ADMIN / SUPER_ADMIN to manage records,
-- and individual users to view/update their own entries.
-- ============================================================

-- ── 1. Enable Row Level Security (RLS) ──────────────────────
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- ── 2. Grant permissions to authenticated role ──────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;

-- ============================================================
-- public.students Policies
-- ============================================================

-- SELECT policy: own record OR SUPER_ADMIN OR INST_ADMIN/HOD in same tenant
DROP POLICY IF EXISTS "students rbac: select" ON public.students;
CREATE POLICY "students rbac: select"
  ON public.students FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.tenant_id = students.institution_id
        AND g.role IN ('INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role)
    )
  );

-- INSERT policy: SUPER_ADMIN or INST_ADMIN in same tenant
DROP POLICY IF EXISTS "students rbac: insert" ON public.students;
CREATE POLICY "students rbac: insert"
  ON public.students FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = students.institution_id
    )
  );

-- UPDATE policy: own record OR SUPER_ADMIN OR INST_ADMIN in same tenant
DROP POLICY IF EXISTS "students rbac: update" ON public.students;
CREATE POLICY "students rbac: update"
  ON public.students FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = students.institution_id
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = students.institution_id
    )
  );

-- DELETE policy: SUPER_ADMIN or INST_ADMIN in same tenant
DROP POLICY IF EXISTS "students rbac: delete" ON public.students;
CREATE POLICY "students rbac: delete"
  ON public.students FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = students.institution_id
    )
  );

-- ============================================================
-- public.staff Policies
-- ============================================================

-- SELECT policy: own record OR SUPER_ADMIN OR INST_ADMIN/HOD in same tenant
DROP POLICY IF EXISTS "staff rbac: select" ON public.staff;
CREATE POLICY "staff rbac: select"
  ON public.staff FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.tenant_id = staff.institution_id
        AND g.role IN ('INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role)
    )
  );

-- INSERT policy: SUPER_ADMIN or INST_ADMIN in same tenant
DROP POLICY IF EXISTS "staff rbac: insert" ON public.staff;
CREATE POLICY "staff rbac: insert"
  ON public.staff FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = staff.institution_id
    )
  );

-- UPDATE policy: own record OR SUPER_ADMIN OR INST_ADMIN in same tenant
DROP POLICY IF EXISTS "staff rbac: update" ON public.staff;
CREATE POLICY "staff rbac: update"
  ON public.staff FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = staff.institution_id
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = staff.institution_id
    )
  );

-- DELETE policy: SUPER_ADMIN or INST_ADMIN in same tenant
DROP POLICY IF EXISTS "staff rbac: delete" ON public.staff;
CREATE POLICY "staff rbac: delete"
  ON public.staff FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = staff.institution_id
    )
  );

-- ── 3. Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
