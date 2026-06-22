# CI/CD Pipeline (Arch A5)

How code reaches production for AURA Campus, and the gates it passes on the way.

## Overview

| Stage | Where | What runs | Blocks merge? |
|---|---|---|---|
| **CI** | GitHub Actions — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | type-check · lint · unit tests · migration replay + schema lint | **Yes** (required checks on `main`) |
| **Preview deploy** | Vercel | builds the PR branch, posts a preview URL | No (informational) |
| **Production deploy** | Vercel | builds & deploys `main` on merge | — |
| **Weekly backup** | GitHub Actions — [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml) | encrypted `pg_dump` artifact | — (scheduled) |

## CI — `ci.yml`

Triggers on every push to `main` and every pull request. Three jobs:

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
Boots a throwaway local Postgres with the Supabase CLI and **replays the schema
from zero**:
- `supabase db start`
- `supabase migration up --local --include-all` — a clean from-zero apply; fails if a migration is malformed or out of order
- `supabase db lint --local --schema public --level error --fail-on error`

No credentials needed — the local stack is ephemeral and self-contained. This is
the safety net that stops a broken migration from ever reaching the remote DB.

> **Schema baseline (2026-06-20).** This job initially failed: the 133 incremental
> migrations could not replay from zero — foundational tables (`institutions`,
> `departments`, `profiles`) were never created by any migration (they'd been
> bootstrapped via manual SQL), so the schema wasn't reproducible from git. Fixed
> by squashing into a single authoritative baseline,
> `supabase/migrations/00000000000000_baseline.sql` (a `pg_dump --schema-only`
> of production, with platform-managed default-privileges and psql meta-commands
> stripped). The 137 original files are archived under `supabase/migrations_archive/`
> (kept for history, ignored by the CLI). New schema changes go in NEW timestamped
> migrations after the baseline. To regenerate the baseline later, run
> `pg_dump --schema-only --no-owner --schema=public --schema=private "<db-url>"`
> and re-apply that stripping.

### `e2e` (Arch A2 — authenticated Playwright suite)
Seeds the namespaced e2e tenants and runs the `authed` Playwright project against
the **built** app (`npm run start`):
- `npm run seed:e2e` — idempotent, service-role seeder → `.auth/seed-manifest.json`
- `npx playwright test --project=authed` → **setup** (per-role `storageState`) →
  **route-crawl** (all 230 routes × owner role) → **critical flows** (5) →
  **cross-role denial** (27) → **institution isolation** (RLS/IDOR)
- On failure the Playwright HTML report is uploaded as an artifact.

**Secret-gated.** The first step checks for the Supabase secrets; if any are
missing the job exits **green (skipped)** so it never blocks a merge before CI is
configured. Once the secrets exist it runs the full suite. After confirming it's
green, add **`Authenticated e2e (...)`** to the required status checks on `main`.

> **Tradeoff (documented):** the e2e job currently runs against the **remote**
> Supabase project (the app's single DB), so each run writes the namespaced,
> idempotent `@e2e.aura.test` / `e2e-college-*` seed data there. This matches the
> environment the suite was validated against. A future hardening is to run the
> suite against an ephemeral local Supabase stack (as the `migrations` job does)
> so CI never touches the shared project — deferred until a dedicated test project
> or branch DB is set up.

## Setup status (outside the repo)

### 1. Branch protection on `main` — ✅ **configured (2026-06-20)**
Applied via the GitHub API. Current rule:
- ☑ Require a pull request before merging (0 approvals required — owner can self-merge)
- ☑ Require status checks to pass: **`Type-check, lint & unit tests`** + **`Validate migrations`**
- ☑ Require branches to be up to date before merging (strict)
- ☑ Block force-pushes and deletions
- `enforce_admins = false` (owner can bypass in emergencies; flip to `true` for no-exceptions enforcement)

> Branch protection / rulesets are free for **public** repos; for a **private**
> repo they require GitHub Pro. This repo is public.

### 2. Vercel preview deployments (Vercel → Project → Git) — ✅ connected
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

For the `e2e` job (Arch A2) — until these are set, the job skips green:
- **Required to activate the gate:** `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Recommended (so pages don't crash mid-crawl):** `NEXT_PUBLIC_RAZORPAY_KEY_ID`,
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`,
  `ANTHROPIC_API_KEY`, `SCHEDULER_API_URL`

These are the same values already in `.env.local` / Vercel — copy them into the
Actions secrets. After the `e2e` check goes green on a PR, mark it a required
status check on `main`.

## Database migrations to production

CI validates migrations but does **not** auto-apply them to the remote database
(deliberate — schema changes are reviewed and applied intentionally). After a PR
merges, apply with either:
- `supabase db push` (CLI, against the linked project), or
- the established MCP `execute_sql` flow used throughout this project.

See [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) for backup/restore and PITR.
