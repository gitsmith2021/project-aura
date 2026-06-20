-- Phase 7F — IQAC Meeting & Action Tracker (NAAC Criterion 6.1)
-- Documents IQAC meetings (min. 2/year) with agendas, minutes and the
-- action-taken items that follow. Institution-admin managed governance records.

create table if not exists public.iqac_meetings (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  meeting_date     date not null,
  meeting_number   integer not null,
  agenda           text not null,
  minutes          text,
  chaired_by       uuid references public.staff(id) on delete set null,
  status           text not null default 'scheduled' check (status in ('scheduled','completed','minutes_pending')),
  created_at       timestamptz not null default now()
);
create index if not exists idx_iqac_mtg_inst on public.iqac_meetings(institution_id);
create index if not exists idx_iqac_mtg_year on public.iqac_meetings(academic_year_id);

create table if not exists public.iqac_action_items (
  id          uuid primary key default gen_random_uuid(),
  meeting_id  uuid not null references public.iqac_meetings(id) on delete cascade,
  description text not null,
  assigned_to uuid references public.staff(id) on delete set null,
  due_date    date,
  status      text not null default 'open' check (status in ('open','in_progress','completed','deferred')),
  resolved_at timestamptz,
  remarks     text
);
create index if not exists idx_iqac_action_mtg on public.iqac_action_items(meeting_id);

-- ── RLS (institution-admin managed governance records) ────────────────────────

alter table public.iqac_meetings enable row level security;
alter table public.iqac_action_items enable row level security;

drop policy if exists "iqac_mtg: admins manage" on public.iqac_meetings;
create policy "iqac_mtg: admins manage" on public.iqac_meetings for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "iqac_action: admins manage" on public.iqac_action_items;
create policy "iqac_action: admins manage" on public.iqac_action_items for all to authenticated
  using (
    exists (
      select 1 from public.iqac_meetings m where m.id = meeting_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = m.institution_id and g.role = 'INST_ADMIN')
      )
    )
  )
  with check (
    exists (
      select 1 from public.iqac_meetings m where m.id = meeting_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = m.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

grant select, insert, update, delete on public.iqac_meetings to authenticated;
grant select, insert, update, delete on public.iqac_action_items to authenticated;
