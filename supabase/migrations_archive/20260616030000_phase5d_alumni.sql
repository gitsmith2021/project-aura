-- Phase 5D — Alumni System & Panel
-- Graduates (students.is_graduated = true) are imported into `alumni`, carrying
-- over their auth account (profile_id) so they can self-serve from /alumni-portal.
-- Admins manage the directory and broadcast batch-targeted announcements.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.alumni (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  -- auth account carried over from the student record (NULL for manually-added
  -- historical alumni who have no login yet).
  profile_id        uuid references auth.users(id) on delete set null,
  source_student_id uuid references public.students(id) on delete set null,
  full_name         text not null,
  email             text,
  phone             text,
  roll_no           text,
  program           text,
  department_id     uuid references public.departments(id) on delete set null,
  graduation_year   integer not null,
  batch             text,
  current_employer  text,
  current_designation text,            -- job title; `current_role` is a reserved word in Postgres
  linkedin_url      text,
  city              text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_alumni_inst        on public.alumni(institution_id, graduation_year);
create index if not exists idx_alumni_profile      on public.alumni(profile_id);
create index if not exists idx_alumni_dept         on public.alumni(department_id);
-- One alumni record per auth account.
create unique index if not exists uq_alumni_profile on public.alumni(profile_id) where profile_id is not null;

create table if not exists public.alumni_announcements (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  title            text not null,
  body             text not null,
  -- NULL graduation_year/program = broadcast to ALL alumni of the institution.
  graduation_year  integer,
  program          text,
  posted_by        uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_alumni_ann_inst on public.alumni_announcements(institution_id, created_at desc);

-- ── Helper: the institutions the current user is an alumnus of ────────────────
-- SECURITY DEFINER so it bypasses RLS on `alumni` — querying `alumni` directly
-- inside an `alumni` RLS policy would recurse. Mirrors private.get_user_authorizations().
create or replace function private.alumni_institution_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select institution_id from public.alumni
  where profile_id = auth.uid() and is_active = true;
$$;

-- ── RLS: alumni ───────────────────────────────────────────────────────────────

alter table public.alumni enable row level security;

-- Admins (SUPER_ADMIN / INST_ADMIN, PRINCIPAL normalises to INST_ADMIN) read +
-- manage their institution's alumni; alumni read fellow alumni of the same
-- institution (directory). The directory read goes through the SECURITY DEFINER
-- helper to avoid RLS recursion on this table.
drop policy if exists "alumni: read" on public.alumni;
create policy "alumni: read" on public.alumni for select to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or institution_id in (select private.alumni_institution_ids())
  );

-- Alumni update only their own row (column-level restriction enforced in the
-- updateAlumniProfile action — RLS guards the row, the action guards the fields).
drop policy if exists "alumni: self update" on public.alumni;
create policy "alumni: self update" on public.alumni for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Admins manage (insert/update/delete) their institution's alumni. The import
-- and admin-edit actions use the service-role client, but these policies allow
-- ordinary admin sessions to manage too.
drop policy if exists "alumni: admins manage" on public.alumni;
create policy "alumni: admins manage" on public.alumni for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- ── RLS: alumni_announcements ─────────────────────────────────────────────────

alter table public.alumni_announcements enable row level security;

drop policy if exists "alumni_ann: read" on public.alumni_announcements;
create policy "alumni_ann: read" on public.alumni_announcements for select to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or institution_id in (select private.alumni_institution_ids())
  );

drop policy if exists "alumni_ann: admins manage" on public.alumni_announcements;
create policy "alumni_ann: admins manage" on public.alumni_announcements for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.alumni to authenticated;
grant select, insert, update, delete on public.alumni_announcements to authenticated;
