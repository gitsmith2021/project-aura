-- Phase 7E — SaaS Subscription & Billing
-- Subscription plans (catalog), one subscription per institution, and the
-- invoice ledger. Razorpay *recurring* auto-charge is intentionally deferred:
-- the razorpay_sub_id / razorpay_payment_id columns are the integration point,
-- but for now plans are assigned and invoices marked paid manually by the
-- platform operator (SUPER_ADMIN).

create table if not exists public.subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  price_monthly numeric(10,2) not null check (price_monthly >= 0),
  price_annual  numeric(10,2) check (price_annual is null or price_annual >= 0),
  max_students  integer,   -- null = unlimited
  max_staff     integer,   -- null = unlimited
  features      jsonb not null default '[]'::jsonb,  -- enabled module keys
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.institution_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade unique,
  plan_id         uuid not null references public.subscription_plans(id),
  billing_cycle   text not null default 'monthly' check (billing_cycle in ('monthly','annual')),
  started_at      timestamptz not null default now(),
  expires_at      timestamptz,
  status          text not null default 'trial' check (status in ('active','trial','expired','cancelled')),
  razorpay_sub_id text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_inst_sub_plan on public.institution_subscriptions(plan_id);

create table if not exists public.subscription_invoices (
  id                  uuid primary key default gen_random_uuid(),
  institution_id      uuid not null references public.institutions(id) on delete cascade,
  invoice_number      text not null,
  amount              numeric(10,2) not null check (amount >= 0),
  currency            text not null default 'INR',
  period_start        date not null,
  period_end          date not null,
  status              text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  razorpay_payment_id text,
  invoice_pdf_url     text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_sub_inv_inst on public.subscription_invoices(institution_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.subscription_plans enable row level security;
alter table public.institution_subscriptions enable row level security;
alter table public.subscription_invoices enable row level security;

-- Plans: any signed-in user may read the catalog; only SUPER_ADMIN manages it.
drop policy if exists "plans: read" on public.subscription_plans;
create policy "plans: read" on public.subscription_plans for select to authenticated using (true);

drop policy if exists "plans: super admin manage" on public.subscription_plans;
create policy "plans: super admin manage" on public.subscription_plans for all to authenticated
  using (exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN'))
  with check (exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN'));

-- Subscriptions: SUPER_ADMIN manages all; an institution admin reads their own.
drop policy if exists "subs: super admin manage" on public.institution_subscriptions;
create policy "subs: super admin manage" on public.institution_subscriptions for all to authenticated
  using (exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN'))
  with check (exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN'));

drop policy if exists "subs: institution admin reads own" on public.institution_subscriptions;
create policy "subs: institution admin reads own" on public.institution_subscriptions for select to authenticated
  using (exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN'));

-- Invoices: SUPER_ADMIN manages all; an institution admin reads their own.
drop policy if exists "invoices: super admin manage" on public.subscription_invoices;
create policy "invoices: super admin manage" on public.subscription_invoices for all to authenticated
  using (exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN'))
  with check (exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN'));

drop policy if exists "invoices: institution admin reads own" on public.subscription_invoices;
create policy "invoices: institution admin reads own" on public.subscription_invoices for select to authenticated
  using (exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN'));

grant select, insert, update, delete on public.subscription_plans to authenticated;
grant select, insert, update, delete on public.institution_subscriptions to authenticated;
grant select, insert, update, delete on public.subscription_invoices to authenticated;

-- ── Seed default plans (global catalog) ───────────────────────────────────────
insert into public.subscription_plans (name, price_monthly, price_annual, max_students, max_staff, features, sort_order)
values
  ('Starter', 4999, 49990, 500, 50,
    '["core","parent_portal","certificates","feedback","grievances"]'::jsonb, 1),
  ('Pro', 9999, 99990, 2000, 200,
    '["core","parent_portal","certificates","feedback","grievances","transport","online_exams","lms","industry_connect"]'::jsonb, 2),
  ('Enterprise', 19999, 199990, null, null,
    '["core","parent_portal","certificates","feedback","grievances","transport","online_exams","lms","industry_connect","cctv"]'::jsonb, 3)
on conflict (name) do nothing;
