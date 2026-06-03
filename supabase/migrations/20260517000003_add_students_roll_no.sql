-- ============================================================
-- AURA: Add roll_no column to students
-- ============================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS roll_no TEXT;

-- ── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
