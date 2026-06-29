-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 v2 — query log columns + vector-match RPCs
--
-- • Extend intelligence_queries with the resolved response type + the CF-2 query
--   models that were executed (audit / "show me the query" / future memory).
-- • Two SECURITY INVOKER match functions used ONLY when a query embedding is
--   available (gte-small). They rank by pgvector cosine distance under the
--   caller's RLS. The deterministic exact/substring/bigram path in semantic.ts
--   needs no RPC, so the engine works with these unused.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.intelligence_queries
  add column if not exists response_type text,
  add column if not exists query_models  jsonb;

-- Route a question (already embedded) to the closest entity/column catalog terms.
create or replace function public.intelligence_match_terms(
  query_embedding extensions.vector,
  match_count integer default 8
)
returns table (kind text, entity_key text, column_key text, term text, distance real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select t.kind, t.entity_key, t.column_key, t.term,
         (t.embedding <=> query_embedding) as distance
  from public.intelligence_catalog_terms t
  where t.embedding is not null
  order by t.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;

-- Resolve a free-text value (already embedded) to a real stored value for one
-- institution/entity/column (e.g. "computer science" → department_id).
create or replace function public.intelligence_match_values(
  p_institution_id uuid,
  p_entity_key text,
  p_column_key text,
  query_embedding extensions.vector,
  match_count integer default 5
)
returns table (raw_value text, resolved_value text, distance real)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select v.raw_value, v.resolved_value,
         (v.embedding <=> query_embedding) as distance
  from public.intelligence_value_index v
  where v.institution_id = p_institution_id
    and v.entity_key = p_entity_key
    and v.column_key = p_column_key
    and v.embedding is not null
  order by v.embedding <=> query_embedding
  limit greatest(1, least(match_count, 25));
$$;

grant execute on function public.intelligence_match_terms(extensions.vector, integer) to authenticated;
grant execute on function public.intelligence_match_values(uuid, text, text, extensions.vector, integer) to authenticated;
