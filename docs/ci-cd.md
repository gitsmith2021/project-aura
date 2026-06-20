# CI/CD Pipeline (Arch A5)

How code reaches production for AURA Campus, and the gates it passes on the way.

## Overview

| Stage | Where | What runs | Blocks merge? |
|---|---|---|---|
| **CI** | GitHub Actions — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | type-check · lint · unit tests · migration replay + schema lint | Yes (once set as required checks) |
| **Preview deploy** | Vercel | builds the PR branch, posts a preview URL | No (informational) |
| **Production deploy** | Vercel | builds & deploys `main` on merge | — |
| **Weekly backup** | GitHub Actions — [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml) | encrypted `pg_dump` artifact | — (scheduled) |

## CI — `ci.yml`

Triggers on every push to `main` and every pull request. Two independent jobs:

### `quality`
- `npm ci` on Node 22 (npm cache enabled)
- `npm run typecheck` → `tsc --noEmit`
- `npm run lint` → `eslint` — **hard gate** (any error fails the build)
- `npm test` → Vitest (forks pool, pinned in [`vitest.config.ts`](../vitest.config.ts) so it's reliable on runners)

The hard gates (type-check, lint, tests) mirror the local Definition of Done (Dev
Rule 18), so "green locally" means "green in CI".

> **Lint debt cleared (2026-06-20).** The codebase's ~325 pre-existing ESLint
> problems were burned down to **0 errors**; `continue-on-error` was removed so
> lint is now a required check. The one exception is
> `react-hooks/set-state-in-effect` (~93 sites), deliberately scoped to `warn` in
> `eslint.config.mjs`: it fires on the standard client data-fetch pattern (a
> loader that calls `setLoading(true)` before awaiting), which is correct code,
> not a bug. ESLint doesn't fail on warnings, so these stay visible without
> blocking. **New code must be error-clean.**

### `migrations`
Boots a throwaway local Postgres with the Supabase CLI and **replays every
migration from zero**:
- `supabase db start`
- `supabase migration up --local --include-all` — a clean from-zero apply; fails if any migration is malformed or out of order
- `supabase db lint --local --schema public --level error --fail-on error`

No credentials needed — the local stack is ephemeral and self-contained. This is
the safety net that stops a broken migration from ever reaching the remote DB.

> We deliberately use `migration up` rather than `db reset` because `db reset`
> also loads `supabase/seed.sql` (configured in `config.toml`), which isn't
> committed; `migration up` validates the migrations alone.

## Manual setup (one-time, outside the repo)

These can't be expressed as committed files — configure them in the respective
dashboards:

### 1. Branch protection (GitHub → Settings → Branches → add rule for `main`)
- ☑ Require a pull request before merging
- ☑ Require status checks to pass → select **`Type-check, lint & unit tests`** and **`Validate migrations`**
- ☑ Require branches to be up to date before merging

### 2. Vercel preview deployments (Vercel → Project → Git)
- Connect the GitHub repo (if not already). Vercel auto-creates a **Preview
  Deployment** for every PR branch and a **Production Deployment** on merge to
  `main` — no workflow file required.
- Set the Production env vars in Vercel (Project → Settings → Environment
  Variables): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`. Never commit these.

### 3. Required GitHub Actions secrets (Settings → Secrets and variables → Actions)
For the weekly backup workflow:
- `SUPABASE_DB_URL` — direct Postgres connection string (Dashboard → Settings → Database)
- `BACKUP_ENCRYPTION_KEY` — long random passphrase (`openssl rand -base64 32`); keep a copy **outside** GitHub or backups are unrecoverable

## Database migrations to production

CI validates migrations but does **not** auto-apply them to the remote database
(deliberate — schema changes are reviewed and applied intentionally). After a PR
merges, apply with either:
- `supabase db push` (CLI, against the linked project), or
- the established MCP `execute_sql` flow used throughout this project.

See [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) for backup/restore and PITR.
