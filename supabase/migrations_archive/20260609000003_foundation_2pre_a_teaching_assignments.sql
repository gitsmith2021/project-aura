CREATE TABLE IF NOT EXISTS public.teaching_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id UUID,
  semester         INTEGER NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, subject_id, academic_year_id)
);

ALTER TABLE public.teaching_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teaching_assignments: institution members can manage"
  ON public.teaching_assignments
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
