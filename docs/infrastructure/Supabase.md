# Infrastructure — Supabase

## Purpose

Supabase is Aura Campus's primary backend: managed Postgres, authentication, storage, realtime, and Row-Level Security. This document records the verified configuration and recovery procedures.

## Current Configuration

- **Project ref:** `nsaheksysxinemtjcako` (verified in [src/utils/supabase/middleware.ts](../../src/utils/supabase/middleware.ts) and [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md)).
- **Database:** managed **PostgreSQL 17**.
- **Plan:** **Pro** (confirmed by the account owner, 2026-06; required for PITR + image transformations).
- **Services used:** Auth (email/password), Storage (receipts/documents), Realtime (e.g. dashboard institution changes), and RLS on tenant tables.
- **Client factories** ([src/utils/supabase/](../../src/utils/supabase/)): `client.ts` (browser, publishable key), `server.ts` (cookie session), `admin.ts` (service-role, server-only), `middleware.ts` (`updateSession`).
- **Schema management:** migrations in `supabase/migrations/` with an authoritative squashed baseline (`00000000000000_baseline.sql`); pre-baseline files archived in `supabase/migrations_archive/`. See [Migration Guidelines](../developer/Migration Guidelines.md).
- **Local dev config:** `supabase/config.toml` defines the **local CLI** stack (ports 54321–54327, local auth defaults). It is **not** the production configuration.
- **Production-only settings** (compute size, PITR retention, network restrictions, custom SMTP): managed in the Supabase dashboard — `TODO — Requires Manual Verification`.

## Current Production Status

**Live / production.** Single shared project serves the app. The CI `e2e` job currently writes namespaced seed data to this same project (documented tradeoff in [ci-cd.md](../ci-cd.md)); a dedicated test/branch DB is a planned hardening.

## Deployment Flow (schema changes)

- CI **validates** migrations (from-zero replay + `db lint`) but does **not** auto-apply to production (deliberate).
- After a PR merges, apply schema changes intentionally with `supabase db push` (CLI, linked project) or the established `execute_sql` flow.
- Always run a manual backup (db-backup workflow) **before** a risky migration.

## Recovery Notes

- **Point-in-Time Recovery (primary):** Dashboard → Database → Backups → Point in Time. **Must be enabled manually** (Pro + compute add-on); set retention ≥ 7 days (30 recommended). RPO < 1 hour, RTO < 4 hours. See [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md).
- **Weekly encrypted dump (secondary):** GitHub Actions `db-backup.yml`; decrypt + restore into a **fresh** project, then repoint Vercel env vars.
- **Leaked service-role key:** Dashboard → Settings → API → rotate `service_role` key → update Vercel + `.env.local`.
- **Never restore a dump over the live project** — always restore into a new project and repoint.

## Future Improvements

- Confirm and document **PITR is enabled** with retention (currently a manual prerequisite, not verifiable from the repo).
- Stand up a dedicated test/branch database so CI e2e never touches production.
- Enable DB SSL enforcement and network restrictions in production (`config.toml` shows them disabled for local dev only).

## Related Documents

- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) · [Backup Strategy](../operations/Backup Strategy.md) · [rls-policy-map.md](../rls-policy-map.md) · [query-performance.md](../query-performance.md) · [Migration Guidelines](../developer/Migration Guidelines.md) · [Secrets](Secrets.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
