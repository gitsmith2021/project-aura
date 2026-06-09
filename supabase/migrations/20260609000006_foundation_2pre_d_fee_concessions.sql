CREATE TABLE IF NOT EXISTS public.fee_concessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  concession_type  TEXT NOT NULL CHECK (concession_type IN (
                     'staff_ward','management_quota','merit',
                     'hardship','sports_quota','other')),
  amount           NUMERIC(10,2),
  percentage       NUMERIC(5,2),
  applicable_to    TEXT,
  reason           TEXT NOT NULL,
  approved_by      UUID REFERENCES auth.users(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fee_concessions_amount_or_pct CHECK (
    (amount IS NOT NULL AND percentage IS NULL) OR
    (amount IS NULL AND percentage IS NOT NULL)
  )
);

ALTER TABLE public.fee_concessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_concessions: institution members can manage"
  ON public.fee_concessions
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ))
  WITH CHECK (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
