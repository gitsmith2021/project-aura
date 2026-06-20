-- Arch A3 — Database Index Strategy: cover every foreign key with an index.
--
-- Postgres does NOT auto-create indexes for foreign-key columns (only for PK /
-- UNIQUE). The Supabase performance advisor flagged 136 FK columns in `public`
-- with no covering index. Unindexed FKs hurt three things this app does
-- constantly: (1) joins parent→child, (2) cascade deletes (a parent delete
-- seq-scans every child table), and (3) they let a child write take a stronger
-- lock on the parent row.
--
-- This block adds a btree index for every FK column whose columns are NOT the
-- leftmost prefix of an existing index. It is idempotent and re-runnable: it
-- only creates what's missing (the catalog check + `if not exists`), so it
-- self-heals as new tables are added — re-run it any time the advisor reports
-- new unindexed FKs. Index name scheme: `ix_<table>_<fk_columns>`.
--
-- Regular (non-concurrent) CREATE INDEX is used deliberately: at current data
-- volumes the brief table lock is negligible, and CONCURRENTLY can't run inside
-- a transaction/DO block. For very large tables in production, create the
-- specific index CONCURRENTLY out-of-band instead.

do $$
declare
  r record;
  idx_name text;
begin
  for r in
    with fk as (
      select con.conrelid,
             c.relname as tbl,
             con.conkey,
             (select string_agg(a.attname, '_' order by k.ord)
                from unnest(con.conkey) with ordinality as k(attnum, ord)
                join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as col_concat,
             (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
                from unnest(con.conkey) with ordinality as k(attnum, ord)
                join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as col_list
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where con.contype = 'f' and n.nspname = 'public'
    )
    select tbl, col_concat, col_list
    from fk
    where not exists (
      select 1 from pg_index i
      where i.indrelid = fk.conrelid
        and (string_to_array(i.indkey::text, ' ')::int2[])[1:array_length(fk.conkey, 1)] = fk.conkey
    )
  loop
    idx_name := left('ix_' || r.tbl || '_' || r.col_concat, 63);
    execute format('create index if not exists %I on public.%I (%s)', idx_name, r.tbl, r.col_list);
  end loop;
end $$;
