-- Phase 5I — Research & Publications Management (NAAC Criterion 3 · NIRF)
-- Staff research projects + publications. Publications logged by staff auto-link
-- to their Staff Appraisal (Step 5E) to avoid duplicate evidence entry.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.research_projects (
  id                     uuid primary key default gen_random_uuid(),
  institution_id         uuid not null references public.institutions(id) on delete cascade,
  title                  text not null,
  principal_investigator uuid references public.staff(id) on delete set null,
  co_investigators       jsonb,                         -- array of names
  funding_agency         text,
  funding_amount         numeric(12,2),                 -- sanctioned (₹)
  funding_spent          numeric(12,2),                 -- utilised (₹)
  start_date             date,
  end_date               date,
  status                 text not null default 'ongoing'
                         check (status in ('proposed','ongoing','completed','published')),
  department_id          uuid references public.departments(id) on delete set null,
  created_at             timestamptz not null default now()
);
create index if not exists idx_research_proj_inst on public.research_projects(institution_id, status);
create index if not exists idx_research_proj_pi   on public.research_projects(principal_investigator);

create table if not exists public.publications (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  staff_id       uuid not null references public.staff(id) on delete cascade,
  title          text not null,
  pub_type       text not null check (pub_type in (
                   'journal','conference','book','book_chapter','patent','other')),
  journal_name   text,
  publisher      text,
  pub_year       integer not null,
  doi            text,
  scopus_indexed boolean not null default false,
  ugc_listed     boolean not null default false,
  impact_factor  numeric(6,3),
  authors        jsonb,                                 -- array of author names
  document_url   text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pub_inst  on public.publications(institution_id, pub_year);
create index if not exists idx_pub_staff on public.publications(staff_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.research_projects enable row level security;
alter table public.publications enable row level security;

-- Projects: institution members read; admins manage.
drop policy if exists "research_proj: members read" on public.research_projects;
create policy "research_proj: members read" on public.research_projects for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );
drop policy if exists "research_proj: admins manage" on public.research_projects;
create policy "research_proj: admins manage" on public.research_projects for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- Publications: institution members read; staff manage their OWN; admins manage all.
drop policy if exists "pub: members read" on public.publications;
create policy "pub: members read" on public.publications for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

drop policy if exists "pub: staff manage own" on public.publications;
create policy "pub: staff manage own" on public.publications for all to authenticated
  using (staff_id in (select id from public.staff where profile_id = auth.uid()))
  with check (staff_id in (select id from public.staff where profile_id = auth.uid()));

drop policy if exists "pub: admins manage" on public.publications;
create policy "pub: admins manage" on public.publications for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.research_projects to authenticated;
grant select, insert, update, delete on public.publications to authenticated;

-- ── Storage: research-docs bucket (publication PDFs — public research output) ──
insert into storage.buckets (id, name, public)
values ('research-docs', 'research-docs', true)
on conflict (id) do nothing;

drop policy if exists "research-docs: authenticated upload" on storage.objects;
create policy "research-docs: authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'research-docs');

drop policy if exists "research-docs: public read" on storage.objects;
create policy "research-docs: public read" on storage.objects for select to public
  using (bucket_id = 'research-docs');
