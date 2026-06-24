# Development Tracker

## Status Summary

| Area | Status |
|--------|--------|
| Planned | 0 |
| In Progress | 0 |
| Completed | 1 |
| Deferred | 0 |

---

## Planned

- —

---

## In Progress

- —

---

## Completed

- **Aura Engine #1 — Timetable Scheduler: Production Deployed** (2026-06-24, deployed from `main` `a5a43f4`→`4096370`)
  - Python FastAPI + Google OR-Tools engine deployed as a standalone Docker microservice on **Railway** (`project-aura-production-6b0d.up.railway.app`) — kept off Vercel by design (long-lived CPU-bound solver, not a serverless function).
  - Fixed the `$PORT` exec-form startup crash (Dockerfile shell-form `CMD`, no `railway.json` startCommand) and the draft-save failure (aligned scheduler to the `academic_year_id` FK).
  - Security: shared-secret `X-API-Key` on `/generate-schedule` (fail-closed, constant-time), `/health` public, CORS allow-list empty, HTTPS-only.
  - Validated end-to-end on 2026-06-24 (health, auth 401/200, OPTIMAL solve, draft persistence). Full record in [AURA_SCHEDULER_DEPLOYMENT.md §8](AURA_SCHEDULER_DEPLOYMENT.md).

---

## Deferred

- —

---

## Notes

- **Monitoring (recommended, not yet configured):** UptimeRobot on `/api/scheduler-health` (5-min); watch Railway CPU/RAM; review `scheduler_error_logs` for `401`/timeout entries.
- **Secret rotation:** `SCHEDULER_API_KEY` lives in both Railway (engine) and Vercel (app) — rotate in both, then redeploy.
