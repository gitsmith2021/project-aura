-- Phase 4F — Smart ID Card & NFC Card Registry
-- Issues / links / replaces / deactivates NFC cards for students and staff.
-- The NFC attendance webhook rejects cards whose status is not 'active'.

create table if not exists public.smart_cards (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  card_uid       text not null unique,                 -- NFC chip UID (hex string)
  holder_type    text not null check (holder_type in ('student','staff')),
  student_id     uuid references public.students(id) on delete set null,
  staff_id       uuid references public.staff(id) on delete set null,
  issued_date    date not null default current_date,
  status         text not null default 'active'
                 check (status in ('active','lost','deactivated','replaced')),
  replaced_by    uuid references public.smart_cards(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  -- exactly one holder reference, matching holder_type
  constraint smart_cards_holder_chk check (
    (holder_type = 'student' and student_id is not null and staff_id is null) or
    (holder_type = 'staff'   and staff_id   is not null and student_id is null)
  )
);

create index if not exists idx_smart_cards_inst    on public.smart_cards(institution_id);
create index if not exists idx_smart_cards_uid     on public.smart_cards(card_uid);
create index if not exists idx_smart_cards_student on public.smart_cards(student_id);
create index if not exists idx_smart_cards_staff   on public.smart_cards(staff_id);
-- at most one ACTIVE card per holder
create unique index if not exists uq_smart_cards_active_student
  on public.smart_cards(student_id) where status = 'active' and student_id is not null;
create unique index if not exists uq_smart_cards_active_staff
  on public.smart_cards(staff_id) where status = 'active' and staff_id is not null;

alter table public.smart_cards enable row level security;

drop policy if exists "smart_cards: members read" on public.smart_cards;
create policy "smart_cards: members read" on public.smart_cards for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

drop policy if exists "smart_cards: admins manage" on public.smart_cards;
create policy "smart_cards: admins manage" on public.smart_cards for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.smart_cards to authenticated;
