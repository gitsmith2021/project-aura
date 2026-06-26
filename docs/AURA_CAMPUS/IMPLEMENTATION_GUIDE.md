# 🛠️ AURA CAMPUS™ — Implementation Guide (Phase 9F)

> The infrastructure & deployment runbook for standing up and operating Aura
> Campus in production. Audience: implementation engineers / platform ops.
>
> **Pairs with:** [ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) (tenant data setup) ·
> [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) (go-live gate) ·
> [../DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) (recovery) ·
> [OPERATIONAL_CHECKLIST.md](OPERATIONAL_CHECKLIST.md) (day-to-day) ·
> [AURA_SCHEDULER_DEPLOYMENT.md](AURA_SCHEDULER_DEPLOYMENT.md) (scheduler engine).
> **Last updated:** 2026-06-26

---

## 1. Architecture at a glance

```
        Browser / Mobile (Expo)
                 │
                 ▼
   ┌─────────────────────────────┐
   │ Vercel — Next.js app         │  UI · Server Actions · API routes
   │ project-aura-three.vercel.app│
   └───────┬─────────────┬───────┘
           │             │
           ▼             ▼
 ┌──────────────┐  ┌──────────────────────────┐
 │ Supabase     │  │ Railway — Scheduler Engine │
 │ Postgres·Auth│  │ FastAPI + OR-Tools (Py)    │
 │ Storage·RLS  │  │ shared-secret X-API-Key    │
 └──────────────┘  └──────────────────────────┘
```

| System | Hosts | Console |
|--------|-------|---------|
| **Vercel** | Next.js app (UI · Server Actions · API routes) | `project-aura-three.vercel.app` |
| **Railway** | Scheduler Engine #1 (FastAPI + OR-Tools) | `project-aura-production-6b0d.up.railway.app` |
| **Supabase** | Postgres · Auth · Storage · RLS | Supabase dashboard |

> Auth is Supabase cookie-based (`@supabase/ssr`). Multi-tenancy is enforced by
> RLS on every table; the browser URL shows the institution **slug**, rewritten
> to a UUID by middleware before the page runs.

---

## 2. Configuration matrix (environment variables)

> Set in the **Vercel** project (Production scope) unless noted. Server-only
> secrets must never be `NEXT_PUBLIC_`. Full reference: AURA_ROADMAP env block.

| Variable | System | Purpose | Notes |
|----------|--------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | Supabase project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Supabase anon key | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Server-side privileged reads/writes | **server-only**; rotate if leaked |
| `SCHEDULER_API_URL` | Vercel | Scheduler base URL | unset → degraded mode (manual scheduling) |
| `SCHEDULER_API_KEY` | Vercel **+ Railway** | Shared-secret auth | **must be identical** both sides; rotate together |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Vercel | Payments | use **live** keys at cutover |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Vercel | Client checkout | public |
| `RAZORPAY_WEBHOOK_SECRET` | Vercel | Webhook HMAC verify | **required**; webhook fails closed without it |
| `RESEND_API_KEY` / `EMAIL_FROM` | Vercel | Transactional + demo-request email | verify sender domain for non-sandbox |
| `AURA_NFC_WEBHOOK_SECRET` | Vercel | NFC attendance webhook | HMAC verify |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Vercel | Landing WhatsApp button | falls back to a default if unset |
| `SUPABASE_DB_URL` / `BACKUP_ENCRYPTION_KEY` | GitHub repo secrets | Weekly encrypted backup workflow | repo Actions secrets, not Vercel |
| `PORT` | Railway | **Do not set** — auto-injected | Dockerfile expands `${PORT}` |

**Per-institution config (not env):** `currency` / `locale` / `timezone` live on
the `institutions` row (Arch A6 default INR / en-IN / Asia/Kolkata) and are
editable in Settings → Institution Settings.

---

## 3. Deployment

### 3.1 Web app (Vercel)
- Connected to GitHub `main`; every merge auto-deploys.
- Branch protection: PRs require typecheck/lint/unit + migration-replay + authed e2e.
- **Rollback:** Vercel → Deployments → promote a previous good build (instant).

### 3.2 Database (Supabase)
- Schema is migration-driven (`supabase/migrations/`), forward-only & idempotent.
- CI replays migrations from zero against a `pg_dump` baseline on every PR (Arch A5).
- Applying to prod: via the Supabase MCP/CLI or dashboard, **with authorization**.
- **Rollback:** migrations are forward-only — roll *forward* with a corrective migration; never edit history. Data restore via backup/PITR (DR runbook).

### 3.3 Scheduler engine (Railway)
- Docker container; `/health` answers GET + HEAD (uptime monitors).
- `SCHEDULER_API_KEY` shared-secret; CPU-bound OR-Tools solve runs off the event loop.
- **Engine #1 is feature-frozen (2026-06-24)** — production-issue fixes only.
- **Rollback:** Railway → Deployments → redeploy last healthy image.

---

## 4. Cutover sequence (new production institution)

1. **Provision** the tenant (SUPER_ADMIN → Add Institution) — auto-creates a 30-day trial + routes the admin into the onboarding wizard (Phase 9C).
2. **Onboard data** — follow [ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md): departments → academic year → fees → staff CSV → students CSV → issue logins.
3. **Verify env** — §2 matrix, especially live Razorpay keys + `RAZORPAY_WEBHOOK_SECRET`.
4. **Smoke test** — one login per role lands correctly; a ₹1 test payment reconciles; `/api/scheduler-health` + Railway `/health` → 200.
5. **Run the gate** — [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) §9 sign-off.
6. **Monitor** — confirm UptimeRobot covers the web app + scheduler.
7. **Hand over** — admin walkthrough (DEMO_PLAYBOOK per-persona scripts) + support channel.

---

## 5. Operations & recovery (pointers)

- **Day-to-day checks & cadence:** [OPERATIONAL_CHECKLIST.md](OPERATIONAL_CHECKLIST.md).
- **Incidents / recovery ladder / RTO-RPO:** [../DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md).
- **Scheduler URL / secrets / security model:** [AURA_SCHEDULER_DEPLOYMENT.md](AURA_SCHEDULER_DEPLOYMENT.md).
- **Secret rotation:** rotate `SCHEDULER_API_KEY` in Railway + Vercel together, then redeploy both; rotate Supabase service-role per the DR incident table.

---

## 6. Known production posture (v1.0)

| Area | State | Fallback |
|------|-------|----------|
| PITR | Deferred (needs Supabase Pro) | Weekly encrypted backup is the RPO floor |
| Leaked-password protection | Deferred (Pro) | Strong-password policy at signup |
| Razorpay recurring auto-charge | Deferred | Manual invoicing (7E) |
| SMS / WhatsApp channels | Deferred | In-app + email notifications |
| Mobile native (NFC/push/CCTV/in-app pay) | Gated on EAS build | Web is fully usable; Expo-Go screens built |
| Supabase tier | Nano (watch under real load) | R5 disable-Realtime + tier upgrade are the levers |

*Phase 9F · Implementation Guide — stand up, configure, cut over, and operate Aura
Campus in production. Cross-references the DR runbook and the release gate.*
