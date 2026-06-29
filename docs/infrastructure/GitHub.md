# Infrastructure — GitHub

## Purpose

GitHub is the source-of-truth for code, the CI gatekeeper, and the host for the scheduled encrypted database backup. This document records the verified repository, branch protection, and workflow configuration.

## Current Configuration

- **Repository:** `gitsmith2021/project-aura` (public).
- **Default / main branch:** `main`.
- **Workflows** ([.github/workflows/](../../.github/workflows/)):
  - `ci.yml` — runs on every push to `main` and every PR. Jobs: `quality` (type-check · lint · unit tests), `migrations` (from-zero schema replay + `db lint`), `e2e` (authenticated Playwright suite, **secret-gated / skip-green** until repo variable `RUN_E2E=true`).
  - `db-backup.yml` — weekly encrypted `pg_dump` (Sundays 02:00 UTC + manual dispatch). See [Backup Strategy](../operations/Backup Strategy.md).
- **Branch protection on `main`** (configured 2026-06-20, per [ci-cd.md](../ci-cd.md)):
  - Require a pull request before merging (0 approvals — owner may self-merge).
  - Required status checks: **`Type-check, lint & unit tests`** + **`Validate migrations`**.
  - Require branches up to date (strict).
  - Block force-pushes and deletions.
  - `enforce_admins = false` (owner can bypass in emergencies).
- **Actions secrets** (Settings → Secrets and variables → Actions): `SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY` (backup workflow); plus the Supabase/Razorpay/Resend/Anthropic/scheduler values needed to activate the `e2e` gate. Repo **variable** `RUN_E2E` gates the e2e job.
- **Commit convention:** commits are co-authored — messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. PR bodies end with the Claude Code generation footer.

## Current Production Status

**Live / production.** Branch protection is active; CI is a required gate on `main`. Free for public repos (rulesets would require GitHub Pro on a private repo).

## Deployment Flow

1. Branch from `main` (never commit directly — protection blocks it).
2. Open a PR → CI runs the required checks; Vercel posts a preview.
3. On green, squash-merge to `main` → Vercel deploys production.

See [Branch Strategy](../developer/Branch Strategy.md) and [Release Checklist](../operations/Release Checklist.md).

## Recovery Notes

- **Accidental bad merge to `main`:** revert with a new commit (`git revert`) via PR; **never force-push `main`** (blocked and against policy).
- **Lost Actions secret:** re-create it in Settings → Secrets; `BACKUP_ENCRYPTION_KEY` must also be stored outside GitHub (a password manager) or historical backups are unrecoverable.
- **CI flakiness:** the `migrations` job uses an ephemeral local Postgres (no external creds), so failures are real schema problems, not credential issues.

## Future Improvements

- Flip `RUN_E2E=true` and add **`Authenticated e2e`** to required checks once a dedicated/branch test DB exists (so e2e stops writing to the shared production project).
- Consider `enforce_admins = true` for no-exception enforcement before external contributors join.
- Upgrade `actions/checkout@v4` / `setup-node@v4` (Node 20 deprecation warnings observed in CI annotations).

## Related Documents

- [ci-cd.md](../ci-cd.md) · [Vercel](Vercel.md) · [Backup Strategy](../operations/Backup Strategy.md) · [Branch Strategy](../developer/Branch Strategy.md) · [Secrets](Secrets.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
