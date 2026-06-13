-- Schema repair (2026-06-12 codebase audit)
--
-- Two shipped features reference tables that never made it to this database
-- (history drift pre-dating the 2026-06-12 migration-history repair):
--
--   1. Year Promotion (Phase 2D, file 20260609000011) — promotion_logs and
--      students.is_graduated are missing, so every promotion run fails.
--   2. Staff Attendance card (core dashboard) — staff_attendance is missing,
--      so the card errored on every load. The original DDL (20260506000004)
--      also predates the tenants→institutions rename and pointed staff_id at
--      profiles; this version matches what the code actually queries today:
--      institution_id + staff_id referencing public.staff(id).
--
-- Everything is IF NOT EXISTS so this is safe regardless of which historic
-- migrations a given environment actually ran.

-- ── Phase 2D: promotion_logs + graduation flag ───────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_graduated BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.promotion_logs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  academic_year_id     UUID                    REFERENCES public.academic_years(id) ON DELETE SET NULL,
  academic_year_label  TEXT,
  run_by               UUID                    REFERENCES auth.users(id),
  run_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_promoted       INTEGER     NOT NULL DEFAULT 0,
  total_held           INTEGER     NOT NULL DEFAULT 0,
  total_graduated      INTEGER     NOT NULL DEFAULT 0,
  can_rollback_until   TIMESTAMPTZ NOT NULL,
  rolled_back_at       TIMESTAMPTZ,
  rollback_snapshot    JSONB       NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_promotion_logs_institution
  ON public.promotion_logs(institution_id, run_at DESC);

ALTER TABLE public.promotion_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'promotion_logs'
  ) THEN
    CREATE POLICY "promotion_logs: institution members can manage"
      ON public.promotion_logs FOR ALL
      USING (
        institution_id IN (
          SELECT institution_id FROM public.institution_members WHERE profile_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── Staff attendance (read by the dashboard card; written by Phase 5J) ───────
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id        UUID        NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT        NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','on_leave')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_inst_date
  ON public.staff_attendance(institution_id, date DESC);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_attendance'
  ) THEN
    CREATE POLICY "staff_attendance: institution members can manage"
      ON public.staff_attendance FOR ALL
      USING (
        institution_id IN (
          SELECT institution_id FROM public.institution_members WHERE profile_id = auth.uid()
        )
      );
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
