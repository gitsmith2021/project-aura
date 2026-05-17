-- ============================================================
-- AURA 1.0 – Finance Module Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. FEE STRUCTURES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_structures (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id     UUID          REFERENCES departments(id) ON DELETE SET NULL,
  name              TEXT          NOT NULL,
  fee_type          TEXT          NOT NULL CHECK (fee_type IN ('tuition','hostel','exam','library','lab','other')),
  amount            NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  academic_year     TEXT          NOT NULL,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_structures_tenant ON fee_structures(tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 2. FEE PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_payments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id            UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fee_structure_id      UUID          REFERENCES fee_structures(id) ON DELETE SET NULL,
  amount_paid           NUMERIC(10,2) NOT NULL CHECK (amount_paid >= 0),
  payment_mode          TEXT          NOT NULL CHECK (payment_mode IN ('cash','upi','razorpay','bank_transfer','cheque','dd')),
  payment_status        TEXT          NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','completed','failed','refunded')),
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  receipt_number        TEXT UNIQUE,
  paid_at               TIMESTAMPTZ,
  recorded_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_payments_tenant  ON fee_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status  ON fee_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_paid_at ON fee_payments(paid_at);

-- ─────────────────────────────────────────────────────────────
-- 3. SALARY STRUCTURES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_structures (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id          UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  basic_salary      NUMERIC(10,2) NOT NULL CHECK (basic_salary >= 0),
  hra               NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (hra >= 0),
  ta                NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (ta >= 0),
  da                NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (da >= 0),
  other_allowances  NUMERIC(10,2) NOT NULL DEFAULT 0,
  pf_deduction      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (pf_deduction >= 0),
  esi_deduction     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (esi_deduction >= 0),
  tds_deduction     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (tds_deduction >= 0),
  other_deductions  NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_salary        NUMERIC(10,2) GENERATED ALWAYS AS (
    basic_salary + hra + ta + da + other_allowances
    - pf_deduction - esi_deduction - tds_deduction - other_deductions
  ) STORED,
  effective_from    DATE          NOT NULL,
  effective_to      DATE,
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salary_structures_tenant ON salary_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salary_structures_staff  ON salary_structures(staff_id);

-- ─────────────────────────────────────────────────────────────
-- 4. SALARY DISBURSEMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS salary_disbursements (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id              UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salary_structure_id   UUID          REFERENCES salary_structures(id) ON DELETE SET NULL,
  month                 TEXT          NOT NULL,
  amount_disbursed      NUMERIC(10,2) NOT NULL CHECK (amount_disbursed >= 0),
  payment_mode          TEXT          NOT NULL CHECK (payment_mode IN ('bank_transfer','cheque','cash','neft','rtgs')),
  status                TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed','on_hold')),
  disbursed_at          TIMESTAMPTZ,
  transaction_ref       TEXT,
  remarks               TEXT,
  processed_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, staff_id, month)
);
CREATE INDEX IF NOT EXISTS idx_salary_disbursements_tenant ON salary_disbursements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salary_disbursements_month  ON salary_disbursements(month);
CREATE INDEX IF NOT EXISTS idx_salary_disbursements_status ON salary_disbursements(status);

-- ─────────────────────────────────────────────────────────────
-- 5. GENERAL EXPENSES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id   UUID          REFERENCES departments(id) ON DELETE SET NULL,
  category        TEXT          NOT NULL CHECK (category IN ('utilities','maintenance','vendor','events','stationery','infrastructure','it','other')),
  description     TEXT          NOT NULL,
  amount          NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  payment_mode    TEXT          NOT NULL CHECK (payment_mode IN ('cash','upi','bank_transfer','cheque','card')),
  vendor_name     TEXT,
  receipt_url     TEXT,
  expense_date    DATE          NOT NULL,
  recorded_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant     ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_department ON expenses(department_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category   ON expenses(category);

-- ─────────────────────────────────────────────────────────────
-- 6. BUDGETS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id     UUID          REFERENCES departments(id) ON DELETE CASCADE,
  category          TEXT          NOT NULL,
  academic_year     TEXT          NOT NULL,
  allocated_amount  NUMERIC(10,2) NOT NULL CHECK (allocated_amount >= 0),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, department_id, category, academic_year)
);

-- ─────────────────────────────────────────────────────────────
-- 7. REPORTING VIEWS
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW monthly_pl AS
SELECT
  fp.tenant_id,
  DATE_TRUNC('month', fp.paid_at)::DATE          AS month,
  SUM(fp.amount_paid)                             AS total_income,
  COALESCE(e_agg.total_expenses, 0)               AS total_expenses,
  SUM(fp.amount_paid) - COALESCE(e_agg.total_expenses, 0) AS net
FROM fee_payments fp
LEFT JOIN (
  SELECT
    tenant_id,
    DATE_TRUNC('month', expense_date::TIMESTAMPTZ)::DATE AS month,
    SUM(amount) AS total_expenses
  FROM expenses
  GROUP BY tenant_id, DATE_TRUNC('month', expense_date::TIMESTAMPTZ)::DATE
) e_agg ON e_agg.tenant_id = fp.tenant_id
       AND e_agg.month = DATE_TRUNC('month', fp.paid_at)::DATE
WHERE fp.payment_status = 'completed'
GROUP BY fp.tenant_id, DATE_TRUNC('month', fp.paid_at)::DATE, e_agg.total_expenses;

CREATE OR REPLACE VIEW dept_budget_vs_actuals AS
SELECT
  b.id,
  b.tenant_id,
  b.department_id,
  b.category,
  b.academic_year,
  b.allocated_amount,
  COALESCE(SUM(e.amount), 0)                                   AS actual_spent,
  b.allocated_amount - COALESCE(SUM(e.amount), 0)              AS remaining,
  ROUND(
    (COALESCE(SUM(e.amount), 0) / NULLIF(b.allocated_amount, 0)) * 100, 2
  )                                                             AS utilisation_pct
FROM budgets b
LEFT JOIN expenses e
  ON  e.department_id = b.department_id
  AND e.category      = b.category
  AND e.tenant_id     = b.tenant_id
GROUP BY b.id, b.tenant_id, b.department_id, b.category, b.academic_year, b.allocated_amount;

CREATE OR REPLACE VIEW student_fee_summary AS
SELECT
  fs.tenant_id,
  fp.student_id,
  fs.academic_year,
  SUM(fs.amount)                                                AS total_due,
  COALESCE(SUM(CASE WHEN fp.payment_status = 'completed' THEN fp.amount_paid ELSE 0 END), 0) AS total_paid,
  SUM(fs.amount) - COALESCE(SUM(CASE WHEN fp.payment_status = 'completed' THEN fp.amount_paid ELSE 0 END), 0) AS balance_due
FROM fee_structures fs
LEFT JOIN fee_payments fp
  ON  fp.fee_structure_id = fs.id
  AND fp.tenant_id        = fs.tenant_id
GROUP BY fs.tenant_id, fp.student_id, fs.academic_year;

CREATE OR REPLACE VIEW salary_disbursement_summary AS
SELECT
  tenant_id,
  month,
  COUNT(*)                                                      AS total_staff,
  SUM(amount_disbursed)                                         AS total_disbursed,
  COUNT(*) FILTER (WHERE status = 'processed')                  AS processed_count,
  COUNT(*) FILTER (WHERE status = 'pending')                    AS pending_count,
  SUM(amount_disbursed) FILTER (WHERE status = 'processed')     AS processed_amount
FROM salary_disbursements
GROUP BY tenant_id, month;

-- ─────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- Uses private.get_user_authorizations() SECURITY DEFINER fn
-- which returns rows: (role, tenant_id, department_id, shift_id)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE fee_structures       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_structures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets              ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON fee_structures       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_payments         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON salary_structures    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON salary_disbursements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON expenses             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON budgets              TO authenticated;

-- Helper macro: returns TRUE when the calling user is SUPER_ADMIN
-- or INST_ADMIN/DEPARTMENT_HEAD scoped to the given tenant.
-- fee_structures ─────────────────────────────────────────────
DROP POLICY IF EXISTS "finance: fee_structures select" ON fee_structures;
CREATE POLICY "finance: fee_structures select"
  ON fee_structures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR g.tenant_id = fee_structures.tenant_id
    )
  );

DROP POLICY IF EXISTS "finance: fee_structures insert" ON fee_structures;
CREATE POLICY "finance: fee_structures insert"
  ON fee_structures FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = fee_structures.tenant_id)
    )
  );

DROP POLICY IF EXISTS "finance: fee_structures update" ON fee_structures;
CREATE POLICY "finance: fee_structures update"
  ON fee_structures FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = fee_structures.tenant_id)
    )
  );

DROP POLICY IF EXISTS "finance: fee_structures delete" ON fee_structures;
CREATE POLICY "finance: fee_structures delete"
  ON fee_structures FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = fee_structures.tenant_id)
    )
  );

-- fee_payments ───────────────────────────────────────────────
DROP POLICY IF EXISTS "finance: fee_payments select" ON fee_payments;
CREATE POLICY "finance: fee_payments select"
  ON fee_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR g.tenant_id = fee_payments.tenant_id
    )
  );

DROP POLICY IF EXISTS "finance: fee_payments insert" ON fee_payments;
CREATE POLICY "finance: fee_payments insert"
  ON fee_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = fee_payments.tenant_id)
    )
  );

DROP POLICY IF EXISTS "finance: fee_payments update" ON fee_payments;
CREATE POLICY "finance: fee_payments update"
  ON fee_payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = fee_payments.tenant_id)
    )
  );

DROP POLICY IF EXISTS "finance: fee_payments delete" ON fee_payments;
CREATE POLICY "finance: fee_payments delete"
  ON fee_payments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = fee_payments.tenant_id)
    )
  );

-- salary_structures ──────────────────────────────────────────
DROP POLICY IF EXISTS "finance: salary_structures select" ON salary_structures;
CREATE POLICY "finance: salary_structures select"
  ON salary_structures FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR g.tenant_id = salary_structures.tenant_id
    )
  );

DROP POLICY IF EXISTS "finance: salary_structures write" ON salary_structures;
CREATE POLICY "finance: salary_structures write"
  ON salary_structures FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = salary_structures.tenant_id)
    )
  );

-- salary_disbursements ───────────────────────────────────────
DROP POLICY IF EXISTS "finance: salary_disbursements select" ON salary_disbursements;
CREATE POLICY "finance: salary_disbursements select"
  ON salary_disbursements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR g.tenant_id = salary_disbursements.tenant_id
    )
  );

DROP POLICY IF EXISTS "finance: salary_disbursements write" ON salary_disbursements;
CREATE POLICY "finance: salary_disbursements write"
  ON salary_disbursements FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = salary_disbursements.tenant_id)
    )
  );

-- expenses ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "finance: expenses select" ON expenses;
CREATE POLICY "finance: expenses select"
  ON expenses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR g.tenant_id = expenses.tenant_id
    )
  );

DROP POLICY IF EXISTS "finance: expenses insert" ON expenses;
CREATE POLICY "finance: expenses insert"
  ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR g.tenant_id = expenses.tenant_id
    )
  );

DROP POLICY IF EXISTS "finance: expenses update" ON expenses;
CREATE POLICY "finance: expenses update"
  ON expenses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = expenses.tenant_id)
    )
  );

DROP POLICY IF EXISTS "finance: expenses delete" ON expenses;
CREATE POLICY "finance: expenses delete"
  ON expenses FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = expenses.tenant_id)
    )
  );

-- budgets ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "finance: budgets select" ON budgets;
CREATE POLICY "finance: budgets select"
  ON budgets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR g.tenant_id = budgets.tenant_id
    )
  );

DROP POLICY IF EXISTS "finance: budgets write" ON budgets;
CREATE POLICY "finance: budgets write"
  ON budgets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'SUPER_ADMIN'::public.user_role
         OR (g.role = 'INST_ADMIN'::public.user_role AND g.tenant_id = budgets.tenant_id)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 9. updated_at TRIGGER
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fee_structures_updated_at') THEN
    CREATE TRIGGER trg_fee_structures_updated_at
      BEFORE UPDATE ON fee_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fee_payments_updated_at') THEN
    CREATE TRIGGER trg_fee_payments_updated_at
      BEFORE UPDATE ON fee_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_salary_structures_updated_at') THEN
    CREATE TRIGGER trg_salary_structures_updated_at
      BEFORE UPDATE ON salary_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_salary_disbursements_updated_at') THEN
    CREATE TRIGGER trg_salary_disbursements_updated_at
      BEFORE UPDATE ON salary_disbursements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_expenses_updated_at') THEN
    CREATE TRIGGER trg_expenses_updated_at
      BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_budgets_updated_at') THEN
    CREATE TRIGGER trg_budgets_updated_at
      BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;