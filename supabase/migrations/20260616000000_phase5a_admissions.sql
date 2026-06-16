-- Phase 5A — Student Admissions System
-- Public applicants submit applications (no auth); admins shortlist → interview →
-- admit → enroll (converting an application into a student + auth account).

create table if not exists public.admissions (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  applicant_name    text not null,
  applicant_email   text not null,
  applicant_phone   text,
  program_applied   text not null check (program_applied in ('UG','PG')),
  department_id     uuid references public.departments(id) on delete set null,
  dob               date,
  address           text,
  previous_school   text,
  marks_percentage  numeric(5,2),
  documents_url     jsonb,
  status            text not null default 'applied'
                    check (status in ('applied','shortlisted','interview','admitted','rejected','enrolled')),
  admin_notes       text,
  applied_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_admissions_inst  on public.admissions(institution_id, status);
create index if not exists idx_admissions_email on public.admissions(applicant_email);

alter table public.admissions enable row level security;

-- Public apply — anyone (anon or signed-in) may submit a NEW application.
-- The status guard stops a direct API call from self-admitting/enrolling.
drop policy if exists "admissions: public apply" on public.admissions;
create policy "admissions: public apply" on public.admissions for insert to anon, authenticated
  with check (status = 'applied');

-- Admins read + manage their institution's applications.
drop policy if exists "admissions: admins read" on public.admissions;
create policy "admissions: admins read" on public.admissions for select to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "admissions: admins manage" on public.admissions;
create policy "admissions: admins manage" on public.admissions for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant insert on public.admissions to anon, authenticated;
grant select, update, delete on public.admissions to authenticated;
