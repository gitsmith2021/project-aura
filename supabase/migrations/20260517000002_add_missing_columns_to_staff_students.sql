-- ============================================================
-- AURA: Add missing columns to staff and students tables
--
-- When profiles was split into staff/students, some columns
-- may not have been carried over. This migration adds them
-- idempotently (IF NOT EXISTS).
-- ============================================================

-- ── students ─────────────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS email           TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS student_program TEXT,
  ADD COLUMN IF NOT EXISTS student_year    INTEGER;

-- ── staff ────────────────────────────────────────────────────
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── Reload PostgREST schema cache ────────────────────────────
NOTIFY pgrst, 'reload schema';
