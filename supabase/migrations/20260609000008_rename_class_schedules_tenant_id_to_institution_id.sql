-- Rename tenant_id → institution_id on class_schedules to match platform naming conventions

ALTER TABLE public.class_schedules
  RENAME COLUMN tenant_id TO institution_id;

-- Drop old RLS policies that reference the old column name
DROP POLICY IF EXISTS "class_schedules rbac: select own institution" ON public.class_schedules;
DROP POLICY IF EXISTS "class_schedules rbac: insert swimlanes"       ON public.class_schedules;
DROP POLICY IF EXISTS "class_schedules rbac: update swimlanes"       ON public.class_schedules;
DROP POLICY IF EXISTS "class_schedules rbac: delete swimlanes"       ON public.class_schedules;

-- Recreate policies using institution_id
CREATE POLICY "class_schedules rbac: select own institution"
  ON public.class_schedules FOR SELECT
  USING (
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.tenant_id = class_schedules.institution_id))
  );

CREATE POLICY "class_schedules rbac: insert swimlanes"
  ON public.class_schedules FOR INSERT
  WITH CHECK (
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = class_schedules.institution_id))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role AND g.department_id = class_schedules.department_id))
  );

CREATE POLICY "class_schedules rbac: update swimlanes"
  ON public.class_schedules FOR UPDATE
  USING (
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = class_schedules.institution_id))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role AND g.department_id = class_schedules.department_id))
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = class_schedules.institution_id))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role AND g.department_id = class_schedules.department_id))
  );

CREATE POLICY "class_schedules rbac: delete swimlanes"
  ON public.class_schedules FOR DELETE
  USING (
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = class_schedules.institution_id))
    OR
    (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role AND g.department_id = class_schedules.department_id))
  );

NOTIFY pgrst, 'reload schema';
