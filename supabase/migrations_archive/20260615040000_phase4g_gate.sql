-- Phase 4G — Gate Pass & Visitor Management
-- Visitor logbook (check-in/out) + student outpass workflow
-- (apply → warden/admin approval → security check-out → check-in on return).

create table if not exists public.visitor_log (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  visitor_name    text not null,
  visitor_phone   text,
  id_proof_type   text,           -- Aadhaar, PAN, Driving License, …
  id_proof_number text,
  purpose         text not null,
  meeting_with    uuid references auth.users(id) on delete set null,
  vehicle_number  text,
  check_in_time   timestamptz not null default now(),
  check_out_time  timestamptz,
  status          text not null default 'checked_in' check (status in ('checked_in','checked_out')),
  created_at      timestamptz not null default now()
);

create table if not exists public.student_outpasses (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  hostel_id       uuid references public.hostels(id) on delete set null,
  reason          text not null,
  destination     text not null,
  out_time        timestamptz not null,
  expected_return timestamptz not null,
  actual_return   timestamptz,
  approved_by     uuid references public.staff(id) on delete set null,
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','returned','overdue')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_visitor_log_inst   on public.visitor_log(institution_id, status);
create index if not exists idx_outpass_inst        on public.student_outpasses(institution_id, status);
create index if not exists idx_outpass_student     on public.student_outpasses(student_id);
create index if not exists idx_outpass_hostel      on public.student_outpasses(hostel_id);

alter table public.visitor_log       enable row level security;
alter table public.student_outpasses enable row level security;

-- ════ visitor_log: members read; admins manage ═══════════════════════════════
drop policy if exists "visitor_log: members read" on public.visitor_log;
create policy "visitor_log: members read" on public.visitor_log for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
    )
  );
drop policy if exists "visitor_log: admins manage" on public.visitor_log;
create policy "visitor_log: admins manage" on public.visitor_log for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- ════ student_outpasses ═══════════════════════════════════════════════════════
-- read: the student themselves · the warden of the linked hostel · admins
drop policy if exists "outpass: read own/warden/admin" on public.student_outpasses;
create policy "outpass: read own/warden/admin" on public.student_outpasses for select to authenticated
  using (
    student_id in (select id from public.students where profile_id = auth.uid())
    or exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from public.hostels h join public.staff st on st.id = h.warden_id
      where h.id = student_outpasses.hostel_id and st.profile_id = auth.uid()
    )
  );

-- apply: a student creates a pending outpass for themselves
drop policy if exists "outpass: student applies" on public.student_outpasses;
create policy "outpass: student applies" on public.student_outpasses for insert to authenticated
  with check (
    student_id in (select id from public.students where profile_id = auth.uid())
  );

-- manage (approve/reject/return): warden of the hostel or admin
drop policy if exists "outpass: warden/admin manage" on public.student_outpasses;
create policy "outpass: warden/admin manage" on public.student_outpasses for update to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from public.hostels h join public.staff st on st.id = h.warden_id
      where h.id = student_outpasses.hostel_id and st.profile_id = auth.uid()
    )
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from public.hostels h join public.staff st on st.id = h.warden_id
      where h.id = student_outpasses.hostel_id and st.profile_id = auth.uid()
    )
  );

drop policy if exists "outpass: admin delete" on public.student_outpasses;
create policy "outpass: admin delete" on public.student_outpasses for delete to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.visitor_log       to authenticated;
grant select, insert, update, delete on public.student_outpasses to authenticated;
