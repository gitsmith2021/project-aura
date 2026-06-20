-- ============================================================
-- AURA: Add title column to staff table
-- Captures honorifics: Mr, Mrs, Ms, Dr, Prof
-- ============================================================

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS title TEXT
    CHECK (title IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof'));

COMMENT ON COLUMN public.staff.title IS 'Honorific title: Mr, Mrs, Ms, Dr, Prof';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
