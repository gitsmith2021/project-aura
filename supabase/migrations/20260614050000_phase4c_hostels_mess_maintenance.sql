-- Phase 4C (pass 2) — mess menu + billing, maintenance, announcements

create table if not exists public.mess_menu (
  id          uuid primary key default gen_random_uuid(),
  hostel_id   uuid not null references public.hostels(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_type   text not null check (meal_type in ('breakfast','lunch','snacks','dinner')),
  menu_items  jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (hostel_id, day_of_week, meal_type)
);

create table if not exists public.mess_billing (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  hostel_id      uuid not null references public.hostels(id) on delete cascade,
  month          text not null,
  plan_type      text not null check (plan_type in ('full','veg_only','non_veg','custom')),
  amount         numeric(8,2) not null,
  is_paid        boolean not null default false,
  paid_at        timestamptz,
  created_at     timestamptz not null default now(),
  unique (student_id, month)
);

create table if not exists public.hostel_maintenance_requests (
  id               uuid primary key default gen_random_uuid(),
  hostel_id        uuid not null references public.hostels(id) on delete cascade,
  room_id          uuid references public.hostel_rooms(id) on delete set null,
  raised_by        uuid not null references auth.users(id) on delete cascade,
  category         text not null check (category in ('electrical','plumbing','furniture','cleaning','ac_fan','pest_control','other')),
  description      text not null,
  photo_url        text,
  priority         text not null default 'normal' check (priority in ('urgent','normal','low')),
  status           text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  assigned_to      text,
  resolution_notes text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists public.hostel_announcements (
  id         uuid primary key default gen_random_uuid(),
  hostel_id  uuid not null references public.hostels(id) on delete cascade,
  title      text not null,
  body       text not null,
  posted_by  uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_mess_menu_hostel on public.mess_menu(hostel_id);
create index if not exists idx_mess_billing_hostel_month on public.mess_billing(hostel_id, month);
create index if not exists idx_mess_billing_student on public.mess_billing(student_id);
create index if not exists idx_hostel_maint_hostel_status on public.hostel_maintenance_requests(hostel_id, status);
create index if not exists idx_hostel_maint_raiser on public.hostel_maintenance_requests(raised_by);
create index if not exists idx_hostel_ann_hostel on public.hostel_announcements(hostel_id, created_at desc);

alter table public.mess_menu enable row level security;
alter table public.mess_billing enable row level security;
alter table public.hostel_maintenance_requests enable row level security;
alter table public.hostel_announcements enable row level security;

-- mess_menu: members read; admins manage
drop policy if exists "mess_menu: members read" on public.mess_menu;
create policy "mess_menu: members read" on public.mess_menu for select to authenticated
  using (hostel_id in (select h.id from public.hostels h where h.institution_id in (
    select institution_id from public.institution_members where profile_id = auth.uid()
    union select institution_id from public.staff where profile_id = auth.uid()
    union select institution_id from public.students where profile_id = auth.uid())));
drop policy if exists "mess_menu: admins manage" on public.mess_menu;
create policy "mess_menu: admins manage" on public.mess_menu for all to authenticated
  using (exists (select 1 from public.hostels h where h.id = mess_menu.hostel_id and (
    exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=h.institution_id and g.role='INST_ADMIN'))))
  with check (exists (select 1 from public.hostels h where h.id = mess_menu.hostel_id and (
    exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=h.institution_id and g.role='INST_ADMIN'))));

-- mess_billing: student reads own; admins manage
drop policy if exists "mess_billing: student reads own or admin" on public.mess_billing;
create policy "mess_billing: student reads own or admin" on public.mess_billing for select to authenticated
  using (student_id in (select id from public.students where profile_id = auth.uid())
    or exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=institution_id and g.role='INST_ADMIN'));
drop policy if exists "mess_billing: admins manage" on public.mess_billing;
create policy "mess_billing: admins manage" on public.mess_billing for all to authenticated
  using (exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=institution_id and g.role='INST_ADMIN'))
  with check (exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=institution_id and g.role='INST_ADMIN'));

-- maintenance: raiser reads own; admins read/manage; members raise own
drop policy if exists "hostel_maint: raiser or admin read" on public.hostel_maintenance_requests;
create policy "hostel_maint: raiser or admin read" on public.hostel_maintenance_requests for select to authenticated
  using (raised_by = auth.uid()
    or exists (select 1 from public.hostels h where h.id = hostel_maintenance_requests.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=h.institution_id and g.role='INST_ADMIN'))));
drop policy if exists "hostel_maint: member raises own" on public.hostel_maintenance_requests;
create policy "hostel_maint: member raises own" on public.hostel_maintenance_requests for insert to authenticated
  with check (raised_by = auth.uid());
drop policy if exists "hostel_maint: admins update" on public.hostel_maintenance_requests;
create policy "hostel_maint: admins update" on public.hostel_maintenance_requests for update to authenticated
  using (exists (select 1 from public.hostels h where h.id = hostel_maintenance_requests.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=h.institution_id and g.role='INST_ADMIN'))))
  with check (exists (select 1 from public.hostels h where h.id = hostel_maintenance_requests.hostel_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=h.institution_id and g.role='INST_ADMIN'))));

-- announcements: members read; admins manage
drop policy if exists "hostel_ann: members read" on public.hostel_announcements;
create policy "hostel_ann: members read" on public.hostel_announcements for select to authenticated
  using (hostel_id in (select h.id from public.hostels h where h.institution_id in (
    select institution_id from public.institution_members where profile_id = auth.uid()
    union select institution_id from public.staff where profile_id = auth.uid()
    union select institution_id from public.students where profile_id = auth.uid())));
drop policy if exists "hostel_ann: admins manage" on public.hostel_announcements;
create policy "hostel_ann: admins manage" on public.hostel_announcements for all to authenticated
  using (exists (select 1 from public.hostels h where h.id = hostel_announcements.hostel_id and (
    exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=h.institution_id and g.role='INST_ADMIN'))))
  with check (exists (select 1 from public.hostels h where h.id = hostel_announcements.hostel_id and (
    exists (select 1 from private.get_user_authorizations() g where g.role='SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id=h.institution_id and g.role='INST_ADMIN'))));

grant select, insert, update, delete on public.mess_menu to authenticated;
grant select, insert, update, delete on public.mess_billing to authenticated;
grant select, insert, update, delete on public.hostel_maintenance_requests to authenticated;
grant select, insert, update, delete on public.hostel_announcements to authenticated;
