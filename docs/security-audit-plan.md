# Security Audit & Penetration Test Plan

> Phase 7D / ISO 27001 evidence. Defines scope, methodology and cadence for AURA's
> security review. The live posture summary is on `/admin/security`.

## Cadence

- **Automated (continuous):** Supabase advisors (`get_advisors` security + performance)
  run after every schema change during development; `npx tsc --noEmit` + Vitest gate
  every commit.
- **Internal review (quarterly):** walk the [RLS Policy Map](rls-policy-map.md), confirm
  no new unprotected tables, re-grep service-role usage, re-check `NEXT_PUBLIC_` env vars.
- **External penetration test (at minimum annual):** engage a third party against the
  staging environment before each NAAC/ISO audit window.

## Scope

| Area | What is tested |
|---|---|
| Multi-tenant isolation | No cross-institution data leakage via API, RLS, or PostgREST filters |
| AuthN/AuthZ | Role gates (`SUPER_ADMIN`/`INST_ADMIN`/`HOD`/staff/student), session handling, `getUser()` on every `/api` route |
| Payments | Razorpay HMAC webhook verification, idempotency, replay protection |
| Storage | Bucket policies; no listing of sensitive PII; signed access where required |
| Injection | SQL/`execute_sql` not reachable at runtime; parameterised supabase-js queries |
| Headers | CSP/`frame-ancestors`, `X-Frame-Options`, `X-Content-Type-Options` (see `next.config.ts`) |
| Secrets | `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` never in client bundles |

## Methodology

1. Reconnaissance — map routes, roles, and the public API surface.
2. Authorization testing — attempt cross-tenant reads/writes as each role.
3. Storage & payment abuse — bucket enumeration, webhook forgery/replay.
4. Header & transport checks — security headers, HTTPS, cookie flags.
5. Report — findings ranked (Critical/High/Medium/Low) with remediation owners.

## Known accepted items (tracked, not defects)

- **Leaked-password protection** (HaveIBeenPwned) — requires Supabase **Pro plan**;
  enable on upgrade.
- **Full resource-restricting CSP** — currently `frame-ancestors 'self'` only; a full
  `script-src`/`connect-src`/`frame-src` policy will be rolled out report-only first so
  it doesn't break Razorpay/Supabase-Realtime/YouTube/SCORM.
- **Intentional deny-all tables** and **public document buckets** — see the RLS Policy Map.

## Remediation SLA

Critical: 24h · High: 7d · Medium: 30d · Low: next planned release.
