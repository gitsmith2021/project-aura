-- Phase 2G: Teacher Lesson Plan / Daily Diary
-- Tracks daily teaching activity per staff member, linked to subjects and optionally to curriculum units.

CREATE TABLE public.lesson_plans (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID          NOT NULL REFERENCES public.institutions(id)    ON DELETE CASCADE,
  staff_id            UUID          NOT NULL REFERENCES public.staff(id)           ON DELETE CASCADE,
  subject_id          UUID          NOT NULL REFERENCES public.subjects(id)        ON DELETE CASCADE,
  curriculum_unit_id  UUID                   REFERENCES public.curriculum_units(id) ON DELETE SET NULL,
  academic_year_id    UUID                   REFERENCES public.academic_years(id)   ON DELETE SET NULL,
  lesson_date         DATE          NOT NULL,
  topic_covered       TEXT          NOT NULL,
  teaching_method     TEXT,
  hours_covered       NUMERIC(4,1)  NOT NULL DEFAULT 1,
  remarks             TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_lesson_plans_institution_id  ON public.lesson_plans (institution_id);
CREATE INDEX idx_lesson_plans_staff_id        ON public.lesson_plans (staff_id);
CREATE INDEX idx_lesson_plans_subject_id      ON public.lesson_plans (subject_id);
CREATE INDEX idx_lesson_plans_lesson_date     ON public.lesson_plans (lesson_date);
CREATE INDEX idx_lesson_plans_academic_year   ON public.lesson_plans (academic_year_id);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_plans_select"
  ON public.lesson_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = lesson_plans.institution_id
    )
  );

CREATE POLICY "lesson_plans_insert"
  ON public.lesson_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = lesson_plans.institution_id
        AND (
          a.role IN ('SUPER_ADMIN','INST_ADMIN','DEPARTMENT_HEAD')
          OR (
            a.role = 'STAFF'
            AND lesson_plans.staff_id = (
              SELECT s.id FROM public.staff s
              WHERE s.profile_id = auth.uid()
                AND s.institution_id = lesson_plans.institution_id
              LIMIT 1
            )
          )
        )
    )
  );

CREATE POLICY "lesson_plans_update"
  ON public.lesson_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = lesson_plans.institution_id
        AND (
          a.role IN ('SUPER_ADMIN','INST_ADMIN','DEPARTMENT_HEAD')
          OR (
            a.role = 'STAFF'
            AND lesson_plans.staff_id = (
              SELECT s.id FROM public.staff s
              WHERE s.profile_id = auth.uid()
                AND s.institution_id = lesson_plans.institution_id
              LIMIT 1
            )
          )
        )
    )
  );

CREATE POLICY "lesson_plans_delete"
  ON public.lesson_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM private.get_user_authorizations() a
      WHERE a.tenant_id = lesson_plans.institution_id
        AND (
          a.role IN ('SUPER_ADMIN','INST_ADMIN','DEPARTMENT_HEAD')
          OR (
            a.role = 'STAFF'
            AND lesson_plans.staff_id = (
              SELECT s.id FROM public.staff s
              WHERE s.profile_id = auth.uid()
                AND s.institution_id = lesson_plans.institution_id
              LIMIT 1
            )
          )
        )
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;

NOTIFY pgrst, 'reload schema';
