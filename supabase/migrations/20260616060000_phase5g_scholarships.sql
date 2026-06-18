-- Phase 5G — Scholarship Management
-- Government / institutional / private scholarship schemes → student applications
-- with auto-eligibility, verification → approval → disbursement, and fee integration
-- (an approved disbursement creates an approved fee_concession that reduces dues).

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.scholarship_schemes (
  id                   uuid primary key default gen_random_uuid(),
  institution_id       uuid not null references public.institutions(id) on delete cascade,
  name                 text not null,
  scheme_type          text not null check (scheme_type in (
                         'government_central','government_state','institutional',
                         'private','sports','merit','minority','sc_st_obc')),
  description          text,
  eligibility_criteria jsonb,                          -- { min_marks, categories: [], income_limit }
  amount_per_student   numeric(10,2),
  renewable            boolean not null default true,
  application_deadline date,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now()
);
create index if not exists idx_schemes_inst on public.scholarship_schemes(institution_id, scheme_type);

create table if not exists public.scholarship_applications (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  scheme_id        uuid not null references public.scholarship_schemes(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  application_date date not null default current_date,
  documents_url    jsonb,
  status           text not null default 'applied'
                   check (status in ('applied','verified','approved','rejected','disbursed')),
  disbursed_amount numeric(10,2),
  disbursed_at     timestamptz,
  admin_notes      text,
  created_at       timestamptz not null default now(),
  unique (scheme_id, student_id, academic_year_id)
);
create index if not exists idx_schol_apps_inst    on public.scholarship_applications(institution_id, status);
create index if not exists idx_schol_apps_scheme  on public.scholarship_applications(scheme_id);
create index if not exists idx_schol_apps_student on public.scholarship_applications(student_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.scholarship_schemes enable row level security;
alter table public.scholarship_applications enable row level security;

-- schemes: institution members read; admins manage.
drop policy if exists "schemes: members read" on public.scholarship_schemes;
create policy "schemes: members read" on public.scholarship_schemes for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );
drop policy if exists "schemes: admins manage" on public.scholarship_schemes;
create policy "schemes: admins manage" on public.scholarship_schemes for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- applications: students read + create their own; admins read + manage all.
drop policy if exists "schol_apps: student read own" on public.scholarship_applications;
create policy "schol_apps: student read own" on public.scholarship_applications for select to authenticated
  using (student_id in (select id from public.students where profile_id = auth.uid()));

drop policy if exists "schol_apps: student apply" on public.scholarship_applications;
create policy "schol_apps: student apply" on public.scholarship_applications for insert to authenticated
  with check (
    student_id in (select id from public.students where profile_id = auth.uid())
    and status = 'applied'
  );

drop policy if exists "schol_apps: admins read" on public.scholarship_applications;
create policy "schol_apps: admins read" on public.scholarship_applications for select to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "schol_apps: admins manage" on public.scholarship_applications;
create policy "schol_apps: admins manage" on public.scholarship_applications for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.scholarship_schemes to authenticated;
grant select, insert, update, delete on public.scholarship_applications to authenticated;

-- ── Storage: scholarship-docs bucket (proof uploads) ─────────────────────────
insert into storage.buckets (id, name, public)
values ('scholarship-docs', 'scholarship-docs', true)
on conflict (id) do nothing;

drop policy if exists "scholarship-docs: authenticated upload" on storage.objects;
create policy "scholarship-docs: authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'scholarship-docs');

drop policy if exists "scholarship-docs: public read" on storage.objects;
create policy "scholarship-docs: public read" on storage.objects for select to public
  using (bucket_id = 'scholarship-docs');
