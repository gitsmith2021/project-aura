-- Phase 3D — Digital Notice Board
create table if not exists public.notices (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  title           text not null,
  body            text not null,
  notice_type     text not null check (notice_type in (
                    'academic','exam','holiday','event','emergency',
                    'placement','hostel','transport','general')),
  target_audience text not null default 'all' check (target_audience in (
                    'all','students','staff','parents','hostel')),
  department_id   uuid references public.departments(id) on delete set null,  -- NULL = institution-wide
  attachment_url  text,
  is_pinned       boolean not null default false,
  expires_at      date,
  posted_by       uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_notices_inst_active  on public.notices(institution_id, expires_at);
create index if not exists idx_notices_inst_pinned  on public.notices(institution_id, is_pinned, created_at desc);

alter table public.notices enable row level security;

-- SELECT: any member of the institution (admin, staff, or student). Audience /
-- department filtering is applied in the query (getActiveNotices), not RLS.
drop policy if exists "notices: institution members read" on public.notices;
create policy "notices: institution members read"
  on public.notices for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union
      select institution_id from public.staff where profile_id = auth.uid()
      union
      select institution_id from public.students where profile_id = auth.uid()
    )
  );

-- Manage: institution admins (PRINCIPAL normalises to INST_ADMIN) + super admins.
drop policy if exists "notices: admins insert" on public.notices;
create policy "notices: admins insert"
  on public.notices for insert to authenticated
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g
               where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "notices: admins update" on public.notices;
create policy "notices: admins update"
  on public.notices for update to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g
               where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g
               where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "notices: admins delete" on public.notices;
create policy "notices: admins delete"
  on public.notices for delete to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g
               where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.notices to authenticated;
