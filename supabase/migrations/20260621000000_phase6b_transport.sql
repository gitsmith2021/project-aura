-- Phase 6B — Transport Management
-- Fleet of vehicles → bus routes (with ordered stops) → per-student allocations.
-- Admins manage everything; a student reads only their own allocation and the
-- route/vehicle it points at (so the student portal can show "my bus route").

create table if not exists public.vehicles (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  vehicle_number   text not null,
  vehicle_type     text not null default 'bus' check (vehicle_type in ('bus','van','mini_bus')),
  capacity         integer not null default 40 check (capacity > 0),
  driver_name      text not null,
  driver_phone     text not null,
  driver_license   text,
  insurance_expiry date,
  fitness_expiry   date,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (institution_id, vehicle_number)
);
create index if not exists idx_vehicles_inst on public.vehicles(institution_id);

create table if not exists public.bus_routes (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  vehicle_id      uuid references public.vehicles(id) on delete set null,
  route_name      text not null,
  stops           jsonb not null default '[]'::jsonb,   -- [{ name, pickup_time, lat, lng }]
  morning_start   time,
  evening_start   time,
  created_at      timestamptz not null default now()
);
create index if not exists idx_bus_routes_inst on public.bus_routes(institution_id);
create index if not exists idx_bus_routes_vehicle on public.bus_routes(vehicle_id);

create table if not exists public.transport_allocations (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  bus_route_id     uuid not null references public.bus_routes(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  boarding_stop    text not null,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (student_id, academic_year_id)
);
create index if not exists idx_talloc_route on public.transport_allocations(bus_route_id);
create index if not exists idx_talloc_student on public.transport_allocations(student_id);
create index if not exists idx_talloc_inst on public.transport_allocations(institution_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.vehicles enable row level security;
alter table public.bus_routes enable row level security;
alter table public.transport_allocations enable row level security;

-- Helper predicate (inlined): SUPER_ADMIN or the INST_ADMIN of the row's institution.
-- vehicles ──────────────────────────────────────────────────────────────────
drop policy if exists "vehicles: admins manage" on public.vehicles;
create policy "vehicles: admins manage" on public.vehicles for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- A student may read the vehicle assigned to a route they are allocated to.
drop policy if exists "vehicles: allocated student reads" on public.vehicles;
create policy "vehicles: allocated student reads" on public.vehicles for select to authenticated
  using (
    exists (
      select 1
      from public.bus_routes br
      join public.transport_allocations ta on ta.bus_route_id = br.id
      join public.students s on s.id = ta.student_id
      where br.vehicle_id = vehicles.id and s.email = auth.email()
    )
  );

-- bus_routes ────────────────────────────────────────────────────────────────
drop policy if exists "bus_routes: admins manage" on public.bus_routes;
create policy "bus_routes: admins manage" on public.bus_routes for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- A student may read the route they are allocated to.
drop policy if exists "bus_routes: allocated student reads" on public.bus_routes;
create policy "bus_routes: allocated student reads" on public.bus_routes for select to authenticated
  using (
    exists (
      select 1
      from public.transport_allocations ta
      join public.students s on s.id = ta.student_id
      where ta.bus_route_id = bus_routes.id and s.email = auth.email()
    )
  );

-- transport_allocations ───────────────────────────────────────────────────────
drop policy if exists "talloc: admins manage" on public.transport_allocations;
create policy "talloc: admins manage" on public.transport_allocations for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- A student may read their own allocation.
drop policy if exists "talloc: student reads own" on public.transport_allocations;
create policy "talloc: student reads own" on public.transport_allocations for select to authenticated
  using (
    exists (select 1 from public.students s where s.id = student_id and s.email = auth.email())
  );

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.bus_routes to authenticated;
grant select, insert, update, delete on public.transport_allocations to authenticated;

-- Allow a 'transport' fee category so bus fees can be raised as fee structures.
alter table public.fee_structures drop constraint if exists fee_structures_fee_type_check;
alter table public.fee_structures add constraint fee_structures_fee_type_check
  check (fee_type in ('tuition','hostel','exam','library','lab','transport','other'));
