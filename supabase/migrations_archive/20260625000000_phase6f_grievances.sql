-- Phase 6F — Grievance Redressal System (NAAC Criterion 6.2)
-- A formal, documented grievance mechanism. Students and staff raise grievances
-- (with an anonymous option for harassment/ragging cases); admins acknowledge,
-- assign, review and resolve them against an SLA deadline.
--
-- Confidentiality model: an anonymous grievance stores NO complainant identity
-- (`submitted_by` is NULL). A named complainant can track only their OWN cases.
-- Admins manage every case in their institution. Status-change notifications go
-- to the named complainant (anonymous cases have nobody to notify).

create table if not exists public.grievances (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  -- complainant auth id; NULL for anonymous grievances (identity protected).
  submitted_by     uuid references auth.users(id) on delete set null,
  complainant_type text not null check (complainant_type in ('student','staff','anonymous')),
  category         text not null check (category in (
                     'academic','financial','infrastructure','staff_conduct',
                     'harassment','ragging','other')),
  subject          text not null,
  description      text not null,
  evidence_url     jsonb,
  status           text not null default 'submitted'
                   check (status in ('submitted','acknowledged','under_review','resolved','escalated','closed')),
  assigned_to      uuid references public.staff(id) on delete set null,
  resolution_notes text,
  resolved_at      timestamptz,
  deadline         date,
  created_at       timestamptz not null default now(),
  -- an anonymous grievance must not carry a complainant id
  constraint grievance_anon_has_no_submitter check (
    complainant_type <> 'anonymous' or submitted_by is null
  )
);
create index if not exists idx_grievances_inst     on public.grievances(institution_id, status);
create index if not exists idx_grievances_category on public.grievances(institution_id, category);
create index if not exists idx_grievances_submitter on public.grievances(submitted_by);
create index if not exists idx_grievances_assigned on public.grievances(assigned_to);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.grievances enable row level security;

-- Read + manage: institution admins (PRINCIPAL normalises to INST_ADMIN) + super admins.
drop policy if exists "grievances: admins manage" on public.grievances;
create policy "grievances: admins manage" on public.grievances for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- Any authenticated member of the institution may file a NEW grievance. The
-- status guard stops a direct API call from self-acknowledging/resolving, and
-- the submitter guard stops spoofing another user's id (anonymous → NULL).
drop policy if exists "grievances: members file" on public.grievances;
create policy "grievances: members file" on public.grievances for insert to authenticated
  with check (
    status = 'submitted'
    and (submitted_by = auth.uid() or submitted_by is null)
    and institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

-- A named complainant reads ONLY their own grievances (to track status).
-- Anonymous grievances have submitted_by = NULL and are therefore untrackable.
drop policy if exists "grievances: complainant reads own" on public.grievances;
create policy "grievances: complainant reads own" on public.grievances for select to authenticated
  using (submitted_by is not null and submitted_by = auth.uid());

grant select, insert, update, delete on public.grievances to authenticated;
