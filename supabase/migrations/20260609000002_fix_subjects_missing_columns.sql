ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subjects_institution_id_department_id_code_semester_key'
  ) THEN
    ALTER TABLE public.subjects
      ADD CONSTRAINT subjects_institution_id_department_id_code_semester_key
      UNIQUE (institution_id, department_id, code, semester);
  END IF;
END $$;

DROP POLICY IF EXISTS "subjects: institution members can manage" ON public.subjects;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects: institution members can manage"
  ON public.subjects
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
