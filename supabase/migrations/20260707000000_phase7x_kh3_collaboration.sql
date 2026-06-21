-- Phase 7X / KH-3 — Knowledge Hub Collaboration: ratings, bookmarks, collections.
--
-- - knowledge_ratings: one 1–5 rating per user per resource. A trigger keeps an
--   aggregate (rating_count + rating_sum) on the resource so the average is a
--   cheap read; individual ratings stay private to their owner.
-- - knowledge_bookmarks: a user's personal saved list.
-- - knowledge_collections (+ _items): named curated lists; the owner manages
--   them, and public ones are readable by institution members.

alter table public.knowledge_resources add column if not exists rating_count integer not null default 0;
alter table public.knowledge_resources add column if not exists rating_sum   integer not null default 0;

create table if not exists public.knowledge_ratings (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (resource_id, user_id)
);
create index if not exists ix_knowledge_ratings_resource_id on public.knowledge_ratings(resource_id);
create index if not exists ix_knowledge_ratings_user_id on public.knowledge_ratings(user_id);

create table if not exists public.knowledge_bookmarks (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.knowledge_resources(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (resource_id, user_id)
);
create index if not exists ix_knowledge_bookmarks_resource_id on public.knowledge_bookmarks(resource_id);
create index if not exists ix_knowledge_bookmarks_user_id on public.knowledge_bookmarks(user_id);

create table if not exists public.knowledge_collections (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  owner_id       uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  description    text,
  is_public      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists ix_knowledge_collections_institution_id on public.knowledge_collections(institution_id);
create index if not exists ix_knowledge_collections_owner_id on public.knowledge_collections(owner_id);

create table if not exists public.knowledge_collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.knowledge_collections(id) on delete cascade,
  resource_id   uuid not null references public.knowledge_resources(id) on delete cascade,
  added_at      timestamptz not null default now(),
  unique (collection_id, resource_id)
);
create index if not exists ix_knowledge_collection_items_collection_id on public.knowledge_collection_items(collection_id);
create index if not exists ix_knowledge_collection_items_resource_id on public.knowledge_collection_items(resource_id);

create or replace function public.kr_recalc_rating() returns trigger language plpgsql as $$
declare rid uuid;
begin
  rid := coalesce(new.resource_id, old.resource_id);
  update public.knowledge_resources kr set
    rating_count = (select count(*) from public.knowledge_ratings where resource_id = rid),
    rating_sum   = (select coalesce(sum(rating),0) from public.knowledge_ratings where resource_id = rid)
  where kr.id = rid;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_kr_rating on public.knowledge_ratings;
create trigger trg_kr_rating after insert or update or delete on public.knowledge_ratings
  for each row execute function public.kr_recalc_rating();

alter table public.knowledge_ratings enable row level security;
alter table public.knowledge_bookmarks enable row level security;
alter table public.knowledge_collections enable row level security;
alter table public.knowledge_collection_items enable row level security;

drop policy if exists "kratings: own" on public.knowledge_ratings;
create policy "kratings: own" on public.knowledge_ratings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "kbm: own" on public.knowledge_bookmarks;
create policy "kbm: own" on public.knowledge_bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "kcol: owner manage" on public.knowledge_collections;
create policy "kcol: owner manage" on public.knowledge_collections for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "kcol: public read" on public.knowledge_collections;
create policy "kcol: public read" on public.knowledge_collections for select to authenticated
  using (
    is_public and (
      exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id)
      or exists (select 1 from public.staff st where st.email = auth.email() and st.institution_id = knowledge_collections.institution_id)
      or exists (select 1 from public.students s where s.email = auth.email() and s.institution_id = knowledge_collections.institution_id)
    )
  );

drop policy if exists "kcoli: owner manage" on public.knowledge_collection_items;
create policy "kcoli: owner manage" on public.knowledge_collection_items for all to authenticated
  using (exists (select 1 from public.knowledge_collections c where c.id = collection_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.knowledge_collections c where c.id = collection_id and c.owner_id = auth.uid()));

drop policy if exists "kcoli: read via collection" on public.knowledge_collection_items;
create policy "kcoli: read via collection" on public.knowledge_collection_items for select to authenticated
  using (exists (select 1 from public.knowledge_collections c where c.id = collection_id and (c.owner_id = auth.uid() or c.is_public)));

grant select, insert, update, delete on public.knowledge_ratings to authenticated;
grant select, insert, update, delete on public.knowledge_bookmarks to authenticated;
grant select, insert, update, delete on public.knowledge_collections to authenticated;
grant select, insert, update, delete on public.knowledge_collection_items to authenticated;
