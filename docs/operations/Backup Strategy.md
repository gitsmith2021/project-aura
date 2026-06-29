# Operations — Backup Strategy

## Purpose

Describe how Aura Campus data is backed up so it can be recovered. This is the operational summary; the full runbook is [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md).

## Current State

Two layers, both verified in the repo:

| Layer | Mechanism | Cadence | RPO |
|---|---|---|---|
| **Layer 1 — PITR** (primary) | Supabase Point-in-Time Recovery | continuous (WAL ~2 min) | < 1 hour |
| **Layer 2 — Encrypted dump** (secondary) | GitHub Actions `db-backup.yml` (`pg_dump` → AES-256-CBC) | weekly (Sun 02:00 UTC) + manual | ≤ 7 days |

Targets: **RPO < 1 hour, RTO < 4 hours**.

## Implementation

### Layer 1 — Supabase PITR

- Enabled in the Supabase dashboard (Database → Backups → Point in Time). **Requires Pro + compute add-on.**
- Retention ≥ 7 days (30 recommended for production).
- **Status: must be enabled/verified manually** — `TODO — Requires Manual Verification` that PITR is currently on with the intended retention.

### Layer 2 — Weekly encrypted dump

- Workflow: [.github/workflows/db-backup.yml](../../.github/workflows/db-backup.yml).
- Secrets: `SUPABASE_DB_URL` (direct connection string), `BACKUP_ENCRYPTION_KEY` (`openssl rand -base64 32` — **also stored in a password manager**, else backups are unrecoverable).
- Output: private workflow artifacts, 30-day retention (~4 rolling weekly snapshots).
- **Run manually before every risky migration** (Actions → Weekly DB Backup → Run workflow).

### What is and isn't backed up

- **Backed up:** the Postgres database (all tenant data, finance, audit, etc.).
- **Not in the DB backup:** Supabase **Storage** objects (receipts/documents) — `TODO — Requires Manual Verification` of a storage backup/retention policy. The scheduler engine is **stateless** (nothing to back up).

## Future Roadmap

- Confirm + document PITR retention.
- Add a periodic Supabase Storage backup/export.
- Automate a quarterly **restore drill** into a throwaway project to prove the backups actually restore.

## Related Documents

- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) (full runbook) · [Disaster Recovery](Disaster Recovery.md) · [Supabase](../infrastructure/Supabase.md) · [GitHub](../infrastructure/GitHub.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
