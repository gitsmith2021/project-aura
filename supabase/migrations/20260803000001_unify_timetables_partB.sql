-- ════════════════════════════════════════════════════════════════════════════
-- TIMETABLE UNIFICATION — Part B (retire the legacy planner table)
--
-- Part A (20260803000000) copied any live planner rows into `class_schedules`
-- and backed the full `schedules` table up to `private.schedules_backup`. All
-- application code (planner, AI scheduler, student/staff portals, dashboards,
-- mobile) now reads/writes `public.class_schedules`.
--
-- `public.schedules` had ZERO incoming foreign keys and no dependent views or
-- functions (verified), so dropping it is self-contained. The backup in the
-- private schema is retained as the rollback until the cutover is signed off.
--
-- OPERATIONAL NOTE: on production this is applied only AFTER the repointed code
-- is deployed, so no running instance references `schedules` at drop time. In CI
-- (from-zero replay) it simply drops the freshly-created empty table.
-- ════════════════════════════════════════════════════════════════════════════

drop table if exists public.schedules;
