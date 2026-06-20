-- Codebase-audit follow-ups (2026-06-12):
--   (A) PRINCIPAL role — a distinct institution-leadership role.
--   (B) Staff CIA marks entry — let subject teachers enter their own marks.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- (A) PRINCIPAL role
--
-- Design decision (documented in docs/CODEBASE_AUDIT_2026-06-12.md):
-- PRINCIPAL is the institution head — it gets institution-WIDE access,
-- equivalent to INST_ADMIN, but is a distinct, separately-labelled role
-- (own identity in institution_members, own UI badge, distinct audit-log actor).
--
-- Implementation choice — NORMALIZE rather than enum-extend:
--   * The user_role enum is left untouched (ALTER TYPE ADD VALUE can't be used
--     in the same transaction it's added, and would force PRINCIPAL into every
--     existing RLS IN-list one by one).
--   * Instead, get_user_authorizations() maps a 'PRINCIPAL' membership row to
--     the INST_ADMIN enum value. Every existing RLS policy that grants
--     INST_ADMIN therefore grants PRINCIPAL automatically — zero policy edits,
--     zero risk of missing a table.
--   * The real 'PRINCIPAL' string lives only in institution_members.role and is
--     read directly by the app layer (middleware/login) for routing + labelling.
--
-- A future read-only "oversight" variant of PRINCIPAL is an Arch A1
-- (fine-grained RLS) concern; today PRINCIPAL == INST_ADMIN at the DB layer.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.institution_members
  DROP CONSTRAINT IF EXISTS institution_members_role_check;

ALTER TABLE public.institution_members
  ADD CONSTRAINT institution_members_role_check
  CHECK (role IN ('SUPER_ADMIN','INST_ADMIN','PRINCIPAL','HOD','DEPARTMENT_HEAD','STAFF','STUDENT'));

CREATE OR REPLACE FUNCTION private.get_user_authorizations()
RETURNS TABLE(role user_role, tenant_id uuid, department_id uuid, shift_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    CASE
      -- PRINCIPAL is institution-wide leadership → treated as INST_ADMIN for
      -- all row-level authorization (see migration header).
      WHEN tu.role = 'PRINCIPAL' THEN 'INST_ADMIN'::public.user_role
      WHEN tu.role IN ('SUPER_ADMIN','INST_ADMIN','HOD','DEPARTMENT_HEAD','STAFF','STUDENT')
      THEN tu.role::public.user_role
      ELSE NULL
    END AS role,
    tu.institution_id AS tenant_id,
    tu.department_id,
    tu.shift_id
  FROM public.institution_members tu
  WHERE tu.profile_id = auth.uid();
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- (B) Staff CIA marks entry
--
-- Until now only INST_ADMIN/DEPARTMENT_HEAD could write cia_marks, so subject
-- teachers had to hand marks to the HOD for data entry. This adds a permissive
-- policy (combined with the existing ones via OR) letting a STAFF member
-- INSERT/UPDATE/SELECT marks ONLY for components of subjects they are assigned
-- to teach (teaching_assignments) in the same institution.
--
-- The scope is derived from the component's subject (cia_components.subject_id),
-- which is authoritative, and from staff.profile_id = auth.uid() — so it works
-- for portal staff regardless of whether they also hold an institution_members
-- row. Components with no subject (subject_id NULL) are not staff-writable,
-- which is correct: there's no teaching assignment to authorize against.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "cia_marks: staff manage own teaching subjects"
  ON public.cia_marks FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cia_components cc
    JOIN public.teaching_assignments ta
      ON ta.subject_id = cc.subject_id
     AND ta.institution_id = cc.institution_id
    JOIN public.staff s
      ON s.id = ta.staff_id
    WHERE cc.id = cia_marks.cia_component_id
      AND s.profile_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.cia_components cc
    JOIN public.teaching_assignments ta
      ON ta.subject_id = cc.subject_id
     AND ta.institution_id = cc.institution_id
    JOIN public.staff s
      ON s.id = ta.staff_id
    WHERE cc.id = cia_marks.cia_component_id
      AND s.profile_id = auth.uid()
  ));

NOTIFY pgrst, 'reload schema';
