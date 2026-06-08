-- Many tables carry BOTH a properly-scoped "rbac"/"finance" policy AND a legacy
-- permissive "<table>: authenticated can <verb>" policy with USING(true)/WITH CHECK(true)
-- left over from initial scaffolding. The permissive ones make the scoped ones
-- pointless (Postgres OR's all permissive policies for a command together), so any
-- authenticated user can read/write data across institutions. For each table below
-- we verified the scoped policies already cover every command before dropping the
-- legacy ones — no table loses access as a result of these drops.

-- budgets: "finance: budgets write" (ALL) + "finance: budgets select" cover everything
DROP POLICY IF EXISTS "budgets: authenticated can insert" ON public.budgets;
DROP POLICY IF EXISTS "budgets: authenticated can select" ON public.budgets;
DROP POLICY IF EXISTS "budgets: authenticated can update" ON public.budgets;

-- expenses: "finance: expenses delete/insert/select/update" cover everything
DROP POLICY IF EXISTS "expenses: authenticated can delete" ON public.expenses;
DROP POLICY IF EXISTS "expenses: authenticated can insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses: authenticated can select" ON public.expenses;
DROP POLICY IF EXISTS "expenses: authenticated can update" ON public.expenses;

-- fee_payments: "finance: fee_payments delete/insert/select/update" cover everything
DROP POLICY IF EXISTS "fee_payments: authenticated can insert" ON public.fee_payments;
DROP POLICY IF EXISTS "fee_payments: authenticated can select" ON public.fee_payments;
DROP POLICY IF EXISTS "fee_payments: authenticated can update" ON public.fee_payments;

-- fee_structures: "finance: fee_structures delete/insert/select/update" cover everything
DROP POLICY IF EXISTS "fee_structures: authenticated can delete" ON public.fee_structures;
DROP POLICY IF EXISTS "fee_structures: authenticated can insert" ON public.fee_structures;
DROP POLICY IF EXISTS "fee_structures: authenticated can select" ON public.fee_structures;
DROP POLICY IF EXISTS "fee_structures: authenticated can update" ON public.fee_structures;

-- salary_disbursements: "finance: salary_disbursements write" (ALL) + "... select" cover everything
DROP POLICY IF EXISTS "salary_disbursements: authenticated can insert" ON public.salary_disbursements;
DROP POLICY IF EXISTS "salary_disbursements: authenticated can select" ON public.salary_disbursements;
DROP POLICY IF EXISTS "salary_disbursements: authenticated can update" ON public.salary_disbursements;

-- salary_structures: "finance: salary_structures write" (ALL) + "... select" cover everything
DROP POLICY IF EXISTS "salary_structures: authenticated can insert" ON public.salary_structures;
DROP POLICY IF EXISTS "salary_structures: authenticated can select" ON public.salary_structures;
DROP POLICY IF EXISTS "salary_structures: authenticated can update" ON public.salary_structures;

-- staff: "staff rbac: delete/insert/select/update" cover everything
DROP POLICY IF EXISTS "staff: authenticated can delete" ON public.staff;
DROP POLICY IF EXISTS "staff: authenticated can insert" ON public.staff;
DROP POLICY IF EXISTS "staff: authenticated can select" ON public.staff;
DROP POLICY IF EXISTS "staff: authenticated can update" ON public.staff;

-- students: "students rbac: delete/insert/select/update" cover everything
DROP POLICY IF EXISTS "students: authenticated can delete" ON public.students;
DROP POLICY IF EXISTS "students: authenticated can insert" ON public.students;
DROP POLICY IF EXISTS "students: authenticated can select" ON public.students;
DROP POLICY IF EXISTS "students: authenticated can update" ON public.students;

-- institution_members: "... select own and scoped admins / insert|update|delete super and inst admin" cover everything
DROP POLICY IF EXISTS "institution_members: authenticated can insert" ON public.institution_members;
DROP POLICY IF EXISTS "institution_members: authenticated can select" ON public.institution_members;
DROP POLICY IF EXISTS "institution_members: authenticated can update" ON public.institution_members;


-- departments: unlike the tables above, this one has NO scoped write policy at all —
-- "departments rbac: write authenticated" is itself permissive (USING/CHECK true), and
-- "departments rbac: read tenant scope" is a permissive SELECT (any authenticated user
-- can see departments across every institution). Replace both with scoped versions.
DROP POLICY IF EXISTS "departments rbac: write authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments rbac: read tenant scope" ON public.departments;

CREATE POLICY "departments rbac: select own institution"
  ON public.departments FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
               WHERE g.tenant_id = departments.institution_id)
  );

CREATE POLICY "departments rbac: manage own institution"
  ON public.departments FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
               WHERE g.role = 'INST_ADMIN' AND g.tenant_id = departments.institution_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
               WHERE g.role = 'INST_ADMIN' AND g.tenant_id = departments.institution_id)
  );


-- institutions: had ONLY permissive policies (any authenticated user could read/write
-- every institution row). Replace with: members can see their own institution,
-- SUPER_ADMIN can manage all, INST_ADMIN can update their own institution's settings.
DROP POLICY IF EXISTS "institutions: authenticated can delete" ON public.institutions;
DROP POLICY IF EXISTS "institutions: authenticated can insert" ON public.institutions;
DROP POLICY IF EXISTS "institutions: authenticated can select" ON public.institutions;
DROP POLICY IF EXISTS "institutions: authenticated can update" ON public.institutions;

CREATE POLICY "institutions rbac: select own"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
               WHERE g.tenant_id = institutions.id)
  );

CREATE POLICY "institutions rbac: super admin manage"
  ON public.institutions FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                      WHERE g.role = 'SUPER_ADMIN'));

CREATE POLICY "institutions rbac: inst admin update own"
  ON public.institutions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'INST_ADMIN' AND g.tenant_id = institutions.id))
  WITH CHECK (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                      WHERE g.role = 'INST_ADMIN' AND g.tenant_id = institutions.id));


-- leave_requests: had exactly ONE policy ("authenticated can manage leave_requests",
-- ALL, USING/CHECK true) — dropping it without a replacement would lock the table out
-- entirely, so the replacement scoped policies are created in the same migration.
-- Staff manage their own requests; SUPER_ADMIN/INST_ADMIN/DEPARTMENT_HEAD manage their
-- institution's requests (e.g. to approve/reject). staff_id = auth.uid() mirrors the
-- existing "staff rbac: select/update" convention in this codebase.
DROP POLICY IF EXISTS "authenticated can manage leave_requests" ON public.leave_requests;

CREATE POLICY "leave_requests rbac: staff manage own"
  ON public.leave_requests FOR ALL
  TO authenticated
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "leave_requests rbac: admins manage institution"
  ON public.leave_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
               WHERE g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = leave_requests.institution_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
            WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
               WHERE g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = leave_requests.institution_id)
  );

NOTIFY pgrst, 'reload schema';
