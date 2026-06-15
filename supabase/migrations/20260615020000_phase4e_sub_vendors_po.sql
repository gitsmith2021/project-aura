-- Phase 4E-sub — Vendor & Purchase Order Management
-- Vendor registry + PO approval workflow (draft → submitted → approved →
-- received → paid). GST-ready line items; received goods can auto-populate the
-- Phase 4E asset registry. Budget actuals (Step 5L) deferred until that exists.
--
-- GST invoice PDFs upload to a Supabase Storage bucket named `purchase-invoices`
-- (create manually: Storage → New Bucket → name "purchase-invoices", Public: true —
-- matches the existing `receipts` bucket convention). invoice_url stores the URL.

create table if not exists public.vendors (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name           text not null,
  gst_number     text,
  category       text not null check (category in (
                   'lab_equipment','stationery','furniture',
                   'it_hardware','software','maintenance','other')),
  contact_person text,
  phone          text,
  email          text,
  address        text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  department_id  uuid references public.departments(id) on delete set null,
  vendor_id      uuid not null references public.vendors(id) on delete restrict,
  po_number      text not null,                 -- auto-generated: PO-YYYY-NNNN
  items          jsonb not null,                -- [{ name, qty, unit, unit_price, total }]
  total_amount   numeric(12,2) not null,
  status         text not null default 'draft'
                 check (status in ('draft','submitted','approved','received','paid','cancelled')),
  raised_by      uuid references public.staff(id) on delete set null,
  approved_by    uuid references auth.users(id) on delete set null,
  invoice_url    text,
  received_at    timestamptz,
  paid_at        timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  unique(institution_id, po_number)
);

create index if not exists idx_vendors_inst       on public.vendors(institution_id);
create index if not exists idx_po_inst            on public.purchase_orders(institution_id);
create index if not exists idx_po_vendor          on public.purchase_orders(vendor_id);
create index if not exists idx_po_status          on public.purchase_orders(institution_id, status);

alter table public.vendors          enable row level security;
alter table public.purchase_orders  enable row level security;

-- ════ vendors ════════════════════════════════════════════════════════════════
drop policy if exists "vendors: members read" on public.vendors;
create policy "vendors: members read" on public.vendors for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
    )
  );
drop policy if exists "vendors: admins manage" on public.vendors;
create policy "vendors: admins manage" on public.vendors for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- ════ purchase_orders ═════════════════════════════════════════════════════════
drop policy if exists "purchase_orders: members read" on public.purchase_orders;
create policy "purchase_orders: members read" on public.purchase_orders for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
    )
  );
drop policy if exists "purchase_orders: admins manage" on public.purchase_orders;
create policy "purchase_orders: admins manage" on public.purchase_orders for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.vendors         to authenticated;
grant select, insert, update, delete on public.purchase_orders to authenticated;
