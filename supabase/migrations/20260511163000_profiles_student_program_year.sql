-- ============================================================
-- AURA: Student program (UG/PG) and study year on profiles
-- UG: years 1–3, PG: years 1–2. Staff: both NULL.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_program text,
  ADD COLUMN IF NOT EXISTS student_year smallint;

COMMENT ON COLUMN public.profiles.student_program IS 'UG or PG for students; NULL for staff';
COMMENT ON COLUMN public.profiles.student_year IS 'Study year: 1–3 for UG, 1–2 for PG';

UPDATE public.profiles
SET student_program = NULL,
    student_year = NULL
WHERE role::text <> 'STUDENT';

UPDATE public.profiles
SET student_program = 'UG',
    student_year = 1
WHERE role::text = 'STUDENT'
  AND student_program IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_student_track_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_student_track_check
      CHECK (
        (student_program IS NULL AND student_year IS NULL)
        OR (
          student_program IN ('UG', 'PG')
          AND student_year IS NOT NULL
          AND (
            (student_program = 'UG' AND student_year BETWEEN 1 AND 3)
            OR (student_program = 'PG' AND student_year BETWEEN 1 AND 2)
          )
        )
      );
  END IF;
END
$$;
