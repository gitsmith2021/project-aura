# Operations — Disaster Recovery

## Purpose

Operational entry point for recovering from incidents. The **canonical, step-by-step runbook** is [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) at the docs root (referenced by code comments and audits). This page summarises it and links the moving parts.

## Current State

- **Objectives:** RTO < 4 hours, RPO < 1 hour (via Supabase PITR; degrades to ≤ 7 days on the weekly dump if PITR is off).
- **Components & their failure modes are documented** for Supabase (data), Vercel (web), Railway (scheduler), and the secret stores.

## Implementation — incident quick reference

| Incident | Action |
|---|---|
| Bad data written (e.g. wrong bulk import) | **PITR restore** to just before the write (Supabase dashboard) |
| Supabase project lost / region outage | Restore latest **weekly dump** into a **new** project; repoint Vercel env vars; redeploy |
| Scheduler down | Data safe (stateless). Railway → redeploy last healthy; or Vercel unset `SCHEDULER_API_URL` for degraded mode; manual scheduling meanwhile |
| Bad web deploy | Vercel → promote previous healthy production deployment |
| Leaked `SUPABASE_SERVICE_ROLE_KEY` | Rotate in Supabase → update Vercel + `.env.local` → redeploy |
| Leaked `BACKUP_ENCRYPTION_KEY` | Rotate; delete old artifacts (still encrypted with old key) |
| Leaked Razorpay/Resend/Anthropic key | Rotate in provider → update Vercel + `.env.local` → redeploy |

Full procedures (PITR steps, dump decrypt/restore commands, scheduler recovery ladder): [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md).

## Future Roadmap

- Configure **uptime monitoring** on `/api/scheduler-health` (recommended, not yet set up).
- Add Supabase **Storage** to the recovery plan.
- Run a scheduled **restore drill** and record RTO/RPO actuals here.

## Related Documents

- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) (canonical) · [Backup Strategy](Backup Strategy.md) · [Supabase](../infrastructure/Supabase.md) · [Railway](../infrastructure/Railway.md) · [Vercel](../infrastructure/Vercel.md) · [Secrets](../infrastructure/Secrets.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
