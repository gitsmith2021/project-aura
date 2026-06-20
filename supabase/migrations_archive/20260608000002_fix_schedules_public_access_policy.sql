-- The "schedules" table had a leftover placeholder policy from initial setup that
-- granted ALL access (including SELECT) to the public role with USING (true).
-- It was also the ONLY policy granting SELECT — the existing "schedules rbac: ..."
-- policies only covered INSERT/UPDATE/DELETE. Dropping the placeholder without a
-- replacement would have made the table unreadable, so both happen together here.

DROP POLICY IF EXISTS "Allow public access for initial setup" ON public.schedules;

CREATE POLICY "schedules rbac: select own institution"
  ON public.schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      WHERE g.role = 'SUPER_ADMIN'
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      WHERE g.tenant_id = schedules.tenant_id
    )
  );

NOTIFY pgrst, 'reload schema';
