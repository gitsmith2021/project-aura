-- Step 2-Pre-B: academic_years FK Migration for Existing Tables
-- Convert academic_year TEXT columns to academic_year_id UUID FKs in:
-- - fee_structures
-- - budgets
-- - draft_schedules

-- Drop views that depend on fee_structures.academic_year or budgets.academic_year
DROP VIEW IF EXISTS public.student_fee_summary;
DROP VIEW IF EXISTS public.dept_budget_vs_actuals;

-- 1. fee_structures
ALTER TABLE public.fee_structures
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 2. budgets
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 3. draft_schedules
ALTER TABLE public.draft_schedules
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- Backfill academic_year_id from matching label in academic_years
UPDATE public.fee_structures fs
  SET academic_year_id = ay.id
  FROM public.academic_years ay
  WHERE ay.label = fs.academic_year
    AND ay.institution_id = fs.institution_id;

UPDATE public.budgets b
  SET academic_year_id = ay.id
  FROM public.academic_years ay
  WHERE ay.label = b.academic_year
    AND ay.institution_id = b.institution_id;

UPDATE public.draft_schedules ds
  SET academic_year_id = ay.id
  FROM public.academic_years ay
  WHERE ay.label = ds.academic_year
    AND ay.institution_id = ds.institution_id;

-- Drop old text column after verifying/backfilling
ALTER TABLE public.fee_structures DROP COLUMN IF EXISTS academic_year;
ALTER TABLE public.budgets DROP COLUMN IF EXISTS academic_year;
ALTER TABLE public.draft_schedules DROP COLUMN IF EXISTS academic_year;

-- Recreate views using the new academic_year_id column
CREATE OR REPLACE VIEW public.student_fee_summary WITH (security_invoker = true) AS
SELECT
  fs.institution_id as tenant_id, -- Keep tenant_id for backward compatibility
  fp.student_id,
  fs.academic_year_id,
  SUM(fs.amount)                                                AS total_due,
  COALESCE(SUM(CASE WHEN fp.payment_status = 'completed' THEN fp.amount_paid ELSE 0 END), 0) AS total_paid,
  SUM(fs.amount) - COALESCE(SUM(CASE WHEN fp.payment_status = 'completed' THEN fp.amount_paid ELSE 0 END), 0) AS balance_due
FROM public.fee_structures fs
LEFT JOIN public.fee_payments fp
  ON  fp.fee_structure_id = fs.id
  AND fp.institution_id        = fs.institution_id
GROUP BY fs.institution_id, fp.student_id, fs.academic_year_id;

CREATE OR REPLACE VIEW public.dept_budget_vs_actuals WITH (security_invoker = true) AS
SELECT
  b.id,
  b.institution_id as tenant_id, -- Keep tenant_id for backward compatibility
  b.department_id,
  b.category,
  b.academic_year_id,
  b.allocated_amount,
  COALESCE(SUM(e.amount), 0)                                   AS actual_spent,
  b.allocated_amount - COALESCE(SUM(e.amount), 0)              AS remaining,
  ROUND(
    (COALESCE(SUM(e.amount), 0) / NULLIF(b.allocated_amount, 0)) * 100, 2
  )                                                             AS utilisation_pct
FROM public.budgets b
LEFT JOIN public.expenses e
  ON  e.department_id = b.department_id
  AND e.category      = b.category
  AND e.institution_id     = b.institution_id
GROUP BY b.id, b.institution_id, b.department_id, b.category, b.academic_year_id, b.allocated_amount;

NOTIFY pgrst, 'reload schema';
