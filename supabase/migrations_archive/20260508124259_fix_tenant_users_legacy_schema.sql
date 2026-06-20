-- ============================================================
-- AURA: Backfill tenant_users legacy schema to RBAC shape
-- Fixes runtime errors like: column tu.department_id does not exist
-- ============================================================

-- 1) Ensure enum exists (safe for older projects)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.user_role AS ENUM (
      'SUPER_ADMIN',
      'INST_ADMIN',
      'DEPARTMENT_HEAD',
      'STAFF',
      'STUDENT'
    );
  END IF;
END
$$;

-- 2) Ensure referenced table exists for shift_id FK
CREATE TABLE IF NOT EXISTS public.shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'Default shift',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3) Add missing tenant_users columns without breaking existing data
ALTER TABLE public.tenant_users
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS shift_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 4) Add FKs only if absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_users_department_id_fkey'
      AND conrelid = 'public.tenant_users'::regclass
  ) THEN
    ALTER TABLE public.tenant_users
      ADD CONSTRAINT tenant_users_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES public.departments(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tenant_users_shift_id_fkey'
      AND conrelid = 'public.tenant_users'::regclass
  ) THEN
    ALTER TABLE public.tenant_users
      ADD CONSTRAINT tenant_users_shift_id_fkey
      FOREIGN KEY (shift_id)
      REFERENCES public.shifts(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- 5) Recreate auth function to work with legacy role TEXT column
--    (casts only known values into enum; unknown values become NULL)
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
    tu.tenant_id,
    tu.department_id,
    tu.shift_id
  FROM public.tenant_users tu
  WHERE tu.profile_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION private.get_user_authorizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_user_authorizations() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_authorizations() TO service_role;

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
