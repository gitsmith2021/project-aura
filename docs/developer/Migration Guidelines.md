# Developer — Migration Guidelines

## Purpose

How to change the database schema safely so it stays reproducible from Git and never breaks production.

## Current State

Schema is managed as Supabase migrations with an authoritative squashed **baseline**; CI replays every migration from zero on a throwaway Postgres. Verified in [ci-cd.md](../ci-cd.md).

## Implementation

### Layout
- `supabase/migrations/00000000000000_baseline.sql` — the authoritative baseline (a `pg_dump --schema-only` of production, with platform default-privileges and psql meta-commands stripped).
- `supabase/migrations/<timestamp>_*.sql` — **new** changes after the baseline (e.g. `20260709000000_rls_initplan_fix.sql`).
- `supabase/migrations_archive/` — the original pre-baseline incremental files, kept for history and **ignored by the CLI**.

### Creating a migration
1. **Never hand-name a migration file.** Create it with the CLI:
   `supabase migration new <descriptive_name>`
2. Iterate on the schema locally with `execute_sql` / `supabase db query` until correct (do **not** repeatedly `apply_migration` while iterating — it writes history entries and breaks `db diff`).
3. Put the final SQL in the new timestamped migration.

### Validate locally (mirror CI)
```bash
supabase db start
supabase migration up --local --include-all     # must replay cleanly from zero
supabase db lint --local --schema public --level error --fail-on error
```

### Apply to production (after merge)
- CI validates but does **not** auto-apply. After the PR merges:
  - **Back up first** (run the db-backup workflow before risky changes).
  - Apply with `supabase db push` (linked project) or the `execute_sql` flow.

### Rules
- New schema is **append-only** via new migrations after the baseline — don't edit archived files or the baseline by hand (regenerate the baseline only via the documented `pg_dump` + strip process).
- Enable RLS on every new table in `public`; write policies matching the real access model (don't default everything to the same `auth.uid()` check).
- Views: use `security_invoker = true` (Postgres 15+); keep `security definer` functions out of exposed schemas.
- UPDATE policies need a matching SELECT policy or updates silently affect 0 rows.

## Future Roadmap

- Preview migrations against a Supabase **branch DB** before production.
- Add a guarded auto-apply step once staging exists.

## Related Documents

- [Supabase](../infrastructure/Supabase.md) · [rls-policy-map.md](../rls-policy-map.md) · [Deployment Guide](../operations/Deployment Guide.md) · [ci-cd.md](../ci-cd.md) · [.claude/skills/supabase](../../.claude/skills/supabase)

## Last Updated

2026-06-29

## Owner

Platform Engineering
