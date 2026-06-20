-- Phase 7D — Platform Health: per-table row-estimate + RLS coverage for the
-- super-admin health/security dashboards.
--
-- SECURITY: this reads pg_catalog, so it is SECURITY DEFINER. It is callable
-- ONLY by the service_role (the super-admin server actions use createAdminClient).
-- EXECUTE is revoked from anon/authenticated so it never surfaces to a signed-in
-- user via PostgREST — that also keeps it off the "authenticated SECURITY DEFINER
-- executable" advisor list.

create or replace function public.platform_table_stats()
returns table (table_name text, row_estimate bigint, rls_enabled boolean)
language sql
security definer
set search_path = ''
as $$
  select c.relname::text,
         greatest(c.reltuples, 0)::bigint as row_estimate,
         c.relrowsecurity as rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
  order by c.relname;
$$;

revoke all on function public.platform_table_stats() from public;
revoke all on function public.platform_table_stats() from anon;
revoke all on function public.platform_table_stats() from authenticated;
grant execute on function public.platform_table_stats() to service_role;
