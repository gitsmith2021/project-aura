# 🚀 AURA Scheduler Engine — Production Deployment Plan

> **Scope:** Phase 1 deployment planning for **Aura Engine #1 — Timetable Optimization**
> (the Python FastAPI + Google OR-Tools microservice in [`aura-scheduler-engine/`](../../aura-scheduler-engine/)).
>
> **Status:** 📝 Planned — **not yet deployed.** This document and the accompanying
> `Dockerfile` / `railway.json` are inert artifacts. No application code has been changed;
> the security hardening in §3 is *designed here* and applied as a separate deploy step.
>
> **Architectural guardrails (non-negotiable):**
> 1. The scheduler stays a **separate Python FastAPI microservice**.
> 2. The OR-Tools solver is **not** moved into Next.js.
> 3. The scheduler is **not** converted into a Vercel serverless function.
> 4. It is treated as **Aura Engine #1** — service boundaries are preserved for the future
>    [Aura Scheduler Engine](AURA_CAMPUS_ENGINES.md#aura-scheduler-engine) Core extraction.
>
> **Related:** [AURA_CAMPUS_ENGINES.md](AURA_CAMPUS_ENGINES.md) · [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) ·
> [src/lib/scheduler.ts](../../src/lib/scheduler.ts) · [src/app/api/scheduler-health/route.ts](../../src/app/api/scheduler-health/route.ts)

---

## 1. Architecture Diagram

The engine is decoupled by design. The browser never talks to it directly — only the
Next.js server (Vercel) does, server-to-server over HTTPS.

```
                          ┌────────────────────────────────────────────────┐
   End user (browser)     │                    VERCEL                        │
        │                 │  Next.js App Router                              │
        │  HTTPS          │   • /schedules → <SchedulerStatusBanner/>        │
        └────────────────▶│   • GET /api/scheduler-health   (public probe)   │
                          │   • Server Actions → callScheduler()             │
                          │                                                  │
                          │   ENV:                                           │
                          │     SCHEDULER_API_URL = https://…railway.app     │
                          │     SCHEDULER_API_KEY = <shared secret>          │
                          └───────────────────────┬──────────────────────────┘
                                                  │  HTTPS, server-to-server
                                                  │  Header: X-API-Key: <secret>
                                                  │   • GET  /health           (no key)
                                                  │   • POST /generate-schedule (key required)
                                                  ▼
                          ┌────────────────────────────────────────────────┐
                          │              RAILWAY  (container host)           │
                          │  aura-scheduler-engine  — Aura Engine #1         │
                          │   • FastAPI (main.py)                            │
                          │   • Google OR-Tools CP-SAT solver (solver.py)    │
                          │   • uvicorn main:app --host 0.0.0.0 --port $PORT │
                          │   • Dockerfile / railway.json                    │
                          │   • STATELESS — owns no database                 │
                          │   ENV: PORT, SCHEDULER_API_KEY, ALLOWED_ORIGINS  │
                          └───────────────────────┬──────────────────────────┘
                                                  │ returns timetable JSON
                                                  ▼
                          Next.js persists results / errors to:
                          ┌────────────────────────────────────────────────┐
                          │                  SUPABASE                        │
                          │   • class_schedules (published timetable)        │
                          │   • scheduler_error_logs (outage visibility)     │
                          └────────────────────────────────────────────────┘

   Monitoring:  UptimeRobot ──HTTPS──▶ https://<prod-domain>/api/scheduler-health  (5 min)
```

**Why this shape:** the solver is a long-lived CPU-bound process that can run up to a 30s
time limit ([solver.py](../../aura-scheduler-engine/solver.py) `_SOLVER_TIME_LIMIT_S`). That
is the opposite of a serverless function's stateless, short-lived, cold-starting model. A
container host keeps the OR-Tools runtime warm and resident — which is also why the boundary
generalises cleanly to the future Core `resources × time-slots × constraints → assignment` API.

### Service API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | none | Liveness probe (`{"status":"ok"}`). Used by `/api/scheduler-health` and UptimeRobot. |
| `POST` | `/generate-schedule` | `X-API-Key` | Run CP-SAT solver. `200` OPTIMAL/FEASIBLE, `400` INFEASIBLE, `401` bad key. |

Request/response contracts are defined in [models.py](../../aura-scheduler-engine/models.py)
(`ScheduleRequest` → `ScheduleResponse`) and are **unchanged** by this plan.

---

## 2. Deployment Steps

> Prerequisite: a Railway account and the engine source pushed to the connected GitHub repo
> (it already lives in [`aura-scheduler-engine/`](../../aura-scheduler-engine/)).

1. **Generate the shared secret** (used by both the engine and Vercel):
   ```bash
   openssl rand -hex 32
   ```
   Store it in a password manager — it is set in two places (engine + Vercel) and never committed.

2. **Create the Railway service.**
   - New Project → **Deploy from GitHub repo** → select this repository.
   - Service **Settings → Root Directory** = `aura-scheduler-engine`
     (so Railway builds with the engine's `Dockerfile` / `railway.json`, not the Next.js app).
   - Builder auto-detects `railway.json` → `DOCKERFILE`. No Nixpacks config needed.

3. **Set engine environment variables** (Railway → service → Variables):
   | Var | Value |
   |---|---|
   | `SCHEDULER_API_KEY` | the secret from step 1 |
   | `ALLOWED_ORIGINS` | `https://<your-vercel-domain>` (defense-in-depth; see §3.2) |
   - **Do not** set `PORT` — Railway injects it automatically; the start command reads `$PORT`.

4. **Deploy** and confirm the build succeeds. Railway runs the healthcheck against `/health`
   (`railway.json` → `healthcheckPath`). The deploy is marked healthy only after `200 ok`.

5. **Apply the security hardening** from §3 to `main.py` (API key + CORS) and the paired
   `X-API-Key` header in [src/lib/scheduler.ts](../../src/lib/scheduler.ts). Commit, let Railway
   redeploy the engine. *(This is the one code change in the rollout; it is intentionally a
   discrete, reviewable step — see §3.)*

6. **Grab the public URL** (Railway → Settings → Networking → Generate Domain), e.g.
   `https://aura-scheduler-production.up.railway.app`. Verify:
   ```bash
   curl https://<engine-domain>/health          # → {"status":"ok"}
   curl -X POST https://<engine-domain>/generate-schedule   # → 401 without key (after §3)
   ```

7. **Point Vercel at the engine** (Vercel → Project → Settings → Environment Variables,
   Production scope):
   | Var | Value |
   |---|---|
   | `SCHEDULER_API_URL` | `https://<engine-domain>` (no trailing slash) |
   | `SCHEDULER_API_KEY` | the same secret from step 1 |

8. **Redeploy the Vercel app** so the new env vars take effect (env changes need a fresh build).

9. **Verify end-to-end:** load `/schedules` — the amber "AI Scheduler is offline" banner must
   disappear, and `GET https://<prod-domain>/api/scheduler-health` must return `200 {"status":"ok"}`.

10. **Set up monitoring** (§4) and record the engine URL + the rollback procedure (§5) in
    [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md).

---

## 3. Security Hardening

The engine is currently open: `allow_origins=["*"]` and no authentication
([main.py:18-23](../../aura-scheduler-engine/main.py#L18-L23)). Once it has a public Railway URL,
that must change **before** real traffic. Two layers, designed below — **not yet applied.**

### 3.1 Shared-secret authentication (primary control)

CORS does **not** protect this service — the only caller is the Next.js *server*, and
server-to-server requests are not subject to browser CORS. The real gate is a shared secret on
the mutating endpoint. `/health` stays public so the probe and UptimeRobot work without a key.

**Engine — proposed addition to `main.py`:**
```python
import os
from fastapi import Depends, Header

SCHEDULER_API_KEY = os.environ.get("SCHEDULER_API_KEY")

async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    # Fail closed: if the secret was never provisioned, reject rather than run open.
    if not SCHEDULER_API_KEY:
        raise HTTPException(status_code=503, detail="Engine misconfigured: SCHEDULER_API_KEY unset")
    if x_api_key != SCHEDULER_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

# Apply to the solver endpoint only — /health stays public:
@app.post("/generate-schedule", ..., dependencies=[Depends(require_api_key)])
```

**Next.js — paired change in [src/lib/scheduler.ts](../../src/lib/scheduler.ts):** add the header
to `callScheduler()`'s `fetch` (the health probe deliberately omits it):
```ts
const SCHEDULER_API_KEY = process.env.SCHEDULER_API_KEY;
// inside fetch headers for callScheduler():
...(SCHEDULER_API_KEY ? { "X-API-Key": SCHEDULER_API_KEY } : {}),
```

**Notes:** use constant-time comparison if the threat model warrants it; rotate by setting the
new value in Railway + Vercel and redeploying both. A `401` from the engine surfaces through the
existing `http_error` path in `callScheduler` and lands in `scheduler_error_logs` — a misconfigured
key is therefore visible, not silent.

### 3.2 CORS hardening (defense-in-depth)

Replace the wildcard with an env-driven allow-list. Because no browser legitimately calls the
engine cross-origin, the correct production posture is an **empty or single-origin** list, not `*`.

**Engine — proposed change to `main.py`:**
```python
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,          # was ["*"]
    allow_methods=["GET", "POST"],          # was ["*"]
    allow_headers=["Content-Type", "X-API-Key"],
)
```

### 3.3 Transport & exposure

- Railway terminates TLS — the engine is reached only over HTTPS.
- Prefer Railway **private networking** between services if the Next.js app is ever co-hosted on
  Railway; while the app is on Vercel, a public URL + API key is the correct model.
- Keep the engine **stateless** — it owns no DB credentials, so a compromise leaks no data
  (it only computes timetables from the request body).

---

## 4. Monitoring Plan

| Layer | Mechanism | Signal |
|---|---|---|
| **Platform** | Railway healthcheck (`railway.json` → `/health`, 30s timeout) | Failed deploy never goes live; unhealthy container auto-restarts (`restartPolicyType: ON_FAILURE`, max 10). |
| **External uptime** | UptimeRobot HTTP monitor → `https://<prod-domain>/api/scheduler-health`, 5-min interval, alert admin email on down | Catches engine-down *and* Vercel→engine connectivity in one probe (the route returns `503` when the engine is unreachable). |
| **In-app** | `<SchedulerStatusBanner/>` polls `/api/scheduler-health` | Users see the amber offline banner; manual scheduling still works. |
| **Failure forensics** | `scheduler_error_logs` table (written by `callScheduler`) | Every network/timeout/HTTP/`401` failure is recorded with endpoint, kind, status, institution — query in Supabase for the outage window. |
| **Resource usage** | Railway metrics dashboard (CPU/RAM/network) | Right-size the instance; watch for OR-Tools memory spikes on large solves. |

This reuses the resilience layer already shipped in Phase 2.5C — no new app code is needed for
monitoring, only the UptimeRobot setup.

---

## 5. Rollback Plan

The engine is **stateless**, so rollback is low-risk: no migrations, no data to restore. Three
levels, fastest first:

1. **Instant decouple (no engine, app stays up).** In Vercel, unset `SCHEDULER_API_URL` (or point
   it at a non-resolving host) and redeploy. The health probe returns `503`, the offline banner
   appears, and **manual timetable building + publishing keeps working** — AI generation is the
   only thing paused. This is the documented degraded mode in
   [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md#L79).

2. **Roll back the engine deploy.** Railway → Deployments → select the last healthy deploy →
   **Redeploy**. Use this if a code/config change broke the engine but the previous build was fine.

3. **Roll back the hardening commit.** If the §3 auth/CORS change is the culprit (e.g. key
   mismatch causing blanket `401`s), `git revert` that commit. Both the engine (Railway) and app
   (Vercel) redeploy from the reverted state; the engine reverts to open mode and the app drops the
   header — generation works again while the key issue is diagnosed.

**Verification after any rollback:** `curl https://<engine-domain>/health` → `200`, then load
`/schedules` and confirm the banner state matches the intended mode.

---

## 6. Estimated Monthly Cost

**Recommended instance:** ~0.5 vCPU (bursts to 1 during a solve), **1 GB RAM** (headroom for the
OR-Tools CP-SAT runtime). The service is mostly idle — solves are short, bursty, and bounded at
30s — so CPU is billed only during actual generations.

| Item | Assumption | Est. monthly |
|---|---|---|
| Railway Hobby plan base | Includes **$5 usage credit** | $5.00 |
| Memory (~1 GB resident, always-on) | Railway bills resources by the minute | ~$8–10 |
| vCPU (bursty — idle most of the month) | Charged on actual usage, not reservation | ~$1–3 |
| Egress (small JSON payloads) | Timetables are a few KB per call | < $1 |
| **Expected total** | light/typical institutional load | **≈ $8–15 / month** |

**Notes & levers:**
- Railway does **not** scale-to-zero; the container stays warm (good — no solver cold starts).
- The first ~$5 of usage is covered by the Hobby plan credit, so realistic out-of-pocket is often
  **~$5–10/month** at low volume.
- If cost must approach zero at idle, **Google Cloud Run** (scale-to-zero, pay-per-request) is the
  alternative — trade a few seconds of cold-start latency on the first solve for near-$0 idle cost.
  This does not change the architecture; only `SCHEDULER_API_URL` would point elsewhere.
- **Render** is a like-for-like alternative to Railway at a comparable price point (~$7/mo for a
  small always-on web service) if Railway is unavailable.

---

## 7. Artifacts in this Phase

| File | Purpose | State |
|---|---|---|
| [aura-scheduler-engine/Dockerfile](../../aura-scheduler-engine/Dockerfile) | Container image (python:3.12-slim, non-root, OR-Tools) | ✅ Created (inert) |
| [aura-scheduler-engine/.dockerignore](../../aura-scheduler-engine/.dockerignore) | Keep venv/cache/secrets out of the image | ✅ Created (inert) |
| [aura-scheduler-engine/railway.json](../../aura-scheduler-engine/railway.json) | Railway build + deploy + healthcheck config | ✅ Created (inert) |
| `main.py` auth + CORS (§3) | Shared-secret + origin hardening | 📝 Designed — applied at deploy step 5 |
| `src/lib/scheduler.ts` `X-API-Key` header (§3.1) | Paired client-side auth | 📝 Designed — applied at deploy step 5 |

Nothing here changes the engine's behaviour until someone runs the §2 steps. The service boundary
(separate process, HTTP contract, stateless solver) is preserved end to end.

---

*Phase 1 deployment planning — prepared for Aura Engine #1. Last updated: 2026-06-24.*
