-- ============================================================
-- AURA: Add departments.session_type
-- Values: NORMAL | DAY | EVENING
-- ============================================================

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS session_type text;

UPDATE public.departments
SET session_type = 'NORMAL'
WHERE session_type IS NULL;

ALTER TABLE public.departments
  ALTER COLUMN session_type SET DEFAULT 'NORMAL',
  ALTER COLUMN session_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'departments_session_type_check'
      AND conrelid = 'public.departments'::regclass
  ) THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_session_type_check
      CHECK (session_type IN ('NORMAL', 'DAY', 'EVENING'));
  END IF;
END
$$;
