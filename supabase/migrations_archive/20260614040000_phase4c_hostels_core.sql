-- Phase 4C (pass 1) — Hostel core: hostels, rooms, allocations
create table if not exists public.hostels (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  name            text not null,
  hostel_type     text not null check (hostel_type in ('boys','girls','co-ed')),
  warden_id       uuid references public.staff(id) on delete set null,
  total_rooms     integer,
  address         text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.hostel_rooms (
  id          uuid primary key default gen_random_uuid(),
  hostel_id   uuid not null references public.hostels(id) on delete cascade,
  room_number text not null,
  floor       integer not null default 1,
  room_type   text not null check (room_type in ('single','double','triple','dormitory')),
  capacity    integer not null default 2,
  occupied    integer not null default 0,
  amenities   jsonb
);

create table if not exists public.hostel_allocations (
  id             uuid primary key default gen_random_uuid(),
  hostel_id      uuid not null references public.hostels(id) on delete cascade,
  room_id        uuid not null references public.hostel_rooms(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  allocated_from date not null default current_date,
  allocated_to   date,
  status         text not null default 'active' check (status in ('active','vacated','transferred')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_hostels_inst on public.hostels(institution_id);
create index if not exists idx_hostel_rooms_hostel on public.hostel_rooms(hostel_id, floor);
create index if not exists idx_hostel_alloc_room on public.hostel_allocations(room_id);
create index if not exists idx_hostel_alloc_student on public.hostel_allocations(student_id);
-- One ACTIVE allocation per student (deviates from spec's UNIQUE(student_id,status),
-- which would also block a second 'vacated' row — this is the correct constraint).
create unique index if not exists uq_hostel_alloc_active_student
  on public.hostel_allocations(student_id) where status = 'active';

alter table public.hostels enable row level security;
alter table public.hostel_rooms enable row level security;
alter table public.hostel_allocations enable row level security;

-- hostels: members read; admins manage
drop policy if exists "hostels: members read" on public.hostels;
create policy "hostels: members read" on public.hostels for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );
drop policy if exists "hostels: admins manage" on public.hostels;
create policy "hostels: admins manage" on public.hostels for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- rooms: scoped through the parent hostel's institution
drop policy if exists "hostel_rooms: members read" on public.hostel_rooms;
create policy "hostel_rooms: members read" on public.hostel_rooms for select to authenticated
  using (
    hostel_id in (
      select h.id from public.hostels h where h.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );
drop policy if exists "hostel_rooms: admins manage" on public.hostel_rooms;
create policy "hostel_rooms: admins manage" on public.hostel_rooms for all to authenticated
  using (
    exists (select 1 from public.hostels h where h.id = hostel_rooms.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = h.institution_id and g.role = 'INST_ADMIN')
    ))
  )
  with check (
    exists (select 1 from public.hostels h where h.id = hostel_rooms.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = h.institution_id and g.role = 'INST_ADMIN')
    ))
  );

-- allocations: a student reads their own; admins read + manage via the hostel's institution
drop policy if exists "hostel_alloc: student reads own or admin" on public.hostel_allocations;
create policy "hostel_alloc: student reads own or admin" on public.hostel_allocations for select to authenticated
  using (
    student_id in (select id from public.students where profile_id = auth.uid())
    or exists (select 1 from public.hostels h where h.id = hostel_allocations.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = h.institution_id and g.role = 'INST_ADMIN')
    ))
  );
drop policy if exists "hostel_alloc: admins manage" on public.hostel_allocations;
create policy "hostel_alloc: admins manage" on public.hostel_allocations for all to authenticated
  using (
    exists (select 1 from public.hostels h where h.id = hostel_allocations.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = h.institution_id and g.role = 'INST_ADMIN')
    ))
  )
  with check (
    exists (select 1 from public.hostels h where h.id = hostel_allocations.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = h.institution_id and g.role = 'INST_ADMIN')
    ))
  );

grant select, insert, update, delete on public.hostels to authenticated;
grant select, insert, update, delete on public.hostel_rooms to authenticated;
grant select, insert, update, delete on public.hostel_allocations to authenticated;
