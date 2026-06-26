-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-2 — Data Explorer
--
-- An Institutional Intelligence Platform (Power BI / Salesforce Reports style),
-- NOT a SQL tool. Two tables:
--   • data_explorer_entities — the REGISTRY: which tables/views are explorable
--     and their columns. Product-registered (no Campus tables hardcoded in code).
--   • data_explorer_reports — Saved Views: a stored Query Model (JSON) per user.
--
-- Queries run as the signed-in user via PostgREST → read-only by nature,
-- RLS-respecting, tenant-isolated. See docs/AURA_CORE/CF2_DATA_EXPLORER.md.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Registry: explorable entities ─────────────────────────────────────────────
create table if not exists public.data_explorer_entities (
  key                text primary key,            -- e.g. 'students'
  label              text not null,               -- 'Students'
  category           text not null,               -- picker grouping
  source             text not null,               -- underlying table/view name
  columns            jsonb not null,              -- [{key,label,type,filterable,aggregatable,groupable}]
  default_date_field text,                         -- column for the date-range control
  is_active          boolean not null default true,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists ix_data_explorer_entities_category
  on public.data_explorer_entities (category, sort_order);

-- ── Saved Views: a stored Query Model per user/institution ────────────────────
create table if not exists public.data_explorer_reports (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  owner_id       uuid not null,                    -- auth.users id (creator)
  name           text not null,
  query_model    jsonb not null,
  is_favourite   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ix_data_explorer_reports_owner
  on public.data_explorer_reports (owner_id, institution_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.data_explorer_entities enable row level security;
alter table public.data_explorer_reports  enable row level security;

-- Entity registry: readable by any authenticated user (metadata only — the
-- actual data reads are still RLS-gated on each source table). Managed by SUPER_ADMIN.
drop policy if exists "explorer entities: read" on public.data_explorer_entities;
create policy "explorer entities: read" on public.data_explorer_entities
  for select to authenticated using (true);

drop policy if exists "explorer entities: super admin manage" on public.data_explorer_entities;
create policy "explorer entities: super admin manage" on public.data_explorer_entities
  for all to authenticated
  using (exists (select 1 from public.institution_members m
                 where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'))
  with check (exists (select 1 from public.institution_members m
                 where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'));

-- Saved views: a user manages their own; SUPER_ADMIN may see all. Scoped to the
-- owner so one admin's saved reports don't leak to another.
drop policy if exists "explorer reports: owner manage" on public.data_explorer_reports;
create policy "explorer reports: owner manage" on public.data_explorer_reports
  for all to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (select 1 from public.institution_members m
               where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN')
  )
  with check (
    owner_id = (select auth.uid())
    or exists (select 1 from public.institution_members m
               where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN')
  );

grant select, insert, update, delete on public.data_explorer_entities to authenticated;
grant select, insert, update, delete on public.data_explorer_reports to authenticated;

-- ── Seed a safe starter set of Campus entities ────────────────────────────────
-- Columns reference real source columns; data reads remain RLS-gated as the user.
insert into public.data_explorer_entities (key, label, category, source, columns, default_date_field, sort_order) values
  ('students', 'Students', 'People', 'students',
    '[{"key":"full_name","label":"Name","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"roll_no","label":"Roll No","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"student_program","label":"Program","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"student_year","label":"Year","type":"number","filterable":true,"groupable":true,"aggregatable":true},
      {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"is_active","label":"Active","type":"boolean","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"created_at","label":"Enrolled On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'created_at', 1),
  ('staff', 'Faculty & Staff', 'People', 'staff',
    '[{"key":"full_name","label":"Name","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"email","label":"Email","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"staff_type","label":"Staff Type","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"is_active","label":"Active","type":"boolean","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"created_at","label":"Joined On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'created_at', 2),
  ('admissions', 'Admissions', 'Admissions', 'admissions',
    '[{"key":"applicant_name","label":"Applicant","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"program_applied","label":"Program","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"marks_percentage","label":"Marks %","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"applied_at","label":"Applied On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'applied_at', 3),
  ('fee_payments', 'Fee Payments', 'Finance', 'fee_payments',
    '[{"key":"amount_paid","label":"Amount","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"payment_mode","label":"Mode","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"payment_status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"paid_at","label":"Paid On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'paid_at', 4),
  ('departments', 'Departments', 'Academics', 'departments',
    '[{"key":"name","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"funding_type","label":"Funding","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"created_at","label":"Created On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'created_at', 5)
on conflict (key) do nothing;
