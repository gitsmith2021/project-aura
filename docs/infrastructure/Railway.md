# Infrastructure — Railway (Scheduler Engine)

## Purpose

Railway hosts the **Aura scheduler engine** — a standalone Python service that generates conflict-free, workload-balanced timetables using Google OR-Tools. It is the backend for the AI Auto-Scheduler in Aura Campus.

## Current Configuration

- **Service:** `aura-scheduler-engine/` (Python, FastAPI), deployed as a Docker service on Railway. Config: `aura-scheduler-engine/Dockerfile`, `aura-scheduler-engine/railway.json`.
- **Production URL:** `https://project-aura-production-6b0d.up.railway.app` (verified in [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md)).
- **Contract:**
  - `POST /generate-schedule` — requires shared secret header `X-API-Key` (`SCHEDULER_API_KEY`). Fails closed (`503`) if the key is unset.
  - `GET /health` — public health endpoint.
- **App-side integration:** every call goes through `callScheduler()` in [src/lib/scheduler.ts](../../src/lib/scheduler.ts) — 30s timeout, failures logged to the `scheduler_error_logs` table. The app reaches the engine via `SCHEDULER_API_URL`; the health probe is exposed at `GET /api/scheduler-health` (public).
- **Env vars:** `SCHEDULER_API_URL` and `SCHEDULER_API_KEY` must be set identically in **both** Railway and Vercel.
- Full deployment record: [docs/AURA_CAMPUS/AURA_SCHEDULER_DEPLOYMENT.md](../AURA_CAMPUS/AURA_SCHEDULER_DEPLOYMENT.md).

## Current Production Status

**Live / production.** Stateless microservice — **if it dies, no data is lost**; only AI timetable generation is unavailable. The UI shows an amber "AI Scheduler is offline" banner and manual scheduling continues to work.

## Deployment Flow

- Deploys from the `aura-scheduler-engine/` Docker build on Railway. `railway.json` configures auto-restart on healthcheck failure.
- Changes to the engine are deployed via Railway (Git or CLI) independently of the Vercel web deploy.

## Recovery Notes (from DISASTER_RECOVERY.md)

1. **Bad deploy / unhealthy:** Railway → service → Deployments → select last healthy → **Redeploy** (also auto-restarts per `railway.json`).
2. **Keep app up (degraded):** Vercel → unset/point `SCHEDULER_API_URL` at a dead host → redeploy → offline banner; manual timetabling still works.
3. **`503 "SCHEDULER_API_KEY is not set"`:** key missing/mismatched — re-set identical `SCHEDULER_API_KEY` in Railway **and** Vercel; redeploy both.
4. **Diagnose:** inspect `scheduler_error_logs` (Supabase) for `network` / `timeout` / `http_error` / `401` in the failure window.

## Future Improvements

- **Uptime monitoring (recommended, NOT yet configured):** an UptimeRobot HTTP monitor on `/api/scheduler-health`, 5-min interval, alert the admin email — one check covers both the engine and Vercel→engine connectivity.
- Document the Railway project ID / region in this file once verified.

## Related Documents

- [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) · [docs/AURA_CAMPUS/AURA_SCHEDULER_DEPLOYMENT.md](../AURA_CAMPUS/AURA_SCHEDULER_DEPLOYMENT.md) · [Disaster Recovery](../operations/Disaster Recovery.md) · [Secrets](Secrets.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
