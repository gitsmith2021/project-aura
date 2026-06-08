-- Now that devices.tenant_id correctly references institutions(id) (see the FK
-- repointing migration), the earlier "ownership only" RLS policies on devices can
-- be supplemented with proper institution-scoped admin access — INST_ADMIN can
-- now manage NFC devices for staff in their own institution (e.g. provisioning,
-- deactivating lost devices), not just SUPER_ADMIN.

CREATE POLICY "devices rbac: inst admin manage own institution"
  ON public.devices FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'INST_ADMIN' AND g.tenant_id = devices.tenant_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'INST_ADMIN' AND g.tenant_id = devices.tenant_id)
  );

NOTIFY pgrst, 'reload schema';
