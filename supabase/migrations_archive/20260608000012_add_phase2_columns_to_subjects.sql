-- Phase 2 of the roadmap (AURA_ROADMAP.md "Subjects Master Table") needs subjects to
-- carry: institution_id, code, subject_type, semester, credits, hours_per_week.
-- Every Phase 2+ module (CIA marks, curriculum units, lesson plans, guest lectures,
-- study materials) FKs to subjects(id) and many filter/group by these fields.
--
-- subjects already had a "tenant_id" column that's populated and correctly
-- FK'd to institutions(id) (verified: both seed rows resolve). Renaming it to
-- "institution_id" reuses that column instead of bolting on a redundant duplicate —
-- exactly the dead-pair anti-pattern just cleaned up on the finance tables.
-- Postgres updates dependent RLS policies/views automatically on column rename.
ALTER TABLE public.subjects RENAME COLUMN tenant_id TO institution_id;

-- "code" is nullable per the roadmap spec (not every legacy subject has one yet).
ALTER TABLE public.subjects ADD COLUMN code text;

-- subject_type/semester/credits/hours_per_week per roadmap spec. semester has no
-- sensible default (must be set explicitly), so it's added nullable; the other three
-- carry the roadmap's defaults so existing rows get sane values immediately.
ALTER TABLE public.subjects
  ADD COLUMN subject_type text NOT NULL DEFAULT 'theory'
    CHECK (subject_type IN ('theory','lab','elective','project')),
  ADD COLUMN semester integer,
  ADD COLUMN credits integer NOT NULL DEFAULT 3,
  ADD COLUMN hours_per_week integer NOT NULL DEFAULT 5;

NOTIFY pgrst, 'reload schema';
