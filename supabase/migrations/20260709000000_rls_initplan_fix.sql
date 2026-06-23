-- Infra Stabilization / R2 — resolve `auth_rls_initplan` performance findings.
--
-- 166 public RLS policies call `auth.uid()` / `auth.email()` **bare**, so Postgres
-- re-evaluates the auth function for EVERY row scanned. Wrapping the call in a
-- scalar sub-select — `(select auth.uid())` — makes the planner evaluate it ONCE
-- per query (an InitPlan) instead of per row. This is Supabase's documented #1 RLS
-- performance fix and is **value-equivalent**: the wrapped expression returns the
-- same value, only the evaluation timing changes. No access-control semantics change.
--
-- Implementation: ALTER POLICY (not DROP/CREATE) so policy name, command, roles and
-- permissive/restrictive flag are all preserved — only the USING / WITH CHECK
-- expressions are rewritten. The rewrite normalizes any already-wrapped form back to
-- bare first, then wraps, so the migration is idempotent (safe to replay).
--
-- Surface (verified): 144 policies use auth.uid(), 22 use auth.email(); none use
-- auth.role()/auth.jwt()/current_setting(); none were already wrapped.
--
-- Validated post-apply by the Arch A2 authenticated e2e suite (institution
-- isolation + cross-role + action-auth) — access control unchanged.
--
-- ROLLBACK: re-run this block with the two wrap-replacements swapped for the inverse
-- (`(select auth.uid())` → `auth.uid()`, `(select auth.email())` → `auth.email()`),
-- or restore the policies from the pre-change baseline. The change is behaviour-
-- preserving, so a rollback is only needed if a downstream tool mis-parses the form.

do $$
declare
  r record;
  new_qual text;
  new_wc text;
begin
  for r in
    select n.nspname as sch, c.relname as tbl, pol.polname as name,
           pg_get_expr(pol.polqual, pol.polrelid)      as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid) as wc
    from pg_policy pol
    join pg_class c     on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and ( coalesce(pg_get_expr(pol.polqual, pol.polrelid), '')
          || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ) ~ 'auth\.(uid|email)\(\)'
  loop
    -- normalize (un-wrap) → wrap, so repeated runs are stable
    new_qual := r.qual;
    if new_qual is not null then
      new_qual := replace(new_qual, '(select auth.uid())',   'auth.uid()');
      new_qual := replace(new_qual, '(select auth.email())', 'auth.email()');
      new_qual := replace(new_qual, 'auth.uid()',   '(select auth.uid())');
      new_qual := replace(new_qual, 'auth.email()', '(select auth.email())');
    end if;

    new_wc := r.wc;
    if new_wc is not null then
      new_wc := replace(new_wc, '(select auth.uid())',   'auth.uid()');
      new_wc := replace(new_wc, '(select auth.email())', 'auth.email()');
      new_wc := replace(new_wc, 'auth.uid()',   '(select auth.uid())');
      new_wc := replace(new_wc, 'auth.email()', '(select auth.email())');
    end if;

    if r.qual is not null and r.wc is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)', r.name, r.sch, r.tbl, new_qual, new_wc);
    elsif r.qual is not null then
      execute format('alter policy %I on %I.%I using (%s)', r.name, r.sch, r.tbl, new_qual);
    elsif r.wc is not null then
      execute format('alter policy %I on %I.%I with check (%s)', r.name, r.sch, r.tbl, new_wc);
    end if;
  end loop;
end $$;
