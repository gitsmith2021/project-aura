-- Phase 7F: AISHE field-level schema additions
--
-- The AISHE annual return reports enrollment by gender and social category,
-- PwD counts, and staff by gender. None of these existed on students/staff.
-- All columns are nullable — existing rows report as "Not recorded" in the
-- AISHE export until admissions/HR backfill them (the export warns on nulls,
-- per the roadmap's "validate before export" requirement).
--
-- Roadmap source: roadmap/09 → Step 7F → "AISHE Field-Level Schema Mapping".

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gender   TEXT CHECK (gender IN ('male','female','other')),
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('general','obc','sc','st','ews','other')),
  ADD COLUMN IF NOT EXISTS is_pwd   BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS gender   TEXT CHECK (gender IN ('male','female','other'));

NOTIFY pgrst, 'reload schema';
