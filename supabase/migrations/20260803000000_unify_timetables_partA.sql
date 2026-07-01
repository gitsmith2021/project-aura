-- ════════════════════════════════════════════════════════════════════════════
-- TIMETABLE UNIFICATION — Part A (backup + column + data copy)
--
-- The codebase carried TWO parallel timetables:
--   • public.schedules       — the planner / AI-scheduler / portal display table
--                              (tenant_id), with ZERO incoming foreign keys.
--   • public.class_schedules — the execution table `attendance`, `class_substitutions`,
--                              `faculty_attendance_events` and `attendance_exceptions`
--                              all FK to (institution_id). This is the FK anchor.
--
-- They were never bridged: the AI scheduler wrote only `schedules`, while attendance
-- (and P8.2/P8.3/P8.4 Smart Attendance) resolve only against `class_schedules`. In
-- production a real class lives in `schedules`, so a card/NFC tap matched nothing.
--
-- We converge onto `class_schedules` (keeps the hard FK side fixed) and copy the
-- planner rows in. Part B (a later migration) drops `schedules` once the app code
-- is repointed and deployed. Both tables' `staff_id` reference `staff.id`, so no id
-- remapping is needed; `tenant_id` maps to `institution_id`.
-- ════════════════════════════════════════════════════════════════════════════

-- 1 — Rollback safety net (private schema → not API-exposed, no RLS advisor).
create table if not exists private.schedules_backup as
  select * from public.schedules;

-- 2 — Carry the scheduler's draft linkage onto the canonical table so its
--     publish/republish (delete-by-draft_schedule_id) works post-repoint. The
--     attendance-linked rows have a null draft_schedule_id and are never touched.
alter table public.class_schedules
  add column if not exists draft_schedule_id uuid references public.draft_schedules(id) on delete set null;
create index if not exists ix_class_schedules_draft on public.class_schedules (draft_schedule_id);

-- 3 — Copy planner rows into the canonical table, but ONLY referentially-valid
--     ones (class_schedules enforces the department/institution/staff FKs that
--     `schedules` did not). In prod the entire `schedules` set is stale cruft —
--     280 rows from two 2026-06-24 scheduler test runs whose departments were
--     later deleted — so this guarded copy imports 0 and leaves the 7 real,
--     attendance-linked rows untouched. The guards keep the migration correct if
--     a future `schedules` snapshot contains live rows. ids are preserved (both
--     use gen_random_uuid, zero collisions verified); subject_id / classroom_id
--     stay null (schedules never had them).
insert into public.class_schedules
  (id, institution_id, department_id, subject_name, staff_id, day_of_week, start_time, end_time, status, shift, draft_schedule_id, created_at)
select
  s.id, s.tenant_id, s.department_id, s.subject_name, s.staff_id, s.day_of_week, s.start_time, s.end_time, s.status, s.shift, s.draft_schedule_id, s.created_at
from public.schedules s
where exists (select 1 from public.institutions i where i.id = s.tenant_id)
  and (s.department_id is null or exists (select 1 from public.departments d where d.id = s.department_id))
  and (s.staff_id is null or exists (select 1 from public.staff st where st.id = s.staff_id))
  and (s.draft_schedule_id is null or exists (select 1 from public.draft_schedules ds where ds.id = s.draft_schedule_id))
on conflict (id) do nothing;
