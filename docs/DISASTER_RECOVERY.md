# 🛟 AURA — Backup & Disaster Recovery Runbook (Phase 2.5C)

> Audience: platform administrators. Keep this document current — it is the
> reference NAAC/ISO auditors and on-call admins will reach for during an outage.

## Objectives

| Objective | Target | How it's met |
|-----------|--------|--------------|
| **RTO** (Recovery Time Objective) | **< 4 hours** | Supabase PITR restore (~minutes) + Vercel redeploy; weekly dump restore as last resort |
| **RPO** (Recovery Point Objective) | **< 1 hour** | Supabase PITR (WAL archived every 2 min); without PITR the RPO degrades to the last weekly dump (≤ 7 days) |

---

## Layer 1 — Supabase Point-in-Time Recovery (primary)

PITR is the primary recovery mechanism. **It is a dashboard setting and must be
enabled manually** (requires the Pro plan + small compute add-on):

1. Supabase Dashboard → project `nsaheksysxinemtjcako` → **Database → Backups → Point in Time**
2. Enable PITR, set retention to **7 days minimum** (30 days recommended for production)
3. Confirm the daily backups tab also shows scheduled snapshots

**Restore procedure:** Dashboard → Database → Backups → Point in Time → pick a
timestamp just before the incident → Restore. The project is briefly unavailable
during restore. Afterwards verify: latest `fee_payments` rows, latest
`audit`-style tables (`razorpay_webhook_events`, `data_consent_logs`), and login.

## Layer 2 — Weekly encrypted dump (GitHub Actions)

Workflow: [`.github/workflows/db-backup.yml`](../.github/workflows/db-backup.yml)
— every Sunday 02:00 UTC, plus on-demand via *Actions → Weekly DB Backup → Run
workflow* (run one manually **before every risky migration**).

Setup (one-time, repo → Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `SUPABASE_DB_URL` | Direct Postgres connection string (Dashboard → Settings → Database → Connection string) |
| `BACKUP_ENCRYPTION_KEY` | `openssl rand -base64 32` — **store a copy in the institution's password manager**; without it backups are unrecoverable |

Backups are stored as private workflow artifacts with 30-day retention (4
rolling weekly snapshots).

**Restore from a dump:**

```bash
# 1. Download the artifact from the workflow run, then decrypt + unzip:
openssl enc -d -aes-256-cbc -pbkdf2 -in aura-backup-YYYYMMDD.sql.gz.enc \
  -out backup.sql.gz -pass pass:<BACKUP_ENCRYPTION_KEY>
gunzip backup.sql.gz

# 2. Restore into a FRESH Supabase project (never the live one):
psql "<NEW_PROJECT_DB_URL>" -f backup.sql

# 3. Point Vercel env vars at the new project and redeploy.
```

---

## Scheduler resilience (Python engine, port 8000)

The OR-Tools scheduler is a stateless microservice — if it dies, **no data is
lost**; only AI timetable generation is unavailable.

- **Wrapper:** every call goes through `callScheduler()` in
  [`src/lib/scheduler.ts`](../src/lib/scheduler.ts) (Dev Rule 14) — 30s
  timeout, failures logged to the `scheduler_error_logs` table.
- **Health probe:** `GET /api/scheduler-health` (public) → pings the engine's
  `/health`; returns `200 ok` / `503 offline`.
- **UI fallback:** the AI Auto-Scheduler panel shows an amber "AI Scheduler is
  offline" banner when the probe fails; manual scheduling keeps working.

**Uptime monitoring (manual setup):** create a free UptimeRobot HTTP monitor on
`https://<production-domain>/api/scheduler-health`, interval 5 minutes, alert
the admin email when down. (The monitor reaches the Next.js app, which probes
the engine over its private connection — the engine itself is not exposed.)

**Manual timetable fallback procedure** (while the engine is down):

1. Schedules → select department → **Add Class** for each slot (or publish an
   existing past draft from the AI panel's *Past Schedules* list — publishing
   does not need the engine).
2. Use the conflict badge on the Schedules page to catch double-bookings.
3. To restart the engine locally:
   `cd aura-scheduler-engine && venv\Scripts\activate && uvicorn main:app --port 8000`
4. Check `scheduler_error_logs` (Supabase table editor) for the failure window
   and root cause.

---

## Incident quick-reference

| Incident | Action |
|----------|--------|
| Bad data written (e.g. wrong bulk import) | PITR restore to just before the write |
| Supabase project lost / region outage | Restore latest weekly dump into a new project, repoint env vars |
| Scheduler down | No action needed for data; restart engine, use manual scheduling meanwhile |
| Leaked `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → rotate service role key, update Vercel + `.env.local` |
| Leaked `BACKUP_ENCRYPTION_KEY` | Rotate the secret; old artifacts remain encrypted with the old key — delete them after rotating |
