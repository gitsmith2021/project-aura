-- Phase 7X / KH-1 — Aura Knowledge Hub: Basic Repository.
--
-- An institution-wide knowledge repository (notes, research, NAAC evidence,
-- policies, library media, …) distinct from the course-bound LMS (6G). KH-1 is
-- the foundation: the `knowledge_resources` table + a three-tier visibility RLS
-- model + the storage bucket. Search/discovery (KH-2), collaboration (KH-3),
-- analytics (KH-4) and the AI layer (KH-5) build on top.
--
-- Visibility tiers (per the Knowledge Hub vision doc §8):
--   institution — any member of the institution reads (published only)
--   department  — same-department staff/students + HODs/admins
--   restricted  — admins + the uploader only (no broad read policy)
-- Storage follows the existing public-bucket + unguessable-path convention;
-- the real visibility gate is the table RLS below.

create table if not exists public.knowledge_resources (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  department_id  uuid references public.departments(id) on delete set null,
  title          text not null,
  description    text,
  category       text not null check (category in ('academic','research','accreditation','administration','library','events','multimedia')),
  content_type   text not null,
  file_url       text,                 -- storage path in the knowledge-hub bucket
  external_url   text,                 -- external link (YouTube / DOI / journal)
  subject        text,
  academic_year  text,
  tags           text[] not null default '{}',
  visibility     text not null default 'institution' check (visibility in ('institution','department','restricted')),
  naac_criterion text check (naac_criterion is null or naac_criterion in ('1','2','3','4','5','6','7')),
  status         text not null default 'published' check (status in ('draft','published','archived')),
  uploaded_by    uuid references public.staff(id) on delete set null,
  uploader_name  text,                 -- denormalized for display if the staff row is removed
  download_count integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ix_knowledge_resources_institution_id on public.knowledge_resources(institution_id);
create index if not exists ix_knowledge_resources_department_id on public.knowledge_resources(department_id);
create index if not exists ix_knowledge_resources_uploaded_by on public.knowledge_resources(uploaded_by);
create index if not exists idx_kr_category on public.knowledge_resources(institution_id, category);
create index if not exists idx_kr_status on public.knowledge_resources(institution_id, status);
create index if not exists idx_kr_tags on public.knowledge_resources using gin(tags);

alter table public.knowledge_resources enable row level security;

-- Admins (super / inst-admin of the tenant) manage everything.
drop policy if exists "kr: admins manage" on public.knowledge_resources;
create policy "kr: admins manage" on public.knowledge_resources for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role='INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role='INST_ADMIN')
  );

-- Staff (faculty) manage their OWN uploads (this also grants their insert path).
drop policy if exists "kr: uploader manage own" on public.knowledge_resources;
create policy "kr: uploader manage own" on public.knowledge_resources for all to authenticated
  using (uploaded_by in (select id from public.staff where email = auth.email()))
  with check (uploaded_by in (select id from public.staff where email = auth.email()));

-- Tier 1 — institution-public, published: any member of the institution reads.
drop policy if exists "kr: institution read" on public.knowledge_resources;
create policy "kr: institution read" on public.knowledge_resources for select to authenticated
  using (
    status='published' and visibility='institution' and (
      exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id)
      or exists (select 1 from public.staff st where st.email = auth.email() and st.institution_id = knowledge_resources.institution_id)
      or exists (select 1 from public.students s where s.email = auth.email() and s.institution_id = knowledge_resources.institution_id)
    )
  );

-- Tier 2 — department, published: same-department staff/students + HODs/admins.
drop policy if exists "kr: department read" on public.knowledge_resources;
create policy "kr: department read" on public.knowledge_resources for select to authenticated
  using (
    status='published' and visibility='department' and (
      exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role in ('SUPER_ADMIN','INST_ADMIN','HOD','DEPARTMENT_HEAD'))
      or exists (select 1 from public.staff st where st.email = auth.email() and st.department_id = knowledge_resources.department_id)
      or exists (select 1 from public.students s where s.email = auth.email() and s.department_id = knowledge_resources.department_id)
    )
  );

grant select, insert, update, delete on public.knowledge_resources to authenticated;

-- Storage bucket (public, matching the receipts/study-materials convention).
insert into storage.buckets (id, name, public) values ('knowledge-hub','knowledge-hub', true) on conflict (id) do nothing;
drop policy if exists "knowledge-hub: authenticated upload" on storage.objects;
create policy "knowledge-hub: authenticated upload" on storage.objects for insert to authenticated with check (bucket_id='knowledge-hub');
drop policy if exists "knowledge-hub: public read" on storage.objects;
create policy "knowledge-hub: public read" on storage.objects for select using (bucket_id='knowledge-hub');
