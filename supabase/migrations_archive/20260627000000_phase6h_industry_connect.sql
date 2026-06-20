-- Phase 6H — Industry Connect & MOU Management
-- Track Memoranda of Understanding with industry/academic partners and the
-- activities run under them (NAAC Criterion 7.1). MOU expiry alerts keep
-- partnerships from silently lapsing.

create table if not exists public.mou_partners (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  partner_name     text not null,
  partner_type     text not null check (partner_type in ('industry','university','government','ngo','research_institute')),
  mou_date         date not null,
  validity_years   integer not null default 3 check (validity_years > 0),
  expiry_date      date not null,
  purpose          text not null,
  activities       jsonb not null default '[]'::jsonb,
  contact_person   text,
  contact_email    text,
  mou_document_url text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index if not exists idx_mou_inst on public.mou_partners(institution_id);
create index if not exists idx_mou_expiry on public.mou_partners(institution_id, expiry_date);

create table if not exists public.industry_interactions (
  id                 uuid primary key default gen_random_uuid(),
  institution_id     uuid not null references public.institutions(id) on delete cascade,
  mou_partner_id     uuid references public.mou_partners(id) on delete set null,
  interaction_type   text not null check (interaction_type in (
                       'internship','guest_lecture','workshop','project','training','placement_drive','other')),
  title              text not null,
  date               date not null,
  students_benefited integer check (students_benefited is null or students_benefited >= 0),
  description        text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_iint_inst on public.industry_interactions(institution_id);
create index if not exists idx_iint_partner on public.industry_interactions(mou_partner_id);

-- ── RLS (institution-admin managed; NAAC/governance records) ──────────────────

alter table public.mou_partners enable row level security;
alter table public.industry_interactions enable row level security;

drop policy if exists "mou: admins manage" on public.mou_partners;
create policy "mou: admins manage" on public.mou_partners for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "iint: admins manage" on public.industry_interactions;
create policy "iint: admins manage" on public.industry_interactions for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.mou_partners to authenticated;
grant select, insert, update, delete on public.industry_interactions to authenticated;

-- ── Storage bucket for MOU documents (public, matching the existing convention) ──
insert into storage.buckets (id, name, public) values ('mou-documents', 'mou-documents', true) on conflict (id) do nothing;

drop policy if exists "mou-documents: authenticated upload" on storage.objects;
create policy "mou-documents: authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'mou-documents');
drop policy if exists "mou-documents: public read" on storage.objects;
create policy "mou-documents: public read" on storage.objects for select using (bucket_id = 'mou-documents');
