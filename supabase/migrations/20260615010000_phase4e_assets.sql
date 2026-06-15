-- Phase 4E — Asset & Inventory Management
-- Physical assets, machinery, lab equipment, consumables (chemicals/glassware),
-- with allocations to departments/labs/staff and maintenance cost logs.

create table if not exists public.asset_categories (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name           text not null,
  is_consumable  boolean not null default false,   -- consumables (chemicals/glassware) vs fixed assets
  created_at     timestamptz not null default now()
);

create table if not exists public.assets (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  category_id      uuid not null references public.asset_categories(id) on delete cascade,
  name             text not null,
  brand_model      text,
  serial_number    text,
  purchase_date    date,
  purchase_cost    numeric(10,2),
  status           text not null default 'active'
                   check (status in ('active','maintenance','disposed','low_stock')),
  location_details text,
  current_stock    integer not null default 1,     -- units on hand / available
  unit             text not null default 'pcs',    -- pcs, ml, grams, boxes, …
  reorder_level    integer,
  created_at       timestamptz not null default now()
);

create table if not exists public.asset_allocations (
  id                uuid primary key default gen_random_uuid(),
  asset_id          uuid not null references public.assets(id) on delete cascade,
  allocated_to_type text not null check (allocated_to_type in ('department','laboratory','staff')),
  department_id     uuid references public.departments(id) on delete set null,
  laboratory_id     uuid references public.laboratories(id) on delete set null,
  staff_id          uuid references public.staff(id) on delete set null,
  allocated_qty     integer not null default 1,
  allocated_date    date not null default current_date,
  returned_qty      integer default 0,
  returned_date     date,
  status            text not null default 'allocated' check (status in ('allocated','returned','consumed')),
  created_at        timestamptz not null default now()
);

create table if not exists public.asset_maintenance_logs (
  id          uuid primary key default gen_random_uuid(),
  asset_id    uuid not null references public.assets(id) on delete cascade,
  log_date    date not null default current_date,
  description text not null,
  cost        numeric(8,2) default 0,
  logged_by   uuid references public.staff(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_asset_categories_inst on public.asset_categories(institution_id);
create index if not exists idx_assets_inst          on public.assets(institution_id);
create index if not exists idx_assets_category      on public.assets(category_id);
create index if not exists idx_asset_alloc_asset    on public.asset_allocations(asset_id);
create index if not exists idx_asset_alloc_lab      on public.asset_allocations(laboratory_id);
create index if not exists idx_asset_alloc_dept     on public.asset_allocations(department_id);
create index if not exists idx_asset_maint_asset    on public.asset_maintenance_logs(asset_id);

alter table public.asset_categories      enable row level security;
alter table public.assets                enable row level security;
alter table public.asset_allocations     enable row level security;
alter table public.asset_maintenance_logs enable row level security;

-- ════ asset_categories ════════════════════════════════════════════════════════
drop policy if exists "asset_categories: members read" on public.asset_categories;
create policy "asset_categories: members read" on public.asset_categories for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );
drop policy if exists "asset_categories: admins manage" on public.asset_categories;
create policy "asset_categories: admins manage" on public.asset_categories for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- ════ assets ══════════════════════════════════════════════════════════════════
drop policy if exists "assets: members read" on public.assets;
create policy "assets: members read" on public.assets for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );
drop policy if exists "assets: admins manage" on public.assets;
create policy "assets: admins manage" on public.assets for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- ════ asset_allocations (scoped via parent asset's institution) ═══════════════
drop policy if exists "asset_alloc: members read" on public.asset_allocations;
create policy "asset_alloc: members read" on public.asset_allocations for select to authenticated
  using (
    asset_id in (
      select a.id from public.assets a where a.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );
drop policy if exists "asset_alloc: admins manage" on public.asset_allocations;
create policy "asset_alloc: admins manage" on public.asset_allocations for all to authenticated
  using (
    exists (select 1 from public.assets a where a.id = asset_allocations.asset_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')
    ))
  )
  with check (
    exists (select 1 from public.assets a where a.id = asset_allocations.asset_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')
    ))
  );

-- ════ asset_maintenance_logs (scoped via parent asset's institution) ══════════
drop policy if exists "asset_maint: members read" on public.asset_maintenance_logs;
create policy "asset_maint: members read" on public.asset_maintenance_logs for select to authenticated
  using (
    asset_id in (
      select a.id from public.assets a where a.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );
drop policy if exists "asset_maint: admins manage" on public.asset_maintenance_logs;
create policy "asset_maint: admins manage" on public.asset_maintenance_logs for all to authenticated
  using (
    exists (select 1 from public.assets a where a.id = asset_maintenance_logs.asset_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')
    ))
  )
  with check (
    exists (select 1 from public.assets a where a.id = asset_maintenance_logs.asset_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')
    ))
  );

grant select, insert, update, delete on public.asset_categories       to authenticated;
grant select, insert, update, delete on public.assets                 to authenticated;
grant select, insert, update, delete on public.asset_allocations      to authenticated;
grant select, insert, update, delete on public.asset_maintenance_logs to authenticated;
