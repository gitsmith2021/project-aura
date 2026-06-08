-- Six tables have RLS enabled but ZERO policies, making them completely
-- inaccessible via the Data API (rls_enabled_no_policy advisor warnings):
-- attendance, attendance_audit, class_schedules, devices, shifts, subjects.
-- This adds institution-scoped RBAC policies mirroring the established
-- "private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)"
-- pattern used across the schema (g.tenant_id == the user's institution_id).

-- ── class_schedules (tenant_id, department_id) ───────────────────────────────
-- Mirrors "schedules rbac: ... swimlanes", but references class_schedules.* columns
-- directly in WITH CHECK (the existing schedules-table insert policy has a
-- "g.tenant_id = g.tenant_id" / "g.department_id = g.department_id" tautology bug
-- that effectively lets any INST_ADMIN/DEPARTMENT_HEAD insert rows for any
-- institution/department — not replicated here; flagging for a follow-up fix).

CREATE POLICY "class_schedules rbac: select own institution"
  ON public.class_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.tenant_id = class_schedules.tenant_id)
  );

CREATE POLICY "class_schedules rbac: insert swimlanes"
  ON public.class_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = class_schedules.tenant_id)
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'DEPARTMENT_HEAD' AND g.department_id = class_schedules.department_id)
  );

CREATE POLICY "class_schedules rbac: update swimlanes"
  ON public.class_schedules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = class_schedules.tenant_id)
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'DEPARTMENT_HEAD' AND g.department_id = class_schedules.department_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = class_schedules.tenant_id)
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'DEPARTMENT_HEAD' AND g.department_id = class_schedules.department_id)
  );

CREATE POLICY "class_schedules rbac: delete swimlanes"
  ON public.class_schedules FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = class_schedules.tenant_id)
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'DEPARTMENT_HEAD' AND g.department_id = class_schedules.department_id)
  );


-- ── subjects (tenant_id, department_id) ──────────────────────────────────────
-- Read is institution-wide (students/staff need to see subject names/codes);
-- writes are restricted to admins and the owning department head.

CREATE POLICY "subjects rbac: select own institution"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.tenant_id = subjects.tenant_id)
  );

CREATE POLICY "subjects rbac: manage swimlanes"
  ON public.subjects FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = subjects.tenant_id)
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'DEPARTMENT_HEAD' AND g.department_id = subjects.department_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = subjects.tenant_id)
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'DEPARTMENT_HEAD' AND g.department_id = subjects.department_id)
  );


-- ── shifts (tenant_id) ────────────────────────────────────────────────────────
-- Institution-wide read (everyone needs to see shift names/timings); admin-only writes.

CREATE POLICY "shifts rbac: select own institution"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.tenant_id = shifts.tenant_id)
  );

CREATE POLICY "shifts rbac: manage own institution"
  ON public.shifts FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = shifts.tenant_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'INST_ADMIN' AND g.tenant_id = shifts.tenant_id)
  );


-- ── devices (tenant_id → tenants(id), profile_id → profiles(id)) ─────────────
-- IMPORTANT: devices.tenant_id has a live FK to the orphaned "tenants" table
-- (0 rows — see the dead-tenant_id cleanup task), NOT to "institutions". Any
-- policy comparing g.tenant_id (== institution_id) to devices.tenant_id would
-- never match, locking out every admin. Until that FK is repointed, scope
-- devices by ownership only — the realistic access pattern for personal NFC
-- device registration anyway. Revisit institution-scoped admin access once the
-- column is repointed to institutions.id.

CREATE POLICY "devices rbac: select own or super admin"
  ON public.devices FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
  );

CREATE POLICY "devices rbac: manage own or super admin"
  ON public.devices FOR ALL
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
  );


-- ── attendance (schedule_id → class_schedules.id, student_id/captured_by → profiles.id) ──
-- attendance has no institution_id of its own; institution scope is derived by
-- joining through class_schedules.tenant_id. Self-access uses auth.uid() directly
-- (FK-agnostic — matches the "id = auth.uid()" convention on staff/students, which
-- holds for profiles too, so this remains correct whichever user table the FK
-- ultimately targets after the profiles -> staff/students migration).

CREATE POLICY "attendance rbac: select scoped"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid()
    OR captured_by = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role IN ('INST_ADMIN', 'DEPARTMENT_HEAD') AND g.tenant_id = cs.tenant_id
    )
  );

CREATE POLICY "attendance rbac: insert scoped"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    captured_by = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role IN ('INST_ADMIN', 'DEPARTMENT_HEAD') AND g.tenant_id = cs.tenant_id
    )
  );

CREATE POLICY "attendance rbac: update scoped"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (
    captured_by = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role IN ('INST_ADMIN', 'DEPARTMENT_HEAD') AND g.tenant_id = cs.tenant_id
    )
  )
  WITH CHECK (
    captured_by = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role IN ('INST_ADMIN', 'DEPARTMENT_HEAD') AND g.tenant_id = cs.tenant_id
    )
  );

CREATE POLICY "attendance rbac: delete by admin"
  ON public.attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      JOIN public.class_schedules cs ON cs.id = attendance.schedule_id
      WHERE g.role = 'INST_ADMIN' AND g.tenant_id = cs.tenant_id
    )
  );


-- ── attendance_audit (attendance_id → attendance.id, changed_by → profiles.id) ──
-- Append-only audit trail: SELECT for the people who can see the underlying
-- attendance record's institution plus whoever made the change; INSERT only by
-- the same scoped admin set (mirrors who's allowed to correct attendance).
-- Deliberately no UPDATE/DELETE policies — audit logs should be immutable.

CREATE POLICY "attendance_audit rbac: select scoped"
  ON public.attendance_audit FOR SELECT
  TO authenticated
  USING (
    changed_by = auth.uid()
    OR EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
    OR EXISTS (
      SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
      JOIN public.attendance a ON a.id = attendance_audit.attendance_id
      JOIN public.class_schedules cs ON cs.id = a.schedule_id
      WHERE g.role IN ('INST_ADMIN', 'DEPARTMENT_HEAD') AND g.tenant_id = cs.tenant_id
    )
  );

CREATE POLICY "attendance_audit rbac: insert scoped"
  ON public.attendance_audit FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id) WHERE g.role = 'SUPER_ADMIN')
      OR EXISTS (
        SELECT 1 FROM private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
        JOIN public.attendance a ON a.id = attendance_audit.attendance_id
        JOIN public.class_schedules cs ON cs.id = a.schedule_id
        WHERE g.role IN ('INST_ADMIN', 'DEPARTMENT_HEAD') AND g.tenant_id = cs.tenant_id
      )
    )
  );

NOTIFY pgrst, 'reload schema';
