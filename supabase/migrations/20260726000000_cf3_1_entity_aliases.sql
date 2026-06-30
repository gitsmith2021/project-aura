-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3.1 (WS7) — Semantic Catalog: entity aliases
--
-- DB-managed aliases that route a phrase to a CF-2 entity, MERGED with the
-- built-in synonyms in slotExtractor.ts. This is what makes the semantic catalog
-- manageable without code changes: a SUPER_ADMIN adds "joinees" → admissions,
-- "profs" → staff, etc. from /admin/dev/semantic. Read by the pipeline under the
-- caller's RLS (aliases are non-sensitive); only SUPER_ADMIN writes.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.intelligence_entity_aliases (
  id         uuid primary key default gen_random_uuid(),
  entity_key text not null,           -- CF-2 entity key the alias routes to
  alias      text not null,           -- lowercase phrase
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (entity_key, alias)
);

create index if not exists ix_entity_aliases_entity on public.intelligence_entity_aliases (entity_key);

alter table public.intelligence_entity_aliases enable row level security;

drop policy if exists "entity aliases: read" on public.intelligence_entity_aliases;
create policy "entity aliases: read" on public.intelligence_entity_aliases
  for select to authenticated using (true);

drop policy if exists "entity aliases: super admin manage" on public.intelligence_entity_aliases;
create policy "entity aliases: super admin manage" on public.intelligence_entity_aliases
  for all to authenticated
  using (exists (select 1 from public.institution_members m where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'))
  with check (exists (select 1 from public.institution_members m where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'));

grant select, insert, update, delete on public.intelligence_entity_aliases to authenticated;
