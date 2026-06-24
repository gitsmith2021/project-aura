# 🛠️ Aura Campus — Operational Checklist

> Lightweight day-to-day ops reference for the production stack. **Not** an incident
> runbook — see [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) for recovery, and
> [AURA_SCHEDULER_DEPLOYMENT.md](AURA_SCHEDULER_DEPLOYMENT.md) for the scheduler engine
> (canonical source for its URL / secrets / security model).
>
> **Last updated:** 2026-06-24

## Production surface

| System | Hosts | Console / URL |
|---|---|---|
| **Vercel** | Next.js app (UI · Server Actions · API routes) | `project-aura-three.vercel.app` · Vercel dashboard |
| **Railway** | Scheduler Engine #1 (FastAPI + OR-Tools) | `project-aura-production-6b0d.up.railway.app` · Railway dashboard |
| **Supabase** | Postgres · Auth · Storage · RLS | Supabase dashboard |

---

## ☑️ Railway — Scheduler Engine
- [ ] Service shows **Online** (green); latest deploy: Build ✅ → Deploy ✅ → Healthcheck ✅
- [ ] Variables present: `SCHEDULER_API_KEY` (do **not** set `PORT` — auto-injected)
- [ ] `GET /health` → `200 {"status":"ok"}`
- [ ] Metrics: CPU/RAM nominal (watch OR-Tools spikes on large solves)
- [ ] Cost: Hobby (~$5 credit) — review monthly usage
- **Recover:** Deployments → Redeploy last healthy (DISASTER_RECOVERY ladder)

## ☑️ Vercel — App
- [ ] Production deploy = current `main`
- [ ] Env (Production): `SCHEDULER_API_URL`, `SCHEDULER_API_KEY` (**matches Railway**), Supabase keys, Razorpay keys
- [ ] `/api/scheduler-health` → `200`
- [ ] `/schedules` — no offline banner; Generate works end-to-end
- **Recover:** redeploy last good; or unset `SCHEDULER_API_URL` for degraded mode (manual scheduling stays up)

## ☑️ Supabase — Database
- [ ] Health: CPU / Disk I/O / RAM healthy (post R1/R2 baseline: CPU ~14% · Disk ~17% · RAM ~48%)
- [ ] PITR enabled (Pro plan)
- [ ] RLS enabled on all tables (security dashboard)
- [ ] `scheduler_error_logs` reviewed — no unexpected `401`/`timeout`/`network` entries
- [ ] `SUPABASE_SERVICE_ROLE_KEY` not leaked (rotate per DISASTER_RECOVERY if exposed)

## ☑️ Scheduler Engine — App-side wiring
- [ ] All calls via `callScheduler()` (Dev Rule 14) — 30s timeout, failures logged
- [ ] Offline banner shows when engine down; manual scheduling unaffected
- [ ] `SCHEDULER_API_KEY` identical in Railway + Vercel (rotate both together, then redeploy)
- [ ] UptimeRobot monitor on `/api/scheduler-health` — ⚠️ **pending** (setup: [AURA_SCHEDULER_DEPLOYMENT.md §4.1](AURA_SCHEDULER_DEPLOYMENT.md))

---

## Cadence

| When | Check |
|---|---|
| **On every deploy** | Railway + Vercel deploys green; `/health` and `/api/scheduler-health` → 200 |
| **Weekly** | Supabase health metrics · Railway cost/usage · scan `scheduler_error_logs` |
| **On UptimeRobot alert** | Follow the DISASTER_RECOVERY recovery ladder |
| **On secret leak** | Rotate per the DISASTER_RECOVERY incident table |

---

*Scope: production operations only. Engine #1 is feature-frozen (2026-06-24) — production-issue fixes only.*
