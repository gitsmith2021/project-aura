# Operations — Deployment Guide

## Purpose

The authoritative, current process for getting code and schema changes into production for Aura Campus.

## Current State

Production is served by **Vercel** from the `main` branch, backed by the **Supabase** project `nsaheksysxinemtjcako`, with the **scheduler engine** on **Railway**. CI on **GitHub Actions** gates every merge. There is no manual web deploy step — merging to `main` ships.

## Implementation

### Application deployment (web)

```
1. git checkout -b <type>/<short-name>        # never commit to main (protected)
2. implement + run the local Definition of Done:
      npm run typecheck && npm run lint && npm test
3. git push -u origin <branch>  →  open PR
4. CI runs required checks:  "Type-check, lint & unit tests"  +  "Validate migrations"
   Vercel posts a Preview Deployment URL on the PR
5. squash-merge to main  →  Vercel auto-deploys Production
```

- Rollback: Vercel → Deployments → promote a previous healthy production deployment.
- See [Vercel](../infrastructure/Vercel.md), [GitHub](../infrastructure/GitHub.md), [Release Checklist](Release Checklist.md).

### Database / schema deployment

- CI **validates** migrations (from-zero replay + lint) but does **not** auto-apply them to production.
- After merge, apply intentionally:
  - `supabase db push` (CLI against the linked project), **or**
  - the established `execute_sql` flow.
- **Always run a manual DB backup before a risky migration** (Actions → Weekly DB Backup → Run workflow).
- New schema goes in **new timestamped migrations after the baseline** (`supabase/migrations/`). See [Migration Guidelines](../developer/Migration Guidelines.md).

### Scheduler engine deployment (Railway)

- Deployed independently from `aura-scheduler-engine/` (Docker) on Railway. Auto-restarts on healthcheck failure (`railway.json`).
- `SCHEDULER_API_KEY` must match in **both** Railway and Vercel. See [Railway](../infrastructure/Railway.md).

### Environment variables

- Production values live in **Vercel**; local values in `.env.local`. Changing a Vercel env var requires a redeploy. Full list: [Environment Variables](Environment Variables.md).

## Future Roadmap

- Auto-apply reviewed migrations via a guarded deploy step once a staging DB exists.
- Promote previewed migrations against a Supabase branch DB before production.

## Related Documents

- [Vercel](../infrastructure/Vercel.md) · [GitHub](../infrastructure/GitHub.md) · [Supabase](../infrastructure/Supabase.md) · [Railway](../infrastructure/Railway.md) · [Release Checklist](Release Checklist.md) · [Migration Guidelines](../developer/Migration Guidelines.md) · [ci-cd.md](../ci-cd.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
