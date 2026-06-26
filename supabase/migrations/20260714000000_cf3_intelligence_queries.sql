-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 — Aura Intelligence: question history
--
-- Logs each executive question (intent + slots), NOT the result data. Powers the
-- "Recent Questions" launcher now, and is the seam for CF-3.2 conversation memory
-- and CF-4 activity. RLS owner-scoped. No result rows are ever stored.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.intelligence_queries (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id        uuid not null,                 -- auth.users id (asker)
  role           text,
  question       text not null,
  intent_id      text,                          -- resolved intent (null = unmatched)
  slots          jsonb,                         -- extracted parameters
  created_at     timestamptz not null default now()
);

create index if not exists ix_intelligence_queries_user
  on public.intelligence_queries (user_id, institution_id, created_at desc);

alter table public.intelligence_queries enable row level security;

-- A user reads & writes only their own questions; SUPER_ADMIN may read all.
drop policy if exists "intel queries: owner manage" on public.intelligence_queries;
create policy "intel queries: owner manage" on public.intelligence_queries
  for all to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.institution_members m
               where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN')
  )
  with check (
    user_id = (select auth.uid())
    or exists (select 1 from public.institution_members m
               where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN')
  );

grant select, insert, update, delete on public.intelligence_queries to authenticated;
