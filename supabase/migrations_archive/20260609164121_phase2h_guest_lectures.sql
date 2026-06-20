-- Phase 2H: Guest Lecture & Expert Talk Management
-- NAAC Criterion 1.3 — Experiential Learning / Industry-Institution interaction

CREATE TABLE public.guest_lectures (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id        UUID          NOT NULL REFERENCES public.institutions(id)  ON DELETE CASCADE,
  department_id         UUID                   REFERENCES public.departments(id)   ON DELETE SET NULL,
  academic_year_id      UUID                   REFERENCES public.academic_years(id) ON DELETE SET NULL,
  subject_id            UUID                   REFERENCES public.subjects(id)      ON DELETE SET NULL,

  -- Speaker
  speaker_name          TEXT          NOT NULL,
  speaker_designation   TEXT,
  speaker_organization  TEXT,
  speaker_email         TEXT,
  speaker_phone         TEXT,

  -- Event
  title                 TEXT          NOT NULL,
  event_date            DATE          NOT NULL,
  start_time            TIME,
  end_time              TIME,
  venue                 TEXT,
  mode                  TEXT          NOT NULL DEFAULT 'in_person',  -- in_person | online | hybrid

  -- Attendance
  student_count         INTEGER,
  staff_count           INTEGER,

  -- Coordination
  organized_by          UUID                   REFERENCES public.staff(id)         ON DELETE SET NULL,

  -- Outcomes
  description           TEXT,
  outcomes              TEXT,
  feedback_summary      TEXT,

  -- NAAC metadata
  naac_criterion        TEXT          NOT NULL DEFAULT '1.3',

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_lectures_institution_id ON public.guest_lectures (institution_id);
CREATE INDEX idx_guest_lectures_department_id  ON public.guest_lectures (department_id);
CREATE INDEX idx_guest_lectures_event_date     ON public.guest_lectures (event_date);
CREATE INDEX idx_guest_lectures_academic_year  ON public.guest_lectures (academic_year_id);

ALTER TABLE public.guest_lectures ENABLE ROW LEVEL SECURITY;

-- All institution members can view
CREATE POLICY "guest_lectures_select"
  ON public.guest_lectures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = guest_lectures.institution_id
    )
  );

-- Admins, HODs, and Staff can create
CREATE POLICY "guest_lectures_insert"
  ON public.guest_lectures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = guest_lectures.institution_id
        AND a.role IN ('SUPER_ADMIN', 'INST_ADMIN', 'DEPARTMENT_HEAD', 'STAFF')
    )
  );

-- Admins and HODs can update any; staff can update their own
CREATE POLICY "guest_lectures_update"
  ON public.guest_lectures FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = guest_lectures.institution_id
        AND (
          a.role IN ('SUPER_ADMIN', 'INST_ADMIN', 'DEPARTMENT_HEAD')
          OR (
            a.role = 'STAFF'
            AND guest_lectures.organized_by = (
              SELECT s.id FROM public.staff s
              WHERE s.profile_id = auth.uid()
                AND s.institution_id = guest_lectures.institution_id
              LIMIT 1
            )
          )
        )
    )
  );

-- Admins and HODs can delete any
CREATE POLICY "guest_lectures_delete"
  ON public.guest_lectures FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = guest_lectures.institution_id
        AND a.role IN ('SUPER_ADMIN', 'INST_ADMIN', 'DEPARTMENT_HEAD')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_lectures TO authenticated;

NOTIFY pgrst, 'reload schema';
