-- Phase 5F — Placement Cell & Career Services (NIRF Criterion 5.2)
-- Company registry → placement drives → student registrations with stage tracking.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.companies (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  name             text not null,
  industry         text,
  website          text,
  hr_contact_name  text,
  hr_contact_email text,
  hr_contact_phone text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_companies_inst on public.companies(institution_id, name);

create table if not exists public.placement_drives (
  id                   uuid primary key default gen_random_uuid(),
  institution_id       uuid not null references public.institutions(id) on delete cascade,
  company_id           uuid not null references public.companies(id) on delete cascade,
  academic_year_id     uuid references public.academic_years(id) on delete set null,
  drive_date           date not null,
  job_role             text not null,
  ctc_offered          numeric(10,2),                 -- in LPA
  eligibility_criteria jsonb,                          -- { min_cgpa, no_backlogs, departments: [] }
  process_stages       jsonb,                          -- ["Resume Screening","Aptitude","Technical","HR"]
  is_exclusive         boolean not null default true,  -- placed students cannot re-register
  status               text not null default 'scheduled'
                       check (status in ('scheduled','ongoing','completed','cancelled')),
  created_at           timestamptz not null default now()
);
create index if not exists idx_drives_inst on public.placement_drives(institution_id, drive_date desc);

create table if not exists public.placement_registrations (
  id            uuid primary key default gen_random_uuid(),
  drive_id      uuid not null references public.placement_drives(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  stage_status  text not null default 'registered'
                check (stage_status in ('registered','shortlisted','interviewed','offered','rejected','placed')),
  offer_ctc     numeric(10,2),
  notes         text,
  registered_at timestamptz not null default now(),
  placed_at     timestamptz,
  unique (drive_id, student_id)
);
create index if not exists idx_registrations_drive   on public.placement_registrations(drive_id);
create index if not exists idx_registrations_student on public.placement_registrations(student_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.companies enable row level security;
alter table public.placement_drives enable row level security;
alter table public.placement_registrations enable row level security;

-- Helper expression reused below: institutions the current user belongs to.
-- (Inlined per-policy to match the existing notices convention.)

-- companies: institution members read; admins manage.
drop policy if exists "companies: members read" on public.companies;
create policy "companies: members read" on public.companies for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );
drop policy if exists "companies: admins manage" on public.companies;
create policy "companies: admins manage" on public.companies for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- placement_drives: institution members read; admins manage.
drop policy if exists "drives: members read" on public.placement_drives;
create policy "drives: members read" on public.placement_drives for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );
drop policy if exists "drives: admins manage" on public.placement_drives;
create policy "drives: admins manage" on public.placement_drives for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- registrations: students see + create their own; admins see + manage all in their institution.
drop policy if exists "registrations: student read own" on public.placement_registrations;
create policy "registrations: student read own" on public.placement_registrations for select to authenticated
  using (student_id in (select id from public.students where profile_id = auth.uid()));

drop policy if exists "registrations: student register" on public.placement_registrations;
create policy "registrations: student register" on public.placement_registrations for insert to authenticated
  with check (
    student_id in (select id from public.students where profile_id = auth.uid())
    and stage_status = 'registered'
  );

drop policy if exists "registrations: admins read" on public.placement_registrations;
create policy "registrations: admins read" on public.placement_registrations for select to authenticated
  using (
    exists (
      select 1 from public.placement_drives d
      where d.id = drive_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = d.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

drop policy if exists "registrations: admins manage" on public.placement_registrations;
create policy "registrations: admins manage" on public.placement_registrations for all to authenticated
  using (
    exists (
      select 1 from public.placement_drives d
      where d.id = drive_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = d.institution_id and g.role = 'INST_ADMIN')
      )
    )
  )
  with check (
    exists (
      select 1 from public.placement_drives d
      where d.id = drive_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = d.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.placement_drives to authenticated;
grant select, insert, update, delete on public.placement_registrations to authenticated;
