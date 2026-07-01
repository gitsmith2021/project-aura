-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 8 — Smart Attendance · P8.2 (student card) + P8.4 (timetable validation)
--
-- • class_schedules.classroom_id — assign a room to a timetable slot so a fixed
--   in-room reader tap (P8.2) can be matched to the class, and P8.4 can validate
--   "assigned classroom". Nullable: while a slot has no room, matching falls back
--   to the classroom's department (see src/lib/smartAttendance.ts).
-- • class_substitutions — HOD/Principal (or the scheduler) reassign a slot for a
--   date; P8.4 lets the substitute tap and blocks the original. Every row audited.
-- • faculty_attendance_events — Faculty Presence / Lecture Started taps. Written
--   by P8.3; the Missed-Lecture detector (src/lib/missedLecture.ts) reads them.
-- • attendance_exceptions — system-generated Missed-Lecture events (the cron that
--   writes them is wired in P8.3, once faculty taps exist).
--
-- RLS mirrors public.smart_cards: admin-write via private.get_user_authorizations()
-- (SUPER_ADMIN anywhere, INST_ADMIN within their institution — PRINCIPAL is already
-- normalised to INST_ADMIN), extended so HOD/DEPARTMENT_HEAD manage their own
-- department's substitutions; institution-member read for the operational tables.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Room assignment on the timetable ──────────────────────────────────────────
alter table public.class_schedules
  add column if not exists classroom_id uuid references public.classrooms(id) on delete set null;
create index if not exists ix_class_schedules_classroom on public.class_schedules (classroom_id);

-- ── Substitute faculty ────────────────────────────────────────────────────────
create table if not exists public.class_substitutions (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete cascade,
  schedule_id         uuid not null references public.class_schedules(id) on delete cascade,
  sub_date            date not null,
  substitute_staff_id uuid not null references public.staff(id) on delete cascade,
  original_staff_id   uuid references public.staff(id) on delete set null,
  reason              text,
  assigned_by         uuid,
  created_at          timestamptz not null default now(),
  unique (schedule_id, sub_date)
);
create index if not exists ix_class_substitutions_lookup on public.class_substitutions (institution_id, sub_date);
create index if not exists ix_class_substitutions_schedule on public.class_substitutions (schedule_id, sub_date);

alter table public.class_substitutions enable row level security;

drop policy if exists "substitutions: admins/hod manage" on public.class_substitutions;
create policy "substitutions: admins/hod manage" on public.class_substitutions
  to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = class_substitutions.institution_id and g.role = 'INST_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g
               join public.class_schedules cs on cs.id = class_substitutions.schedule_id
               where g.tenant_id = class_substitutions.institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and cs.department_id = g.department_id)
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = class_substitutions.institution_id and g.role = 'INST_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g
               join public.class_schedules cs on cs.id = class_substitutions.schedule_id
               where g.tenant_id = class_substitutions.institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and cs.department_id = g.department_id)
  );

drop policy if exists "substitutions: members read" on public.class_substitutions;
create policy "substitutions: members read" on public.class_substitutions
  for select to authenticated
  using (institution_id in (select institution_id from public.institution_members where profile_id = (select auth.uid())));

grant select, insert, update, delete on public.class_substitutions to authenticated;

-- ── Faculty presence / lecture-started events (written by P8.3) ───────────────
create table if not exists public.faculty_attendance_events (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  schedule_id    uuid not null references public.class_schedules(id) on delete cascade,
  staff_id       uuid not null references public.staff(id) on delete cascade,
  classroom_id   uuid references public.classrooms(id) on delete set null,
  event_type     text not null check (event_type in ('faculty_presence','lecture_started')),
  tapped_at      timestamptz not null default now()
);
create index if not exists ix_faculty_events_schedule on public.faculty_attendance_events (schedule_id, tapped_at);
create index if not exists ix_faculty_events_institution on public.faculty_attendance_events (institution_id, tapped_at);

alter table public.faculty_attendance_events enable row level security;

drop policy if exists "faculty events: admins manage" on public.faculty_attendance_events;
create policy "faculty events: admins manage" on public.faculty_attendance_events
  to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = faculty_attendance_events.institution_id and g.role in ('INST_ADMIN','HOD','DEPARTMENT_HEAD'))
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = faculty_attendance_events.institution_id and g.role in ('INST_ADMIN','HOD','DEPARTMENT_HEAD'))
  );

drop policy if exists "faculty events: members read" on public.faculty_attendance_events;
create policy "faculty events: members read" on public.faculty_attendance_events
  for select to authenticated
  using (institution_id in (select institution_id from public.institution_members where profile_id = (select auth.uid())));

grant select, insert, update, delete on public.faculty_attendance_events to authenticated;

-- ── Attendance exceptions (Missed Lecture — cron wired in P8.3) ────────────────
create table if not exists public.attendance_exceptions (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  schedule_id    uuid not null references public.class_schedules(id) on delete cascade,
  exception_type text not null check (exception_type in ('missed_lecture')),
  exception_date date not null,
  detected_at    timestamptz not null default now(),
  resolved_at    timestamptz,
  unique (schedule_id, exception_date, exception_type)
);
create index if not exists ix_attendance_exceptions_lookup on public.attendance_exceptions (institution_id, exception_date);

alter table public.attendance_exceptions enable row level security;

-- Operational events — visible to Principal/HOD/Super Admin only (not students).
drop policy if exists "attendance exceptions: leadership manage" on public.attendance_exceptions;
create policy "attendance exceptions: leadership manage" on public.attendance_exceptions
  to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = attendance_exceptions.institution_id and g.role in ('INST_ADMIN','HOD','DEPARTMENT_HEAD'))
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = attendance_exceptions.institution_id and g.role in ('INST_ADMIN','HOD','DEPARTMENT_HEAD'))
  );

grant select, insert, update, delete on public.attendance_exceptions to authenticated;

-- ── CF-1 config: Missed-Lecture grace period ──────────────────────────────────
insert into public.app_setting_definitions (key, category, label, description, type, default_value, options, sort_order) values
  ('smart_campus.missed_lecture_grace_minutes','Smart Campus','Missed-Lecture Grace (min)','Minutes after a lecture start with no faculty tap and no substitute before Aura flags a Missed Lecture (P8.4).','number','15',null,6)
on conflict (key) do nothing;
