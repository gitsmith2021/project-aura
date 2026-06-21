-- Phase 7X / KH-2 — Knowledge Hub Search & Discovery: full-text search.
--
-- A trigger-maintained `tsvector` over title + description + subject + tags,
-- with a GIN index, powers institution-wide keyword search. (A generated column
-- can't be used here because `array_to_string` over the tags array is not
-- IMMUTABLE; a BEFORE trigger sidesteps that and keeps the vector current.)

alter table public.knowledge_resources add column if not exists search_vector tsvector;

create or replace function public.kr_update_search_vector() returns trigger
language plpgsql as $$
begin
  new.search_vector := to_tsvector('english',
    coalesce(new.title,'') || ' ' || coalesce(new.description,'') || ' ' ||
    coalesce(new.subject,'') || ' ' || coalesce(array_to_string(new.tags, ' '), ''));
  return new;
end $$;

drop trigger if exists trg_kr_search_vector on public.knowledge_resources;
create trigger trg_kr_search_vector before insert or update on public.knowledge_resources
  for each row execute function public.kr_update_search_vector();

-- Backfill any rows created before the trigger existed.
update public.knowledge_resources set search_vector = to_tsvector('english',
  coalesce(title,'') || ' ' || coalesce(description,'') || ' ' ||
  coalesce(subject,'') || ' ' || coalesce(array_to_string(tags, ' '), ''))
where search_vector is null;

create index if not exists idx_kr_search on public.knowledge_resources using gin(search_vector);
