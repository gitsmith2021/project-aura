-- ============================================================
-- AURA: Add departments.funding_type (Aided vs Self-Financing)
-- Values: AIDED | SELF_FINANCING
-- ============================================================

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS funding_type text;

UPDATE public.departments
SET funding_type = 'AIDED'
WHERE funding_type IS NULL;

ALTER TABLE public.departments
  ALTER COLUMN funding_type SET DEFAULT 'AIDED',
  ALTER COLUMN funding_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_funding_type_check'
      AND conrelid = 'public.departments'::regclass
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_funding_type_check
      CHECK (funding_type IN ('AIDED', 'SELF_FINANCING'));
  END IF;
END
$$;
