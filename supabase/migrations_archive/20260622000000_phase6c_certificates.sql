-- Phase 6C — Certificate & Document Generator
-- Students request documents (bonafide, TC, etc.); admins approve and issue them.
-- Staff documents (offer/experience/relieving/salary/service letters) are
-- issued directly by admins. Each issued certificate gets a unique number and
-- is rendered from a printable template auto-filled with the holder's details.

create table if not exists public.certificate_requests (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  requester_type   text not null check (requester_type in ('student','staff')),
  student_id       uuid references public.students(id) on delete cascade,
  staff_id         uuid references public.staff(id) on delete cascade,
  certificate_type text not null check (certificate_type in (
                     -- student
                     'bonafide','transfer_certificate','character_certificate','noc','course_completion',
                     -- staff
                     'offer_letter','experience_certificate','relieving_letter','salary_certificate','service_certificate')),
  purpose          text,
  status           text not null default 'requested'
                   check (status in ('requested','approved','issued','rejected')),
  remarks          text,
  certificate_no   text,
  requested_by     uuid references auth.users(id) on delete set null,
  reviewed_by      uuid references auth.users(id) on delete set null,
  issued_at        timestamptz,
  created_at       timestamptz not null default now(),
  -- exactly one holder, matching the requester_type
  constraint cert_holder_matches_type check (
    (requester_type = 'student' and student_id is not null and staff_id is null)
    or (requester_type = 'staff' and staff_id is not null and student_id is null)
  )
);
create index if not exists idx_cert_inst on public.certificate_requests(institution_id);
create index if not exists idx_cert_student on public.certificate_requests(student_id);
create index if not exists idx_cert_staff on public.certificate_requests(staff_id);
create index if not exists idx_cert_status on public.certificate_requests(institution_id, status);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.certificate_requests enable row level security;

-- Admins manage every request in their institution (review, issue, reject, delete).
drop policy if exists "cert: admins manage" on public.certificate_requests;
create policy "cert: admins manage" on public.certificate_requests for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- A student reads their own requests.
drop policy if exists "cert: student reads own" on public.certificate_requests;
create policy "cert: student reads own" on public.certificate_requests for select to authenticated
  using (
    requester_type = 'student'
    and student_id in (select id from public.students where email = auth.email())
  );

-- A student raises a request for themselves (status forced to 'requested').
drop policy if exists "cert: student requests own" on public.certificate_requests;
create policy "cert: student requests own" on public.certificate_requests for insert to authenticated
  with check (
    requester_type = 'student'
    and status = 'requested'
    and student_id in (select id from public.students where email = auth.email())
  );

grant select, insert, update, delete on public.certificate_requests to authenticated;
