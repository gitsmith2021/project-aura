-- Phase 2D: Year Promotion & Graduation Workflow

-- Add graduation flag to students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_graduated BOOLEAN NOT NULL DEFAULT FALSE;

-- Promotion audit log — stores a rollback snapshot so any run can be undone within 24 h
CREATE TABLE public.promotion_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  academic_year_id     UUID                    REFERENCES public.academic_years(id) ON DELETE SET NULL,
  academic_year_label  TEXT,                   -- denormalized; survives AY deletion
  run_by               UUID                    REFERENCES auth.users(id),
  run_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_promoted       INTEGER     NOT NULL DEFAULT 0,
  total_held           INTEGER     NOT NULL DEFAULT 0,
  total_graduated      INTEGER     NOT NULL DEFAULT 0,
  can_rollback_until   TIMESTAMPTZ NOT NULL,   -- run_at + 24h
  rolled_back_at       TIMESTAMPTZ,
  -- [{student_id, prev_year, prev_is_graduated}] — enough to fully undo the run
  rollback_snapshot    JSONB       NOT NULL DEFAULT '[]'
);

ALTER TABLE public.promotion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotion_logs: institution members can manage"
  ON public.promotion_logs FOR ALL
  USING (
    institution_id IN (
      SELECT institution_id FROM public.institution_members WHERE profile_id = auth.uid()
    )
  );
