-- ============================================================
-- AURA: Add phone column + full RLS for profiles table
-- Allows SUPER_ADMIN / INST_ADMIN to manage all profiles
-- in their tenant; individual users manage their own row.
-- ============================================================

-- ── Ensure email + phone columns exist ──────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text;

-- ── Enable RLS (idempotent) ──────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── Grant DML to authenticated role ─────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ── SELECT: own row OR admin/head in same tenant ─────────────
DROP POLICY IF EXISTS "profiles rbac: select" ON public.profiles;
CREATE POLICY "profiles rbac: select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.tenant_id = profiles.tenant_id
        AND g.role IN ('INST_ADMIN'::public.user_role, 'DEPARTMENT_HEAD'::public.user_role)
    )
  );

-- ── INSERT: SUPER_ADMIN or INST_ADMIN for the target tenant ──
DROP POLICY IF EXISTS "profiles rbac: insert" ON public.profiles;
CREATE POLICY "profiles rbac: insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = profiles.tenant_id
    )
  );

-- ── UPDATE: own row OR SUPER_ADMIN / INST_ADMIN in same tenant
DROP POLICY IF EXISTS "profiles rbac: update" ON public.profiles;
CREATE POLICY "profiles rbac: update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = profiles.tenant_id
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
        AND g.tenant_id = profiles.tenant_id
    )
  );

-- ── DELETE: SUPER_ADMIN or INST_ADMIN in same tenant ─────────
DROP POLICY IF EXISTS "profiles rbac: delete" ON public.profiles;
CREATE POLICY "profiles rbac: delete"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = profiles.tenant_id
    )
  );
