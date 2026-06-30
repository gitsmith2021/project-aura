-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 8 — Mobile & Smart Campus · Sprint 1 (Foundation)
--
-- Introduces the Classroom as a managed Smart Campus entity, plus the two
-- hardware registries that future Phase 8 sub-phases attach to it:
--   - nfc_tags    — per-room NFC tag identity, taps drive P8.3 Faculty
--                   Presence/Lecture Started events (gated by P8.4 validation).
--   - card_readers — vendor-independent (RFID/NFC/MIFARE/DESFire) fixed in-room
--                    reader registry for P8.2 student card attendance. This is
--                    a deliberately separate model from the existing
--                    public.devices table (Phase 4F), which represents a
--                    staff-carried handheld scanner, not a fixed in-room
--                    reader — the two are different deployment shapes and are
--                    not merged.
--
-- Both registries mirror the lifecycle shape of public.smart_cards
-- (status + replaced_by) so registration/replacement/deactivation/
-- reassignment (P8.3) come for free, and last_seen_at gives a basic
-- "offline" health signal for the future Attendance Exception Dashboard.
--
-- RLS mirrors public.smart_cards: admin-write via
-- private.get_user_authorizations() (SUPER_ADMIN anywhere, INST_ADMIN within
-- their own institution — PRINCIPAL is already normalised to INST_ADMIN by
-- that function); institution-member read.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.classrooms (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  department_id   uuid references public.departments(id) on delete set null,
  building        text not null,
  floor           text,
  room_number     text not null,
  room_type       text not null default 'classroom'
                  check (room_type in ('classroom','lab','library','office','seminar_hall','meeting_room')),
  capacity        integer,
  created_at      timestamptz not null default now(),
  unique (institution_id, building, floor, room_number)
);

create index if not exists ix_classrooms_institution on public.classrooms (institution_id);
create index if not exists ix_classrooms_department on public.classrooms (department_id);

create table if not exists public.nfc_tags (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  tag_uid         text not null unique,
  classroom_id    uuid references public.classrooms(id) on delete set null,
  status          text not null default 'active'
                  check (status in ('active','inactive','replaced')),
  replaced_by     uuid references public.nfc_tags(id),
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists ix_nfc_tags_institution on public.nfc_tags (institution_id);
create index if not exists ix_nfc_tags_classroom on public.nfc_tags (classroom_id);

create table if not exists public.card_readers (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  reader_uid      text not null unique,
  vendor          text not null check (vendor in ('rfid','nfc','mifare','desfire')),
  classroom_id    uuid references public.classrooms(id) on delete set null,
  status          text not null default 'active'
                  check (status in ('active','inactive')),
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists ix_card_readers_institution on public.card_readers (institution_id);
create index if not exists ix_card_readers_classroom on public.card_readers (classroom_id);

-- ── classrooms RLS ──────────────────────────────────────────────────────────

alter table public.classrooms enable row level security;

drop policy if exists "classrooms: admins manage" on public.classrooms;
create policy "classrooms: admins manage" on public.classrooms
  to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = classrooms.institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = classrooms.institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "classrooms: members read" on public.classrooms;
create policy "classrooms: members read" on public.classrooms
  for select to authenticated
  using (institution_id in (select institution_id from public.institution_members where profile_id = (select auth.uid())));

-- ── nfc_tags RLS ─────────────────────────────────────────────────────────────

alter table public.nfc_tags enable row level security;

drop policy if exists "nfc_tags: admins manage" on public.nfc_tags;
create policy "nfc_tags: admins manage" on public.nfc_tags
  to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = nfc_tags.institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = nfc_tags.institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "nfc_tags: members read" on public.nfc_tags;
create policy "nfc_tags: members read" on public.nfc_tags
  for select to authenticated
  using (institution_id in (select institution_id from public.institution_members where profile_id = (select auth.uid())));

-- ── card_readers RLS ─────────────────────────────────────────────────────────

alter table public.card_readers enable row level security;

drop policy if exists "card_readers: admins manage" on public.card_readers;
create policy "card_readers: admins manage" on public.card_readers
  to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = card_readers.institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = card_readers.institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "card_readers: members read" on public.card_readers;
create policy "card_readers: members read" on public.card_readers
  for select to authenticated
  using (institution_id in (select institution_id from public.institution_members where profile_id = (select auth.uid())));

grant select, insert, update, delete on public.classrooms to authenticated;
grant select, insert, update, delete on public.nfc_tags to authenticated;
grant select, insert, update, delete on public.card_readers to authenticated;

-- ── CF-1 Smart Campus config toggles ───────────────────────────────────────────
-- Deferred (src/lib/config.ts DEFERRED_KEYS): the registries above exist, but the
-- hardware ingest endpoints / CCTV stream / push pipeline they gate are built in
-- later Phase 8 sprints, so these are stored & audited but not yet enforced.
insert into public.app_setting_definitions (key, category, label, description, type, default_value, options, sort_order) values
  ('smart_campus.rfid_enabled','Smart Campus','RFID Attendance','Allow student attendance via fixed RFID in-room readers (P8.2).','toggle','true',null,1),
  ('smart_campus.nfc_enabled','Smart Campus','NFC Staff Attendance','Allow staff Faculty Presence / Lecture Started taps via room NFC tags (P8.3).','toggle','true',null,2),
  ('smart_campus.cctv_enabled','Smart Campus','CCTV Access','Allow ONVIF/RTSP camera streaming from classrooms (P8.6).','toggle','true',null,3),
  ('smart_campus.push_notifications_enabled','Smart Campus','Mobile Push Notifications','Send push notifications to the mobile apps (P8.5).','toggle','true',null,4),
  ('smart_campus.smart_attendance_enabled','Smart Campus','Smart Attendance Validation','Validate taps against the timetable and flag Missed Lecture / Substitute Faculty (P8.4).','toggle','true',null,5)
on conflict (key) do nothing;
