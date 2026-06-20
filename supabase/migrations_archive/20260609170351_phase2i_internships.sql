-- Phase 2I: Internship & Industrial Training Management
-- NAAC Criterion 1.2 (Student Projects / Internships) + NIRF 5.2 (Placement & Higher Studies)

CREATE TABLE public.internships (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID          NOT NULL REFERENCES public.institutions(id)   ON DELETE CASCADE,
  student_id          UUID          NOT NULL REFERENCES public.students(id)       ON DELETE CASCADE,
  academic_year_id    UUID                   REFERENCES public.academic_years(id) ON DELETE SET NULL,

  -- Type
  type                TEXT          NOT NULL DEFAULT 'internship',
  -- internship | industrial_training | project | research_internship | foreign_internship

  -- Company / Organisation
  company_name        TEXT          NOT NULL,
  company_location    TEXT,
  company_sector      TEXT,         -- IT | Manufacturing | Healthcare | Finance | Education | Government | Other
  mentor_name         TEXT,
  mentor_email        TEXT,
  mentor_phone        TEXT,

  -- Duration
  start_date          DATE          NOT NULL,
  end_date            DATE,
  duration_weeks      INTEGER,      -- computed or entered manually

  -- Work details
  role_title          TEXT,
  description         TEXT,
  technologies        TEXT,         -- comma-separated or free text
  certificate_issued  BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Compensation
  is_paid             BOOLEAN       NOT NULL DEFAULT FALSE,
  stipend_amount      NUMERIC(10,2),
  stipend_currency    TEXT          NOT NULL DEFAULT 'INR',

  -- Outcome
  offer_received      BOOLEAN       NOT NULL DEFAULT FALSE,
  offer_package       NUMERIC(12,2),
  feedback            TEXT,

  -- NAAC / NIRF
  naac_criterion      TEXT          NOT NULL DEFAULT '1.2',
  nirf_category       TEXT          NOT NULL DEFAULT '5.2',

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_internships_institution_id  ON public.internships (institution_id);
CREATE INDEX idx_internships_student_id      ON public.internships (student_id);
CREATE INDEX idx_internships_academic_year   ON public.internships (academic_year_id);
CREATE INDEX idx_internships_type            ON public.internships (type);
CREATE INDEX idx_internships_start_date      ON public.internships (start_date);

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

-- All institution members can view
CREATE POLICY "internships_select"
  ON public.internships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = internships.institution_id
    )
  );

-- Students can insert their own; admins/HODs can insert for any student
CREATE POLICY "internships_insert"
  ON public.internships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = internships.institution_id
        AND (
          a.role IN ('SUPER_ADMIN', 'INST_ADMIN', 'DEPARTMENT_HEAD')
          OR (
            a.role = 'STUDENT'
            AND internships.student_id = (
              SELECT s.id FROM public.students s
              WHERE s.profile_id = auth.uid()
                AND s.institution_id = internships.institution_id
              LIMIT 1
            )
          )
        )
    )
  );

-- Students update their own; admins/HODs update any
CREATE POLICY "internships_update"
  ON public.internships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = internships.institution_id
        AND (
          a.role IN ('SUPER_ADMIN', 'INST_ADMIN', 'DEPARTMENT_HEAD')
          OR (
            a.role = 'STUDENT'
            AND internships.student_id = (
              SELECT s.id FROM public.students s
              WHERE s.profile_id = auth.uid()
                AND s.institution_id = internships.institution_id
              LIMIT 1
            )
          )
        )
    )
  );

-- Admins/HODs delete any; students delete their own
CREATE POLICY "internships_delete"
  ON public.internships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = internships.institution_id
        AND (
          a.role IN ('SUPER_ADMIN', 'INST_ADMIN', 'DEPARTMENT_HEAD')
          OR (
            a.role = 'STUDENT'
            AND internships.student_id = (
              SELECT s.id FROM public.students s
              WHERE s.profile_id = auth.uid()
                AND s.institution_id = internships.institution_id
              LIMIT 1
            )
          )
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internships TO authenticated;

NOTIFY pgrst, 'reload schema';
