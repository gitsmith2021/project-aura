-- Fix staff RLS SELECT/UPDATE policies to use profile_id instead of id
-- id is the staff's internal row UUID; profile_id links to auth.users

DROP POLICY IF EXISTS "staff rbac: select" ON public.staff;
DROP POLICY IF EXISTS "staff rbac: update" ON public.staff;

CREATE POLICY "staff rbac: select" ON public.staff
  FOR SELECT USING (
    (profile_id = auth.uid())
    OR (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::user_role))
    OR (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.tenant_id = staff.institution_id AND g.role = ANY (ARRAY['INST_ADMIN'::user_role, 'DEPARTMENT_HEAD'::user_role])))
  );

CREATE POLICY "staff rbac: update" ON public.staff
  FOR UPDATE USING (
    (profile_id = auth.uid())
    OR (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::user_role))
    OR (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.tenant_id = staff.institution_id AND g.role = 'INST_ADMIN'::user_role))
  )
  WITH CHECK (
    (profile_id = auth.uid())
    OR (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::user_role))
    OR (EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.tenant_id = staff.institution_id AND g.role = 'INST_ADMIN'::user_role))
  );
