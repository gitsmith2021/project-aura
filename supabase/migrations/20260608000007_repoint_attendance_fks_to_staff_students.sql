-- The "two parallel attendance pathways" problem: src/app/api/attendance/nfc/route.ts
-- already validates against the current "staff"/"students" tables, but the live FKs
-- on attendance/attendance_audit/devices still reference the deprecated "profiles"
-- table (12 rows, vs. staff=104 / students=1667) and the orphaned "tenants" table
-- (0 rows, superseded by "institutions"). Net effect: the NFC webhook's own
-- attendance.upsert() would fail an FK-violation, because student/staff IDs sourced
-- from "students"/"staff" essentially never exist as "profiles" rows. All four
-- tables are empty (0 rows each), so repointing is a pure schema fix — no data
-- migration needed.

-- preserve original ON DELETE semantics: attendance/_audit FKs had no ON DELETE
-- clause (NO ACTION); only retarget the referenced table.
ALTER TABLE public.attendance DROP CONSTRAINT attendance_student_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id);

ALTER TABLE public.attendance DROP CONSTRAINT attendance_captured_by_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_captured_by_fkey
  FOREIGN KEY (captured_by) REFERENCES public.staff(id);

ALTER TABLE public.attendance_audit DROP CONSTRAINT attendance_audit_changed_by_fkey;
ALTER TABLE public.attendance_audit ADD CONSTRAINT attendance_audit_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.staff(id);

ALTER TABLE public.devices DROP CONSTRAINT devices_profile_id_fkey;
ALTER TABLE public.devices ADD CONSTRAINT devices_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.staff(id) ON DELETE CASCADE;

ALTER TABLE public.devices DROP CONSTRAINT devices_tenant_id_fkey;
ALTER TABLE public.devices ADD CONSTRAINT devices_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.institutions(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
