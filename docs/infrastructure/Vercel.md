# Infrastructure — Vercel

## Purpose

Vercel hosts and serves the Aura Campus Next.js web application. It builds every pull request as a preview and deploys `main` to production. This document records the verified configuration and the recovery path.

## Current Configuration

- **Project:** the Aura Campus Next.js app (repo `gitsmith2021/project-aura`).
- **Framework:** Next.js `16.2.4` (App Router, Turbopack). No `vercel.json` exists in the repo — build/runtime settings are managed in the Vercel dashboard (zero-config Next.js detection).
- **Plan:** **Pro** (confirmed by the account owner, 2026-06).
- **Git integration:** GitHub connected. Preview deployment per PR branch; production deployment on merge to `main`. Confirmed in [docs/ci-cd.md](../ci-cd.md).
- **Environment variables** (set in Vercel → Project → Settings → Environment Variables; never committed):
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RESEND_API_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY`, `SCHEDULER_API_URL`, `SCHEDULER_API_KEY`. Full list and classification: [Environment Variables](../operations/Environment Variables.md) and [Secrets](Secrets.md).
- **Production domain:** `TODO — Requires Manual Verification` (the custom domain is configured in the Vercel/DNS dashboard, not in the repo).

## Current Production Status

**Live / production.** The app builds and deploys from `main`. CI gates (type-check, lint, unit tests, migration replay) must pass before merge — see [GitHub](GitHub.md).

## Deployment Flow

```
feature branch ──PR──▶ Vercel Preview Deploy (per PR)  +  GitHub Actions CI (required gates)
                                   │
                          merge to main (squash)
                                   ▼
                       Vercel Production Deploy (automatic)
```

- No manual deploy step is required; merging to `main` triggers the production build.
- Rollback: Vercel → Deployments → select a previous healthy production deployment → **Promote/Rollback**.

## Recovery Notes

- **Bad deploy:** promote the previous good deployment in the Vercel dashboard (instant; no rebuild).
- **Degraded scheduler mode:** unset/short-circuit `SCHEDULER_API_URL` in Vercel env and redeploy — the app keeps working with manual timetabling (see [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) and [Railway](Railway.md)).
- **DB repoint (DR):** after restoring Supabase into a new project, update the `NEXT_PUBLIC_SUPABASE_URL` / `*_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` env vars in Vercel and redeploy.
- **Env var change:** redeploy is required for new env values to take effect.

## Future Improvements

- Commit an explicit `vercel.json` (regions, headers, cron) if/when configuration needs to be version-controlled.
- Add a production custom domain record to this doc once verified.
- Wire Vercel deploy notifications to the team channel.

## Related Documents

- [GitHub](GitHub.md) · [Supabase](Supabase.md) · [Deployment Guide](../operations/Deployment Guide.md) · [Secrets](Secrets.md) · [ci-cd.md](../ci-cd.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
