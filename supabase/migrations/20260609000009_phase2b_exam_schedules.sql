-- Phase 2B: Semester Exam Planner
-- Uses academic_year_id UUID FK from the start (consistent with 2-Pre-B pattern)

CREATE TABLE public.exam_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id    UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  subject_name     TEXT NOT NULL,
  exam_type        TEXT NOT NULL CHECK (exam_type IN ('internal','semester','arrear','supplementary')),
  exam_date        DATE NOT NULL,
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  hall_name        TEXT,
  max_marks        INTEGER NOT NULL DEFAULT 100,
  pass_marks       INTEGER NOT NULL DEFAULT 50,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  semester         INTEGER NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_schedules: institution members can manage"
  ON public.exam_schedules
  USING (institution_id IN (
    SELECT institution_id FROM public.institution_members WHERE profile_id = auth.uid()
  ));

CREATE INDEX idx_exam_schedules_institution ON public.exam_schedules(institution_id);
CREATE INDEX idx_exam_schedules_date ON public.exam_schedules(institution_id, exam_date);

NOTIFY pgrst, 'reload schema';
