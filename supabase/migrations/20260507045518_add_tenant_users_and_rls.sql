-- ============================================================
-- AURA: tenant_users, RBAC enum, get_user_authorizations, RLS
-- - Enum public.user_role
-- - Table public.shifts (minimal stub for tenant_users.shift_id FK)
-- - Table public.tenant_users
-- - private.get_user_authorizations() SECURITY DEFINER + public wrapper
-- - RLS: tenant_users, public.attendance, public.class_schedules ("schedules")
-- - Attendance: four policies (read / insert / update / delete) encoding swimlanes
-- ============================================================

-- Private schema for SECURITY DEFINER (keeps definer logic off exposed surface)
CREATE SCHEMA IF NOT EXISTS private;

-- ── 1. user_role enum ───────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.user_role AS ENUM (
      'SUPER_ADMIN',
      'INST_ADMIN',
      'DEPARTMENT_HEAD',
      'STAFF',
      'STUDENT'
    );
  END IF;
END
$$;

-- ── 2. shifts (referenced by tenant_users.shift_id) ─────────
CREATE TABLE IF NOT EXISTS public.shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'Default shift',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shifts_tenant_id ON public.shifts (tenant_id);

COMMENT ON TABLE public.shifts IS 'Minimal shift/roster entity for tenant_users.shift_id; extend as needed. RLS intentionally omitted so FK resolution stays simple.';

-- ── 3. tenant_users ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id   uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  shift_id        uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  role            public.user_role NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_profile ON public.tenant_users (profile_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_department ON public.tenant_users (department_id);

-- ── 4. get_user_authorizations() (SECURITY DEFINER in private) ─
CREATE OR REPLACE FUNCTION private.get_user_authorizations()
RETURNS TABLE (
  role            public.user_role,
  tenant_id       uuid,
  department_id   uuid,
  shift_id        uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tu.role, tu.tenant_id, tu.department_id, tu.shift_id
  FROM public.tenant_users tu
  WHERE tu.profile_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION private.get_user_authorizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.get_user_authorizations() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_authorizations() TO service_role;

-- Public wrapper (invoker calls into definer implementation)
CREATE OR REPLACE FUNCTION public.get_user_authorizations()
RETURNS TABLE (
  role            public.user_role,
  tenant_id       uuid,
  department_id   uuid,
  shift_id        uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM private.get_user_authorizations();
$$;

REVOKE ALL ON FUNCTION public.get_user_authorizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_authorizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_authorizations() TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_users TO authenticated;
GRANT SELECT ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO service_role;

-- ── 5. RLS: tenant_users ────────────────────────────────────
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_users: select own and scoped admins" ON public.tenant_users;
CREATE POLICY "tenant_users: select own and scoped admins"
  ON public.tenant_users FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = tenant_users.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.tenant_id = tenant_users.tenant_id
        AND g.department_id IS NOT DISTINCT FROM tenant_users.department_id
    )
  );

DROP POLICY IF EXISTS "tenant_users: insert super and inst admin" ON public.tenant_users;
CREATE POLICY "tenant_users: insert super and inst admin"
  ON public.tenant_users FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = tenant_users.tenant_id
    )
  );

DROP POLICY IF EXISTS "tenant_users: update super and inst admin" ON public.tenant_users;
CREATE POLICY "tenant_users: update super and inst admin"
  ON public.tenant_users FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = tenant_users.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = tenant_users.tenant_id
    )
  );

DROP POLICY IF EXISTS "tenant_users: delete super and inst admin" ON public.tenant_users;
CREATE POLICY "tenant_users: delete super and inst admin"
  ON public.tenant_users FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = tenant_users.tenant_id
    )
  );

-- ── 6. RLS: attendance — replace permissive policies ────────
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance: authenticated can select" ON public.attendance;
DROP POLICY IF EXISTS "attendance: authenticated can insert" ON public.attendance;
DROP POLICY IF EXISTS "attendance: authenticated can update" ON public.attendance;
DROP POLICY IF EXISTS "attendance: authenticated can delete" ON public.attendance;

-- Swimlane 1 — Super Admin: global read
-- Swimlane 2 — Inst Admin: tenant matches schedule's department tenant
-- Swimlane 3 — HOD: department matches class_schedules.department_id
-- Swimlane 4 — Faculty (STAFF): rows for schedules they teach
-- Students: read own attendance (profiles.id = auth.uid())
DROP POLICY IF EXISTS "attendance rbac: read swimlanes" ON public.attendance;
CREATE POLICY "attendance rbac: read swimlanes"
  ON public.attendance FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      JOIN public.departments d ON d.id = cs.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = cs.department_id
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role = 'STAFF'::public.user_role
        AND cs.staff_id = auth.uid()
    )
    OR attendance.student_id = auth.uid()
  );

-- Insert: Super Admin, Inst Admin (tenant), HOD (dept), Faculty for their schedule only (no student insert)
DROP POLICY IF EXISTS "attendance rbac: insert swimlanes" ON public.attendance;
CREATE POLICY "attendance rbac: insert swimlanes"
  ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = schedule_id
      JOIN public.departments d ON d.id = cs.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = schedule_id
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = cs.department_id
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = schedule_id
      WHERE g.role = 'STAFF'::public.user_role
        AND cs.staff_id = auth.uid()
    )
  );

-- Update / Delete: Super Admin, Inst Admin, HOD only (faculty: select+insert only per swimlane)
DROP POLICY IF EXISTS "attendance rbac: update swimlanes" ON public.attendance;
CREATE POLICY "attendance rbac: update swimlanes"
  ON public.attendance FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      JOIN public.departments d ON d.id = cs.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = cs.department_id
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      JOIN public.departments d ON d.id = cs.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = cs.department_id
    )
  );

DROP POLICY IF EXISTS "attendance rbac: delete swimlanes" ON public.attendance;
CREATE POLICY "attendance rbac: delete swimlanes"
  ON public.attendance FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      JOIN public.departments d ON d.id = cs.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = cs.department_id
    )
  );

-- ── 7. RLS: class_schedules (application "schedules" table) ────
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules: authenticated can select" ON public.class_schedules;
DROP POLICY IF EXISTS "schedules: authenticated can insert" ON public.class_schedules;
DROP POLICY IF EXISTS "schedules: authenticated can update" ON public.class_schedules;
DROP POLICY IF EXISTS "schedules: authenticated can delete" ON public.class_schedules;

DROP POLICY IF EXISTS "class_schedules rbac: read swimlanes" ON public.class_schedules;
CREATE POLICY "class_schedules rbac: read swimlanes"
  ON public.class_schedules FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.departments d ON d.id = class_schedules.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = class_schedules.department_id
    )
    OR class_schedules.staff_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.department_id = class_schedules.department_id
        AND p.role = 'STUDENT'
    )
  );

DROP POLICY IF EXISTS "class_schedules rbac: insert swimlanes" ON public.class_schedules;
CREATE POLICY "class_schedules rbac: insert swimlanes"
  ON public.class_schedules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.departments d ON d.id = department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = department_id
    )
    OR (
      EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'STAFF'::public.user_role)
      AND staff_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "class_schedules rbac: update swimlanes" ON public.class_schedules;
CREATE POLICY "class_schedules rbac: update swimlanes"
  ON public.class_schedules FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.departments d ON d.id = class_schedules.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = class_schedules.department_id
    )
    OR (
      EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'STAFF'::public.user_role)
      AND class_schedules.staff_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.departments d ON d.id = class_schedules.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = class_schedules.department_id
    )
    OR (
      EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'STAFF'::public.user_role)
      AND class_schedules.staff_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "class_schedules rbac: delete swimlanes" ON public.class_schedules;
CREATE POLICY "class_schedules rbac: delete swimlanes"
  ON public.class_schedules FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
    OR EXISTS (
      SELECT 1
      FROM private.get_user_authorizations() g
      JOIN public.departments d ON d.id = class_schedules.department_id
      WHERE g.role = 'INST_ADMIN'::public.user_role
        AND g.tenant_id = d.tenant_id
    )
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g
      WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
        AND g.department_id = class_schedules.department_id
    )
  );

-- ── 8. RLS: public.schedules (legacy / UI table; optional) ───
-- Attendance uses class_schedules; the app also uses public.schedules.
DO $$
BEGIN
  IF to_regclass('public.schedules') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "schedules rbac: read swimlanes" ON public.schedules';
  EXECUTE $p$
    CREATE POLICY "schedules rbac: read swimlanes"
      ON public.schedules FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'INST_ADMIN'::public.user_role
            AND g.tenant_id = schedules.tenant_id
        )
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
            AND g.department_id = schedules.department_id
        )
        OR schedules.staff_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.department_id = schedules.department_id
            AND p.role = 'STUDENT'
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "schedules rbac: insert swimlanes" ON public.schedules';
  EXECUTE $p$
    CREATE POLICY "schedules rbac: insert swimlanes"
      ON public.schedules FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'INST_ADMIN'::public.user_role
            AND g.tenant_id = tenant_id
        )
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
            AND g.department_id = department_id
        )
        OR (
          EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'STAFF'::public.user_role)
          AND staff_id = auth.uid()
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "schedules rbac: update swimlanes" ON public.schedules';
  EXECUTE $p$
    CREATE POLICY "schedules rbac: update swimlanes"
      ON public.schedules FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'INST_ADMIN'::public.user_role
            AND g.tenant_id = schedules.tenant_id
        )
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
            AND g.department_id = schedules.department_id
        )
        OR (
          EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'STAFF'::public.user_role)
          AND schedules.staff_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'INST_ADMIN'::public.user_role
            AND g.tenant_id = schedules.tenant_id
        )
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
            AND g.department_id = schedules.department_id
        )
        OR (
          EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'STAFF'::public.user_role)
          AND schedules.staff_id = auth.uid()
        )
      )
  $p$;

  EXECUTE 'DROP POLICY IF EXISTS "schedules rbac: delete swimlanes" ON public.schedules';
  EXECUTE $p$
    CREATE POLICY "schedules rbac: delete swimlanes"
      ON public.schedules FOR DELETE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM private.get_user_authorizations() g WHERE g.role = 'SUPER_ADMIN'::public.user_role)
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'INST_ADMIN'::public.user_role
            AND g.tenant_id = schedules.tenant_id
        )
        OR EXISTS (
          SELECT 1 FROM private.get_user_authorizations() g
          WHERE g.role = 'DEPARTMENT_HEAD'::public.user_role
            AND g.department_id = schedules.department_id
        )
      )
  $p$;

  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated';
END
$$;
