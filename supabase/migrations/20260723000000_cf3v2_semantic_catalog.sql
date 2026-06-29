-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 v2 — semantic catalog (vector search)
--
-- Two indexes power "understand the question, understand the DB values":
--
--  • intelligence_catalog_terms — one row per CF-2 ENTITY and COLUMN, with a
--    natural-language description and an embedding. Lets a free-text question be
--    routed to the right entity/columns by meaning (institution-agnostic).
--
--  • intelligence_value_index — per-institution distinct DIMENSION VALUES of low-
--    cardinality columns (departments, programs, statuses, designations…), each
--    with the raw value, a resolved value/id (e.g. department name → department_id)
--    and an embedding. Lets "computer science" resolve to the real department.
--
-- Resolution degrades gracefully: exact → pg_trgm similarity → pgvector cosine.
-- Embeddings (gte-small, 384-dim) are OPTIONAL; trigram/exact answer without them.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Catalog terms (entities + columns) — shared across institutions ──────────────
create table if not exists public.intelligence_catalog_terms (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('entity', 'column', 'value_hint')),
  entity_key  text not null,                 -- CF-2 entity key
  column_key  text,                          -- null for entity rows
  term        text not null,                 -- canonical label / phrase
  description text not null,                 -- NL doc used for embedding + display
  embedding   extensions.vector(384),
  created_at  timestamptz not null default now(),
  unique (kind, entity_key, column_key, term)
);

create index if not exists ix_catalog_terms_entity
  on public.intelligence_catalog_terms (entity_key);
create index if not exists ix_catalog_terms_term_trgm
  on public.intelligence_catalog_terms using gin (term extensions.gin_trgm_ops);
create index if not exists ix_catalog_terms_embedding
  on public.intelligence_catalog_terms using hnsw (embedding extensions.vector_cosine_ops);

alter table public.intelligence_catalog_terms enable row level security;

-- Any authenticated user may read the (non-sensitive) catalog; only SUPER_ADMIN writes.
drop policy if exists "catalog terms: read" on public.intelligence_catalog_terms;
create policy "catalog terms: read" on public.intelligence_catalog_terms
  for select to authenticated using (true);

drop policy if exists "catalog terms: super admin manage" on public.intelligence_catalog_terms;
create policy "catalog terms: super admin manage" on public.intelligence_catalog_terms
  for all to authenticated
  using (exists (select 1 from public.institution_members m
                 where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'))
  with check (exists (select 1 from public.institution_members m
                 where m.profile_id = (select auth.uid()) and m.role = 'SUPER_ADMIN'));

grant select, insert, update, delete on public.intelligence_catalog_terms to authenticated;

-- ── Value index (distinct dimension values) — per institution ───────────────────
create table if not exists public.intelligence_value_index (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  entity_key     text not null,             -- CF-2 entity the value belongs to
  column_key     text not null,             -- the filterable column
  raw_value      text not null,             -- human label (e.g. "Computer Science")
  resolved_value text not null,             -- what the filter should compare to (id or value)
  embedding      extensions.vector(384),
  created_at     timestamptz not null default now(),
  unique (institution_id, entity_key, column_key, raw_value)
);

create index if not exists ix_value_index_lookup
  on public.intelligence_value_index (institution_id, entity_key, column_key);
create index if not exists ix_value_index_raw_trgm
  on public.intelligence_value_index using gin (raw_value extensions.gin_trgm_ops);
create index if not exists ix_value_index_embedding
  on public.intelligence_value_index using hnsw (embedding extensions.vector_cosine_ops);

alter table public.intelligence_value_index enable row level security;

-- Read if you belong to the institution; manage if you're an admin of it (or SUPER_ADMIN).
drop policy if exists "value index: member read" on public.intelligence_value_index;
create policy "value index: member read" on public.intelligence_value_index
  for select to authenticated
  using (exists (select 1 from public.institution_members m
                 where m.profile_id = (select auth.uid())
                   and (m.institution_id = intelligence_value_index.institution_id or m.role = 'SUPER_ADMIN')));

drop policy if exists "value index: admin manage" on public.intelligence_value_index;
create policy "value index: admin manage" on public.intelligence_value_index
  for all to authenticated
  using (exists (select 1 from public.institution_members m
                 where m.profile_id = (select auth.uid())
                   and ((m.institution_id = intelligence_value_index.institution_id
                         and m.role in ('INST_ADMIN', 'PRINCIPAL')) or m.role = 'SUPER_ADMIN')))
  with check (exists (select 1 from public.institution_members m
                 where m.profile_id = (select auth.uid())
                   and ((m.institution_id = intelligence_value_index.institution_id
                         and m.role in ('INST_ADMIN', 'PRINCIPAL')) or m.role = 'SUPER_ADMIN')));

grant select, insert, update, delete on public.intelligence_value_index to authenticated;
