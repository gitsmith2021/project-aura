-- Phase 4H — Student Clubs & Organizations (NSS / NCC / Cultural)
-- Tracking student participation and activities for NAAC Criterion 5.3

create table if not exists public.clubs (
  id                   uuid primary key default gen_random_uuid(),
  institution_id       uuid not null references public.institutions(id) on delete cascade,
  name                 text not null,
  club_type            text not null check (club_type in (
                         'nss','ncc','cultural','sports','literary',
                         'technical','environmental','other')),
  faculty_coordinator  uuid references public.staff(id) on delete set null,
  student_secretary_id uuid references public.students(id) on delete set null,
  description          text,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);

create table if not exists public.club_members (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role       text not null default 'member'
             check (role in ('member','secretary','joint_secretary','treasurer','president')),
  joined_at  date not null default current_date,
  created_at timestamptz not null default now(),
  unique(club_id, student_id)
);

create table if not exists public.club_activities (
  id                 uuid primary key default gen_random_uuid(),
  club_id            uuid not null references public.clubs(id) on delete cascade,
  title              text not null,
  activity_type      text not null check (activity_type in (
                       'event','camp','competition','workshop',
                       'community_service','seminar','other')),
  activity_date      date not null,
  venue              text,
  participants_count integer default 0,
  description        text,
  photo_urls         jsonb default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

-- Indexes
create index if not exists idx_clubs_inst ON public.clubs(institution_id);
create index if not exists idx_club_members_club ON public.club_members(club_id);
create index if not exists idx_club_members_student ON public.club_members(student_id);
create index if not exists idx_club_activities_club ON public.club_activities(club_id);

-- Enable RLS
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_activities enable row level security;

-- Policies for public.clubs
drop policy if exists "clubs: select" on public.clubs;
create policy "clubs: select" on public.clubs for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
    )
  );

drop policy if exists "clubs: manage" on public.clubs;
create policy "clubs: manage" on public.clubs for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or faculty_coordinator in (select id from public.staff where profile_id = auth.uid())
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or faculty_coordinator in (select id from public.staff where profile_id = auth.uid())
  );

-- Policies for public.club_members
drop policy if exists "club_members: select" on public.club_members;
create policy "club_members: select" on public.club_members for select to authenticated
  using (
    exists (
      select 1 from public.clubs c
      where c.id = club_members.club_id
        and c.institution_id in (
          select institution_id from public.institution_members where profile_id = auth.uid()
          union select institution_id from public.staff where profile_id = auth.uid()
        )
    )
  );

drop policy if exists "club_members: manage" on public.club_members;
create policy "club_members: manage" on public.club_members for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (
      select 1 from public.clubs c
      join private.get_user_authorizations() g on g.tenant_id = c.institution_id
      where c.id = club_members.club_id and g.role = 'INST_ADMIN'
    )
    or exists (
      select 1 from public.clubs c
      join public.staff s on s.id = c.faculty_coordinator
      where c.id = club_members.club_id and s.profile_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (
      select 1 from public.clubs c
      join private.get_user_authorizations() g on g.tenant_id = c.institution_id
      where c.id = club_members.club_id and g.role = 'INST_ADMIN'
    )
    or exists (
      select 1 from public.clubs c
      join public.staff s on s.id = c.faculty_coordinator
      where c.id = club_members.club_id and s.profile_id = auth.uid()
    )
  );

-- Policies for public.club_activities
drop policy if exists "club_activities: select" on public.club_activities;
create policy "club_activities: select" on public.club_activities for select to authenticated
  using (
    exists (
      select 1 from public.clubs c
      where c.id = club_activities.club_id
        and c.institution_id in (
          select institution_id from public.institution_members where profile_id = auth.uid()
          union select institution_id from public.staff where profile_id = auth.uid()
        )
    )
  );

drop policy if exists "club_activities: manage" on public.club_activities;
create policy "club_activities: manage" on public.club_activities for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (
      select 1 from public.clubs c
      join private.get_user_authorizations() g on g.tenant_id = c.institution_id
      where c.id = club_activities.club_id and g.role = 'INST_ADMIN'
    )
    or exists (
      select 1 from public.clubs c
      join public.staff s on s.id = c.faculty_coordinator
      where c.id = club_activities.club_id and s.profile_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (
      select 1 from public.clubs c
      join private.get_user_authorizations() g on g.tenant_id = c.institution_id
      where c.id = club_activities.club_id and g.role = 'INST_ADMIN'
    )
    or exists (
      select 1 from public.clubs c
      join public.staff s on s.id = c.faculty_coordinator
      where c.id = club_activities.club_id and s.profile_id = auth.uid()
    )
  );

-- Grants
grant select, insert, update, delete on public.clubs to authenticated;
grant select, insert, update, delete on public.club_members to authenticated;
grant select, insert, update, delete on public.club_activities to authenticated;
grant select, insert, update, delete on public.clubs to service_role;
grant select, insert, update, delete on public.club_members to service_role;
grant select, insert, update, delete on public.club_activities to service_role;
