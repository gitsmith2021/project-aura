DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'HOD'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'HOD';
  END IF;
END $$;

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS hod_id UUID REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE public.institution_members
  DROP CONSTRAINT IF EXISTS institution_members_role_check;

ALTER TABLE public.institution_members
  ADD CONSTRAINT institution_members_role_check
  CHECK (role IN ('SUPER_ADMIN','INST_ADMIN','HOD','DEPARTMENT_HEAD','STAFF','STUDENT'));

CREATE OR REPLACE FUNCTION private.get_user_authorizations()
RETURNS TABLE(role user_role, tenant_id uuid, department_id uuid, shift_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN tu.role IN ('SUPER_ADMIN','INST_ADMIN','HOD','DEPARTMENT_HEAD','STAFF','STUDENT')
      THEN tu.role::public.user_role
      ELSE NULL
    END AS role,
    tu.institution_id AS tenant_id,
    tu.department_id,
    tu.shift_id
  FROM public.institution_members tu
  WHERE tu.profile_id = auth.uid();
$$;
