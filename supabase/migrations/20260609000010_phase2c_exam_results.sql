-- Phase 2C: Exam Results & Arrears Management
-- grade and is_arrear are GENERATED ALWAYS AS (stored) so the DB always computes
-- them correctly — no chance of stale values from the application layer.

CREATE TABLE public.exam_results (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID         NOT NULL REFERENCES public.institutions(id)    ON DELETE CASCADE,
  student_id        UUID         NOT NULL REFERENCES public.students(id)        ON DELETE CASCADE,
  exam_schedule_id  UUID                      REFERENCES public.exam_schedules(id) ON DELETE SET NULL,
  subject_id        UUID                      REFERENCES public.subjects(id)       ON DELETE SET NULL,
  subject_name      TEXT         NOT NULL,
  marks_scored      NUMERIC(5,2) NOT NULL CHECK (marks_scored >= 0),
  max_marks         INTEGER      NOT NULL DEFAULT 100 CHECK (max_marks > 0),
  pass_marks        INTEGER      NOT NULL DEFAULT 50  CHECK (pass_marks >= 0),
  -- Grade auto-computed (Indian 10-point scale: O / A+ / A / B+ / B / C / F)
  grade             TEXT         GENERATED ALWAYS AS (
    CASE
      WHEN marks_scored * 100.0 / max_marks >= 90 THEN 'O'
      WHEN marks_scored * 100.0 / max_marks >= 80 THEN 'A+'
      WHEN marks_scored * 100.0 / max_marks >= 70 THEN 'A'
      WHEN marks_scored * 100.0 / max_marks >= 60 THEN 'B+'
      WHEN marks_scored * 100.0 / max_marks >= 50 THEN 'B'
      WHEN marks_scored * 100.0 / max_marks >= 45 THEN 'C'
      ELSE 'F'
    END
  ) STORED,
  -- Arrear flag auto-set when student fails
  is_arrear         BOOLEAN      GENERATED ALWAYS AS (marks_scored < pass_marks) STORED,
  academic_year_id  UUID                      REFERENCES public.academic_years(id) ON DELETE SET NULL,
  semester          INTEGER      NOT NULL CHECK (semester BETWEEN 1 AND 12),
  entered_by        UUID                      REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- Institution members (admin / HOD / staff) can fully manage results
CREATE POLICY "exam_results: institution members can manage"
  ON public.exam_results
  FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_members WHERE profile_id = auth.uid()
    )
  );

-- Students can read only their own results
CREATE POLICY "exam_results: students can view own"
  ON public.exam_results
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE profile_id = auth.uid()
    )
  );

-- One result per student per subject per semester (updated on retakes/corrections).
-- NULLS NOT DISTINCT (PG 15+) treats NULL exam_schedule_id as equal so entries
-- without a linked exam also deduplicate correctly.
CREATE UNIQUE INDEX exam_results_student_subject_sem_uniq
  ON public.exam_results (student_id, subject_name, semester, exam_schedule_id)
  NULLS NOT DISTINCT;
