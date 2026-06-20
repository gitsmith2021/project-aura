-- Phase 5H — Disciplinary Records & Anti-Ragging (UGC anti-ragging · NAAC 6.2)
-- Sensitive records: institution members may file a report (incl. anonymous), but
-- only admins can read/manage incidents and record committee actions.

-- ── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.disciplinary_incidents (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  -- reporter auth id; NULL for anonymous reports (complainant identity protected).
  reported_by       uuid references auth.users(id) on delete set null,
  -- the student the incident concerns; NULL when unknown / anonymous.
  student_id        uuid references public.students(id) on delete set null,
  incident_type     text not null check (incident_type in (
                      'misconduct','ragging','attendance_violation',
                      'exam_malpractice','property_damage','other')),
  incident_date     date not null,
  location          text,
  description       text not null,
  is_anonymous      boolean not null default false,
  status            text not null default 'reported'
                    check (status in ('reported','under_review','resolved','escalated')),
  committee_remarks text,
  action_taken      text,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists idx_disc_inc_inst    on public.disciplinary_incidents(institution_id, status);
create index if not exists idx_disc_inc_type    on public.disciplinary_incidents(institution_id, incident_type);
create index if not exists idx_disc_inc_student on public.disciplinary_incidents(student_id);

create table if not exists public.disciplinary_actions (
  id             uuid primary key default gen_random_uuid(),
  incident_id    uuid not null references public.disciplinary_incidents(id) on delete cascade,
  action_type    text not null check (action_type in (
                   'verbal_warning','written_warning','suspension',
                   'fine','expulsion','counseling','other')),
  effective_date date not null,
  duration_days  integer,
  fine_amount    numeric(8,2),
  remarks        text,
  issued_by      uuid references public.staff(id) on delete set null,
  document_url   text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_disc_actions on public.disciplinary_actions(incident_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.disciplinary_incidents enable row level security;
alter table public.disciplinary_actions enable row level security;

-- Report: any authenticated member of the institution may file a NEW report.
-- The status guard stops a direct API call from self-resolving/escalating.
drop policy if exists "disc_inc: members report" on public.disciplinary_incidents;
create policy "disc_inc: members report" on public.disciplinary_incidents for insert to authenticated
  with check (
    status = 'reported'
    and institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

-- Read + manage: institution admins (PRINCIPAL normalises to INST_ADMIN) + super admins only.
drop policy if exists "disc_inc: admins read" on public.disciplinary_incidents;
create policy "disc_inc: admins read" on public.disciplinary_incidents for select to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "disc_inc: admins manage" on public.disciplinary_incidents;
create policy "disc_inc: admins manage" on public.disciplinary_incidents for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- Actions: admins only (read + manage), scoped via the parent incident's institution.
drop policy if exists "disc_act: admins manage" on public.disciplinary_actions;
create policy "disc_act: admins manage" on public.disciplinary_actions for all to authenticated
  using (
    exists (
      select 1 from public.disciplinary_incidents i
      where i.id = incident_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = i.institution_id and g.role = 'INST_ADMIN')
      )
    )
  )
  with check (
    exists (
      select 1 from public.disciplinary_incidents i
      where i.id = incident_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = i.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

-- Insert is granted to authenticated (members report); select/update/delete are
-- gated to admins by the policies above.
grant insert, select, update, delete on public.disciplinary_incidents to authenticated;
grant select, insert, update, delete on public.disciplinary_actions to authenticated;
