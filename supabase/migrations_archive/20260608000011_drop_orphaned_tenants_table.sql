-- The "tenants" table is orphaned: 0 rows, no functions/views reference it, and no
-- application code queries it (the codebase's "institutions" table is the real
-- multi-tenancy anchor — see private.get_user_authorizations()).
--
-- Six finance tables (budgets, expenses, fee_payments, fee_structures,
-- salary_disbursements, salary_structures) each carry BOTH a "tenant_id" column
-- (FK -> tenants, every row NULL) AND a correctly-populated "institution_id" column
-- (FK -> institutions, matching real data). The "tenant_id" column is pure dead weight.
--
-- Worse: their existing RLS policies compare g.tenant_id (= current user's
-- institution_id, per private.get_user_authorizations()) against <table>.tenant_id —
-- which is always NULL, so that comparison can never be true. INST_ADMIN-scoped
-- access to finance data has been silently broken; only the SUPER_ADMIN branch ever
-- matched. Fix: repoint every such policy at the real "institution_id" column, drop
-- the dead "tenant_id" columns (cascading their FKs to "tenants"), then drop "tenants".

-- ── budgets ──────────────────────────────────────────────────────────────────
DROP POLICY "finance: budgets select" ON public.budgets;
DROP POLICY "finance: budgets write" ON public.budgets;

CREATE POLICY "finance: budgets select" ON public.budgets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = budgets.institution_id));

CREATE POLICY "finance: budgets write" ON public.budgets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = budgets.institution_id)));

-- ── expenses ─────────────────────────────────────────────────────────────────
DROP POLICY "finance: expenses delete" ON public.expenses;
DROP POLICY "finance: expenses insert" ON public.expenses;
DROP POLICY "finance: expenses select" ON public.expenses;
DROP POLICY "finance: expenses update" ON public.expenses;

CREATE POLICY "finance: expenses select" ON public.expenses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = expenses.institution_id));

CREATE POLICY "finance: expenses insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = expenses.institution_id));

CREATE POLICY "finance: expenses update" ON public.expenses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = expenses.institution_id)));

CREATE POLICY "finance: expenses delete" ON public.expenses FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = expenses.institution_id)));

-- ── fee_payments ─────────────────────────────────────────────────────────────
DROP POLICY "finance: fee_payments delete" ON public.fee_payments;
DROP POLICY "finance: fee_payments insert" ON public.fee_payments;
DROP POLICY "finance: fee_payments select" ON public.fee_payments;
DROP POLICY "finance: fee_payments update" ON public.fee_payments;

CREATE POLICY "finance: fee_payments select" ON public.fee_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = fee_payments.institution_id));

CREATE POLICY "finance: fee_payments insert" ON public.fee_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = fee_payments.institution_id)));

CREATE POLICY "finance: fee_payments update" ON public.fee_payments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = fee_payments.institution_id)));

CREATE POLICY "finance: fee_payments delete" ON public.fee_payments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = fee_payments.institution_id)));

-- ── fee_structures ───────────────────────────────────────────────────────────
DROP POLICY "finance: fee_structures delete" ON public.fee_structures;
DROP POLICY "finance: fee_structures insert" ON public.fee_structures;
DROP POLICY "finance: fee_structures select" ON public.fee_structures;
DROP POLICY "finance: fee_structures update" ON public.fee_structures;

CREATE POLICY "finance: fee_structures select" ON public.fee_structures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = fee_structures.institution_id));

CREATE POLICY "finance: fee_structures insert" ON public.fee_structures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = fee_structures.institution_id)));

CREATE POLICY "finance: fee_structures update" ON public.fee_structures FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = fee_structures.institution_id)));

CREATE POLICY "finance: fee_structures delete" ON public.fee_structures FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = fee_structures.institution_id)));

-- ── salary_disbursements ─────────────────────────────────────────────────────
DROP POLICY "finance: salary_disbursements select" ON public.salary_disbursements;
DROP POLICY "finance: salary_disbursements write" ON public.salary_disbursements;

CREATE POLICY "finance: salary_disbursements select" ON public.salary_disbursements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = salary_disbursements.institution_id));

CREATE POLICY "finance: salary_disbursements write" ON public.salary_disbursements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = salary_disbursements.institution_id)));

-- ── salary_structures ────────────────────────────────────────────────────────
DROP POLICY "finance: salary_structures select" ON public.salary_structures;
DROP POLICY "finance: salary_structures write" ON public.salary_structures;

CREATE POLICY "finance: salary_structures select" ON public.salary_structures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = salary_structures.institution_id));

CREATE POLICY "finance: salary_structures write" ON public.salary_structures FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
                 WHERE g.role = 'SUPER_ADMIN' OR (g.role = 'INST_ADMIN' AND g.tenant_id = salary_structures.institution_id)));

-- ── recreate the 4 finance views that join/group on the dead tenant_id column ─
-- (always NULL, so e.tenant_id = b.tenant_id etc. could never match — these
-- views' joins were silently broken too; institution_id is the populated column)
DROP VIEW public.dept_budget_vs_actuals;
DROP VIEW public.monthly_pl;
DROP VIEW public.salary_disbursement_summary;
DROP VIEW public.student_fee_summary;

CREATE VIEW public.dept_budget_vs_actuals WITH (security_invoker = true) AS
 SELECT b.id,
    b.institution_id,
    b.department_id,
    b.category,
    b.academic_year,
    b.allocated_amount,
    COALESCE(sum(e.amount), 0::numeric) AS actual_spent,
    b.allocated_amount - COALESCE(sum(e.amount), 0::numeric) AS remaining,
    round(COALESCE(sum(e.amount), 0::numeric) / NULLIF(b.allocated_amount, 0::numeric) * 100::numeric, 2) AS utilisation_pct
   FROM budgets b
     LEFT JOIN expenses e ON e.department_id = b.department_id AND e.category = b.category AND e.institution_id = b.institution_id
  GROUP BY b.id, b.institution_id, b.department_id, b.category, b.academic_year, b.allocated_amount;

CREATE VIEW public.monthly_pl WITH (security_invoker = true) AS
 SELECT fp.institution_id,
    date_trunc('month'::text, fp.paid_at)::date AS month,
    sum(fp.amount_paid) AS total_income,
    COALESCE(e_agg.total_expenses, 0::numeric) AS total_expenses,
    sum(fp.amount_paid) - COALESCE(e_agg.total_expenses, 0::numeric) AS net
   FROM fee_payments fp
     LEFT JOIN ( SELECT expenses.institution_id,
            date_trunc('month'::text, expenses.expense_date::timestamp with time zone)::date AS month,
            sum(expenses.amount) AS total_expenses
           FROM expenses
          GROUP BY expenses.institution_id, (date_trunc('month'::text, expenses.expense_date::timestamp with time zone)::date)) e_agg ON e_agg.institution_id = fp.institution_id AND e_agg.month = date_trunc('month'::text, fp.paid_at)::date
  WHERE fp.payment_status = 'completed'::text
  GROUP BY fp.institution_id, (date_trunc('month'::text, fp.paid_at)::date), e_agg.total_expenses;

CREATE VIEW public.salary_disbursement_summary WITH (security_invoker = true) AS
 SELECT institution_id,
    month,
    count(*) AS total_staff,
    sum(amount_disbursed) AS total_disbursed,
    count(*) FILTER (WHERE status = 'processed'::text) AS processed_count,
    count(*) FILTER (WHERE status = 'pending'::text) AS pending_count,
    sum(amount_disbursed) FILTER (WHERE status = 'processed'::text) AS processed_amount
   FROM salary_disbursements
  GROUP BY institution_id, month;

CREATE VIEW public.student_fee_summary WITH (security_invoker = true) AS
 SELECT fs.institution_id,
    fp.student_id,
    fs.academic_year,
    sum(fs.amount) AS total_due,
    COALESCE(sum(
        CASE
            WHEN fp.payment_status = 'completed'::text THEN fp.amount_paid
            ELSE 0::numeric
        END), 0::numeric) AS total_paid,
    sum(fs.amount) - COALESCE(sum(
        CASE
            WHEN fp.payment_status = 'completed'::text THEN fp.amount_paid
            ELSE 0::numeric
        END), 0::numeric) AS balance_due
   FROM fee_structures fs
     LEFT JOIN fee_payments fp ON fp.fee_structure_id = fs.id AND fp.institution_id = fs.institution_id
  GROUP BY fs.institution_id, fp.student_id, fs.academic_year;

-- ── drop dead tenant_id columns (cascades their FKs to "tenants") ────────────
ALTER TABLE public.budgets DROP COLUMN tenant_id;
ALTER TABLE public.expenses DROP COLUMN tenant_id;
ALTER TABLE public.fee_payments DROP COLUMN tenant_id;
ALTER TABLE public.fee_structures DROP COLUMN tenant_id;
ALTER TABLE public.salary_disbursements DROP COLUMN tenant_id;
ALTER TABLE public.salary_structures DROP COLUMN tenant_id;

-- ── drop the orphaned table itself (its lone RLS policy goes with it) ────────
DROP TABLE public.tenants;

NOTIFY pgrst, 'reload schema';
