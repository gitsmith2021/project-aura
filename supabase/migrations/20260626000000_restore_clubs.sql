-- Restore Phase 4H — Student Clubs & Organizations (NSS / NCC / Cultural)
--
-- The `clubs`, `club_members` and `club_activities` tables were lost in the
-- migration rebaseline (`be1b9e4` squashed migrations into a schema baseline
-- that omitted them), yet src/actions/clubs.ts still queries them — so the
-- clubs feature was silently broken (list empty, detail redirected away). This
-- restores the schema and RLS, mirroring the Phase 4 `laboratories` pattern
-- (admins manage; institution members read). Column set matches clubs.ts +
-- the types in src/lib/clubs.ts.

create table if not exists public.clubs (
  id                   uuid primary key default gen_random_uuid(),
  institution_id       uuid not null references public.institutions(id) on delete cascade,
  name                 text not null,
  club_type            text not null check (club_type in (
                         'nss','ncc','cultural','sports','literary','technical','environmental','other')),
  faculty_coordinator  uuid references public.staff(id) on delete set null,
  student_secretary_id uuid references public.students(id) on delete set null,
  description          text,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);
create index if not exists idx_clubs_inst on public.clubs(institution_id);

create table if not exists public.club_members (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role       text not null default 'member' check (role in (
               'member','secretary','joint_secretary','treasurer','president')),
  joined_at  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (club_id, student_id)
);
create index if not exists idx_club_members_club on public.club_members(club_id);

create table if not exists public.club_activities (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references public.clubs(id) on delete cascade,
  title              text not null,
  activity_type      text not null check (activity_type in (
                       'event','camp','competition','workshop','community_service','seminar','other')),
  activity_date      date not null,
  venue              text,
  participants_count integer not null default 0,
  description        text,
  photo_urls         text[] not null default '{}',
  created_at         timestamptz not null default now()
);
create index if not exists idx_club_activities_club on public.club_activities(club_id);

-- ── RLS (mirrors public.laboratories) ─────────────────────────────────────────

alter table public.clubs            enable row level security;
alter table public.club_members     enable row level security;
alter table public.club_activities  enable row level security;

-- clubs: SUPER_ADMIN (any) / INST_ADMIN (own institution) manage; institution
-- members (admin/staff/student) read.
drop policy if exists "clubs: admins manage" on public.clubs;
create policy "clubs: admins manage" on public.clubs for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "clubs: members read" on public.clubs;
create policy "clubs: members read" on public.clubs for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

-- club_members / club_activities: scoped through the parent club's institution.
drop policy if exists "club_members: admins manage" on public.club_members;
create policy "club_members: admins manage" on public.club_members for all to authenticated
  using (
    club_id in (
      select c.id from public.clubs c
      where exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
         or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = c.institution_id and g.role = 'INST_ADMIN')
    )
  )
  with check (
    club_id in (
      select c.id from public.clubs c
      where exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
         or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = c.institution_id and g.role = 'INST_ADMIN')
    )
  );

drop policy if exists "club_members: members read" on public.club_members;
create policy "club_members: members read" on public.club_members for select to authenticated
  using (
    club_id in (
      select c.id from public.clubs c where c.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "club_activities: admins manage" on public.club_activities;
create policy "club_activities: admins manage" on public.club_activities for all to authenticated
  using (
    club_id in (
      select c.id from public.clubs c
      where exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
         or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = c.institution_id and g.role = 'INST_ADMIN')
    )
  )
  with check (
    club_id in (
      select c.id from public.clubs c
      where exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
         or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = c.institution_id and g.role = 'INST_ADMIN')
    )
  );

drop policy if exists "club_activities: members read" on public.club_activities;
create policy "club_activities: members read" on public.club_activities for select to authenticated
  using (
    club_id in (
      select c.id from public.clubs c where c.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );

grant select, insert, update, delete on public.clubs           to authenticated;
grant select, insert, update, delete on public.club_members    to authenticated;
grant select, insert, update, delete on public.club_activities to authenticated;
