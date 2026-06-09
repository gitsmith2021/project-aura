CREATE TABLE IF NOT EXISTS public.academic_years (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  is_current     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, label)
);

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_one_current_per_institution
  ON public.academic_years (institution_id)
  WHERE is_current = TRUE;

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academic_years: institution members can manage"
  ON public.academic_years
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE TABLE IF NOT EXISTS public.academic_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  event_type       TEXT NOT NULL CHECK (event_type IN (
                     'semester_start','semester_end','exam_window','holiday',
                     'annual_day','sports_day','expo','cultural','other')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  description      TEXT,
  is_public        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academic_events: institution members can manage"
  ON public.academic_events
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

ALTER TABLE public.teaching_assignments
  ADD CONSTRAINT teaching_assignments_academic_year_id_fkey
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE SET NULL;
