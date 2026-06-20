-- Phase 5E — Staff Appraisal & NAAC Workload Reports
-- Annual self-appraisal (staff log teaching/research/FDP activities) → HOD/Principal
-- reviews and assigns scores. Workload reports are computed from class_schedules +
-- attendance at query time (no extra table).

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.staff_appraisals (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  staff_id         uuid not null references public.staff(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  appraisal_period text not null,                  -- e.g. "2025-2026 Annual"
  teaching_score   numeric(4,2),                   -- out of 100
  research_score   numeric(4,2),
  admin_score      numeric(4,2),
  overall_score    numeric(4,2),
  self_remarks     text,                            -- staff's own summary
  feedback         text,                            -- reviewer feedback
  appraised_by     uuid references public.staff(id) on delete set null,
  status           text not null default 'pending'
                   check (status in ('pending','submitted','reviewed','completed')),
  submitted_at     timestamptz,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (staff_id, appraisal_period)
);

create index if not exists idx_appraisals_inst   on public.staff_appraisals(institution_id, appraisal_period);
create index if not exists idx_appraisals_staff   on public.staff_appraisals(staff_id);

create table if not exists public.staff_appraisal_activities (
  id               uuid primary key default gen_random_uuid(),
  appraisal_id     uuid not null references public.staff_appraisals(id) on delete cascade,
  activity_type    text not null check (activity_type in (
                     'paper_published','conference','fdp','workshop',
                     'award','project','patent','other')),
  title            text not null,
  description      text,
  date_of_activity date,
  document_url     text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_appraisal_activities on public.staff_appraisal_activities(appraisal_id);

-- ── RLS: staff_appraisals ─────────────────────────────────────────────────────

alter table public.staff_appraisals enable row level security;

-- Staff see their own appraisals.
drop policy if exists "appraisals: staff read own" on public.staff_appraisals;
create policy "appraisals: staff read own" on public.staff_appraisals for select to authenticated
  using (staff_id in (select id from public.staff where profile_id = auth.uid()));

-- Staff update their own self-assessment (field-level restriction enforced in the
-- submitAppraisal action; RLS guards the row + locks editing once reviewed/completed).
drop policy if exists "appraisals: staff self update" on public.staff_appraisals;
create policy "appraisals: staff self update" on public.staff_appraisals for update to authenticated
  using (staff_id in (select id from public.staff where profile_id = auth.uid()) and status in ('pending','submitted'))
  with check (staff_id in (select id from public.staff where profile_id = auth.uid()));

-- Admins (SUPER_ADMIN / INST_ADMIN, PRINCIPAL normalises to INST_ADMIN) manage all
-- of their institution's appraisals; HODs manage appraisals for staff in their dept.
drop policy if exists "appraisals: admins manage" on public.staff_appraisals;
create policy "appraisals: admins manage" on public.staff_appraisals for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      join public.staff s on s.id = staff_appraisals.staff_id
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
    )
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      join public.staff s on s.id = staff_appraisals.staff_id
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
    )
  );

-- ── RLS: staff_appraisal_activities ───────────────────────────────────────────

alter table public.staff_appraisal_activities enable row level security;

-- Read: whoever can read the parent appraisal.
drop policy if exists "appraisal_activities: read" on public.staff_appraisal_activities;
create policy "appraisal_activities: read" on public.staff_appraisal_activities for select to authenticated
  using (exists (select 1 from public.staff_appraisals a where a.id = appraisal_id));

-- Staff manage activities on their own appraisal while it is still editable.
drop policy if exists "appraisal_activities: staff manage" on public.staff_appraisal_activities;
create policy "appraisal_activities: staff manage" on public.staff_appraisal_activities for all to authenticated
  using (
    exists (
      select 1 from public.staff_appraisals a
      where a.id = appraisal_id
        and a.staff_id in (select id from public.staff where profile_id = auth.uid())
        and a.status in ('pending','submitted')
    )
  )
  with check (
    exists (
      select 1 from public.staff_appraisals a
      where a.id = appraisal_id
        and a.staff_id in (select id from public.staff where profile_id = auth.uid())
        and a.status in ('pending','submitted')
    )
  );

-- Admins / HODs manage activities for appraisals they can manage. The WITH CHECK
-- mirrors USING so an INSERT can't be aimed at an appraisal outside the caller's scope.
drop policy if exists "appraisal_activities: admins manage" on public.staff_appraisal_activities;
create policy "appraisal_activities: admins manage" on public.staff_appraisal_activities for all to authenticated
  using (
    exists (
      select 1 from public.staff_appraisals a
      where a.id = appraisal_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')
        or exists (
          select 1 from private.get_user_authorizations() g
          join public.staff s on s.id = a.staff_id
          where g.tenant_id = a.institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.staff_appraisals a
      where a.id = appraisal_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')
        or exists (
          select 1 from private.get_user_authorizations() g
          join public.staff s on s.id = a.staff_id
          where g.tenant_id = a.institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = s.department_id
        )
      )
    )
  );

grant select, insert, update, delete on public.staff_appraisals to authenticated;
grant select, insert, update, delete on public.staff_appraisal_activities to authenticated;

-- ── Storage: appraisal-docs bucket (activity proof uploads) ───────────────────
insert into storage.buckets (id, name, public)
values ('appraisal-docs', 'appraisal-docs', true)
on conflict (id) do nothing;

drop policy if exists "appraisal-docs: authenticated upload" on storage.objects;
create policy "appraisal-docs: authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'appraisal-docs');

drop policy if exists "appraisal-docs: public read" on storage.objects;
create policy "appraisal-docs: public read" on storage.objects for select to public
  using (bucket_id = 'appraisal-docs');
