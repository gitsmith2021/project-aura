-- Phase 5A-sub — Admissions CRM (pre-application enquiries)
-- A lead-capture layer that sits ahead of the formal admissions form (Phase 5A).
-- Prospective students enquire months before applying; admins nurture the lead
-- through the funnel (new → contacted → interested → applied) and may convert an
-- enquiry into a formal application in the `admissions` table.

create table if not exists public.admission_enquiries (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  name             text not null,
  phone            text not null,
  email            text,
  program_interest text not null check (program_interest in ('UG','PG','Diploma','Certificate')),
  department_id    uuid references public.departments(id) on delete set null,
  source           text not null default 'website'
                   check (source in ('website','walk_in','phone','referral','social_media','fair','other')),
  enquiry_date     date not null default current_date,
  follow_up_date   date,
  status           text not null default 'new'
                   check (status in ('new','contacted','interested','applied','not_interested','lost')),
  notes            text,
  -- set once an enquiry is converted into a formal application (Phase 5A)
  converted_admission_id uuid references public.admissions(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_enquiries_inst       on public.admission_enquiries(institution_id, status);
create index if not exists idx_enquiries_followup    on public.admission_enquiries(institution_id, follow_up_date);

alter table public.admission_enquiries enable row level security;

-- Admins read + manage their institution's enquiries (mirrors admissions RLS).
drop policy if exists "admission_enquiries: admins read" on public.admission_enquiries;
create policy "admission_enquiries: admins read" on public.admission_enquiries for select to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "admission_enquiries: admins manage" on public.admission_enquiries;
create policy "admission_enquiries: admins manage" on public.admission_enquiries for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.admission_enquiries to authenticated;
