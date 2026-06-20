-- Phase 4A (continued): CO/PO Outcome Mapping — OBE framework for NBA/NAAC
--
-- Course Outcomes (COs) are statements per SUBJECT ("CO1: students can …").
-- Program Outcomes (POs) are department-scoped graduate attributes; a NULL
-- department_id means the PO applies institution-wide (NBA's common PO1–12).
-- co_po_map holds the correlation matrix (1 low / 2 medium / 3 high).
-- cia_component_outcomes tags existing CIA components to the COs they assess —
-- that link is what lets the attainment engine (src/lib/coPoEngine.ts) compute
-- CO attainment directly from cia_marks, and PO attainment through the matrix.

-- ── course_outcomes ──────────────────────────────────────────────────────────
CREATE TABLE public.course_outcomes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  subject_id      UUID        NOT NULL REFERENCES public.subjects(id)     ON DELETE CASCADE,
  code            TEXT        NOT NULL,            -- e.g. 'CO1'
  description     TEXT        NOT NULL,
  display_order   INTEGER     NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subject_id, code)
);
CREATE INDEX idx_course_outcomes_subject ON public.course_outcomes(institution_id, subject_id);

-- ── program_outcomes ─────────────────────────────────────────────────────────
CREATE TABLE public.program_outcomes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id   UUID                 REFERENCES public.departments(id)  ON DELETE CASCADE,  -- NULL = institution-wide
  code            TEXT        NOT NULL,            -- e.g. 'PO1', 'PSO2'
  description     TEXT        NOT NULL,
  display_order   INTEGER     NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One code per scope; NULLS NOT DISTINCT so institution-wide codes are unique too
CREATE UNIQUE INDEX program_outcomes_scope_code_uniq
  ON public.program_outcomes(institution_id, department_id, code)
  NULLS NOT DISTINCT;

-- ── co_po_map (correlation matrix) ───────────────────────────────────────────
CREATE TABLE public.co_po_map (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID    NOT NULL REFERENCES public.institutions(id)     ON DELETE CASCADE,
  course_outcome_id   UUID    NOT NULL REFERENCES public.course_outcomes(id)  ON DELETE CASCADE,
  program_outcome_id  UUID    NOT NULL REFERENCES public.program_outcomes(id) ON DELETE CASCADE,
  correlation         INTEGER NOT NULL CHECK (correlation BETWEEN 1 AND 3),
  UNIQUE(course_outcome_id, program_outcome_id)
);

-- ── cia_component_outcomes (assessment → CO tagging) ─────────────────────────
CREATE TABLE public.cia_component_outcomes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id     UUID NOT NULL REFERENCES public.institutions(id)    ON DELETE CASCADE,
  cia_component_id   UUID NOT NULL REFERENCES public.cia_components(id)  ON DELETE CASCADE,
  course_outcome_id  UUID NOT NULL REFERENCES public.course_outcomes(id) ON DELETE CASCADE,
  UNIQUE(cia_component_id, course_outcome_id)
);

-- ── RLS (same authorization bar as the CIA tables) ───────────────────────────
ALTER TABLE public.course_outcomes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_outcomes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_po_map              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cia_component_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['course_outcomes','program_outcomes','co_po_map','cia_component_outcomes'] LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s: select own institution"
        ON public.%1$I FOR SELECT TO authenticated
        USING (EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE g.role = 'SUPER_ADMIN' OR g.tenant_id = %1$I.institution_id
        ));
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "%1$s: manage own institution"
        ON public.%1$I FOR ALL TO authenticated
        USING (EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE g.role = 'SUPER_ADMIN'
             OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD','HOD') AND g.tenant_id = %1$I.institution_id)
        ))
        WITH CHECK (EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
          WHERE g.role = 'SUPER_ADMIN'
             OR (g.role IN ('INST_ADMIN','DEPARTMENT_HEAD','HOD') AND g.tenant_id = %1$I.institution_id)
        ));
    $f$, t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
