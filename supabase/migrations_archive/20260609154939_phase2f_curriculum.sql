-- Phase 2F — Syllabus & Curriculum Management

-- curriculum_units: official syllabus per subject, unit by unit
CREATE TABLE public.curriculum_units (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id       UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  institution_id   UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  unit_number      INTEGER NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  topics           JSONB,             -- Array of topic strings
  reference_books  JSONB,             -- Array of { title, author, isbn }
  hours_allocated  INTEGER NOT NULL DEFAULT 5,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, unit_number)
);

ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "curriculum_units: select own institution"
  ON public.curriculum_units FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = curriculum_units.institution_id
  ));

CREATE POLICY "curriculum_units: manage own institution"
  ON public.curriculum_units FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = curriculum_units.institution_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = curriculum_units.institution_id)
  ));

-- syllabus_completion: teachers log which units they have completed
CREATE TABLE public.syllabus_completion (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_unit_id   UUID NOT NULL REFERENCES public.curriculum_units(id) ON DELETE CASCADE,
  staff_id             UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  institution_id       UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  academic_year_id     UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  completed_at         DATE,
  completion_notes     TEXT,
  is_completed         BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(curriculum_unit_id, staff_id, academic_year_id)
);

ALTER TABLE public.syllabus_completion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syllabus_completion: select own institution"
  ON public.syllabus_completion FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = syllabus_completion.institution_id
  ));

CREATE POLICY "syllabus_completion: manage own institution"
  ON public.syllabus_completion FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR g.tenant_id = syllabus_completion.institution_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR g.tenant_id = syllabus_completion.institution_id
  ));

NOTIFY pgrst, 'reload schema';
