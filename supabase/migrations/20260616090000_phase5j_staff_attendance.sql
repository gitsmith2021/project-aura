-- Phase 5J — Staff Daily Attendance & LOP Tracking (payroll accuracy · NAAC 2.4)
-- Per-staff daily campus attendance. Absent days without approved leave become LOP
-- (Loss of Pay) in the monthly payroll run; approved leave auto-marks 'on_leave'.

create table if not exists public.staff_attendance (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  staff_id       uuid not null references public.staff(id) on delete cascade,
  date           date not null,
  check_in_time  time,
  check_out_time time,
  status         text not null default 'present'
                 check (status in ('present','absent','half_day','late','on_duty','on_leave','holiday')),
  late_reason    text,
  remarks        text,
  logged_by      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (staff_id, date)
);
create index if not exists idx_staff_att_inst  on public.staff_attendance(institution_id, date);
create index if not exists idx_staff_att_staff on public.staff_attendance(staff_id, date);

alter table public.staff_attendance enable row level security;

-- Staff read their own attendance.
drop policy if exists "staff_att: staff read own" on public.staff_attendance;
create policy "staff_att: staff read own" on public.staff_attendance for select to authenticated
  using (staff_id in (select id from public.staff where profile_id = auth.uid()));

-- Admins (SUPER_ADMIN / INST_ADMIN, PRINCIPAL normalises to INST_ADMIN) manage all;
-- HODs manage attendance for staff in their own department.
drop policy if exists "staff_att: admins manage" on public.staff_attendance;
create policy "staff_att: admins manage" on public.staff_attendance for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      join public.staff s on s.id = staff_attendance.staff_id
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
    )
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      join public.staff s on s.id = staff_attendance.staff_id
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
    )
  );

grant select, insert, update, delete on public.staff_attendance to authenticated;
