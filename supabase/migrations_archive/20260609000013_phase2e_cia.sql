-- Phase 2E — CIA / Continuous Internal Assessment
-- cia_components: defines the assessment components (Unit Test 1, Assignment 2, etc.)
-- cia_marks: actual marks entered per student per component per subject

CREATE TABLE public.cia_components (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id    UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  subject_id       UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  component_type   TEXT NOT NULL CHECK (component_type IN (
                     'unit_test','assignment','lab_record','seminar',
                     'attendance_marks','viva','other')),
  max_marks        NUMERIC(5,2) NOT NULL DEFAULT 25,
  semester         INTEGER NOT NULL,
  weightage        NUMERIC(5,2) DEFAULT 100,  -- % weight in final CIA total
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cia_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cia_components: select own institution"
  ON public.cia_components FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = cia_components.institution_id
  ));

CREATE POLICY "cia_components: manage own institution"
  ON public.cia_components FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = cia_components.institution_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = cia_components.institution_id)
  ));

-- ── cia_marks ────────────────────────────────────────────────────────────────

CREATE TABLE public.cia_marks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  cia_component_id  UUID NOT NULL REFERENCES public.cia_components(id) ON DELETE CASCADE,
  subject_id        UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  marks_scored      NUMERIC(5,2) NOT NULL,
  entered_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, cia_component_id)
);

ALTER TABLE public.cia_marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cia_marks: select own institution"
  ON public.cia_marks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = cia_marks.institution_id
  ));

CREATE POLICY "cia_marks: manage own institution"
  ON public.cia_marks FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = cia_marks.institution_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = cia_marks.institution_id)
  ));

NOTIFY pgrst, 'reload schema';
