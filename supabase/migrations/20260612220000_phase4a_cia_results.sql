-- Phase 4A: CIA Assessment Engine — finalized results
--
-- cia_results stores the OUTPUT of the weighted calculation engine
-- (src/lib/ciaEngine.ts) per student × department × semester × academic year.
-- Rows are created as 'draft' by computeCIAResults and flipped to 'published'
-- by publishCIAResults; students can only ever read published rows.
-- components_snapshot preserves the exact per-component breakdown used at
-- computation time, so a published result stays explainable even after
-- components or marks change (NAAC evidence requirement).

CREATE TABLE public.cia_results (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID         NOT NULL REFERENCES public.institutions(id)   ON DELETE CASCADE,
  student_id          UUID         NOT NULL REFERENCES public.students(id)       ON DELETE CASCADE,
  department_id       UUID         NOT NULL REFERENCES public.departments(id)    ON DELETE CASCADE,
  academic_year_id    UUID                  REFERENCES public.academic_years(id) ON DELETE SET NULL,
  semester            INTEGER      NOT NULL CHECK (semester BETWEEN 1 AND 12),
  final_percentage    NUMERIC(5,2) NOT NULL CHECK (final_percentage >= 0 AND final_percentage <= 100),
  computation_mode    TEXT         NOT NULL CHECK (computation_mode IN ('weighted','raw')),
  components_snapshot JSONB        NOT NULL,
  missing_count       INTEGER      NOT NULL DEFAULT 0,
  status              TEXT         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  computed_by         UUID                  REFERENCES auth.users(id),
  published_by        UUID                  REFERENCES auth.users(id),
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- One result per student per scope; recomputation upserts the same row.
-- NULLS NOT DISTINCT so a NULL academic_year_id also deduplicates.
CREATE UNIQUE INDEX cia_results_student_scope_uniq
  ON public.cia_results(institution_id, student_id, department_id, semester, academic_year_id)
  NULLS NOT DISTINCT;

CREATE INDEX idx_cia_results_scope
  ON public.cia_results(institution_id, department_id, semester);

ALTER TABLE public.cia_results ENABLE ROW LEVEL SECURITY;

-- Admins / HODs see everything in their institution (drafts included)
CREATE POLICY "cia_results: staff read all"
  ON public.cia_results FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD','HOD','STAFF') AND g.tenant_id = cia_results.institution_id)
  ));

-- Every institution member (incl. students) can read PUBLISHED rows;
-- drafts stay invisible to students until staff publish.
CREATE POLICY "cia_results: members read published"
  ON public.cia_results FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      WHERE g.tenant_id = cia_results.institution_id
    )
  );

-- Only admins / HODs mutate results (same bar as cia_marks)
CREATE POLICY "cia_results: manage own institution"
  ON public.cia_results FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = cia_results.institution_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    WHERE g.role = 'SUPER_ADMIN'
       OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD') AND g.tenant_id = cia_results.institution_id)
  ));

NOTIFY pgrst, 'reload schema';
