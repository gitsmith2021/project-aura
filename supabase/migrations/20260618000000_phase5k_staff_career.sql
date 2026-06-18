-- Phase 5K — Staff Career Lifecycle Management
-- Audit trail of every career change a staff member goes through: joining,
-- confirmation, promotion, increment, transfer, resignation, retirement,
-- termination. Increments/promotions/transfers mutate the live staff record
-- (salary_structures / staff.designation / staff.department_id); resignation
-- and retirement deactivate the staff row. NAAC Criterion 2.4 evidence.

create table if not exists public.staff_career_events (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  staff_id         uuid not null references public.staff(id) on delete cascade,
  event_type       text not null check (event_type in (
                     'joining','confirmation','promotion','increment',
                     'transfer','resignation','retirement','termination','other')),
  effective_date   date not null,
  previous_value   text,
  new_value        text,
  order_number     text,
  document_url     text,
  remarks          text,
  recorded_by      uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_staff_career_inst  on public.staff_career_events(institution_id, effective_date);
create index if not exists idx_staff_career_staff on public.staff_career_events(staff_id, effective_date);

alter table public.staff_career_events enable row level security;

-- Staff read their own career history.
drop policy if exists "staff_career: staff read own" on public.staff_career_events;
create policy "staff_career: staff read own" on public.staff_career_events for select to authenticated
  using (staff_id in (select id from public.staff where profile_id = auth.uid()));

-- Admins (SUPER_ADMIN / INST_ADMIN, PRINCIPAL normalises to INST_ADMIN) manage all;
-- HODs manage career events for staff in their own department.
drop policy if exists "staff_career: admins manage" on public.staff_career_events;
create policy "staff_career: admins manage" on public.staff_career_events for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      join public.staff s on s.id = staff_career_events.staff_id
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
    )
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      join public.staff s on s.id = staff_career_events.staff_id
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
    )
  );

grant select, insert, update, delete on public.staff_career_events to authenticated;

-- ── Storage: staff-career-docs bucket (scanned order/letter uploads) ──────────
insert into storage.buckets (id, name, public)
values ('staff-career-docs', 'staff-career-docs', true)
on conflict (id) do nothing;

drop policy if exists "staff-career-docs: authenticated upload" on storage.objects;
create policy "staff-career-docs: authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'staff-career-docs');

drop policy if exists "staff-career-docs: public read" on storage.objects;
create policy "staff-career-docs: public read" on storage.objects for select to public
  using (bucket_id = 'staff-career-docs');
