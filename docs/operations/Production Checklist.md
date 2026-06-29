# Operations — Production Checklist

## Purpose

A standing checklist of the conditions that must be true for the platform to be considered production-ready and safe to operate. Use it for periodic production-readiness reviews.

## Current State

Many items are verified in the repo (CI gates, branch protection, backups workflow). Some are dashboard-only and marked for manual verification.

## Implementation — checklist

### Security
- [x] RLS enabled on tenant tables; isolation tested by e2e (institution-isolation/IDOR suite)
- [x] Service-role key used only server-side (`src/utils/supabase/admin.ts`)
- [x] Webhooks authenticate (Razorpay HMAC, NFC bearer)
- [ ] **Resolve `NEXT_PUBLIC_RAZORPAY_KEY_SECRET`** exposure + rotate (see [Secrets](../infrastructure/Secrets.md)) — **OPEN**
- [ ] PITR enabled with retention ≥ 7 days — `TODO — Requires Manual Verification`
- [ ] Supabase production network restrictions / SSL enforcement reviewed — `TODO`

### Reliability
- [x] Scheduler failures logged (`scheduler_error_logs`) and degrade gracefully (offline banner)
- [x] Weekly encrypted DB backup workflow present
- [ ] `BACKUP_ENCRYPTION_KEY` copied to an external password manager — `TODO — Requires Manual Verification`
- [ ] Uptime monitor on `/api/scheduler-health` — **not yet configured**

### Delivery
- [x] Branch protection on `main` with required CI checks
- [x] Type-check, lint, unit tests are hard gates
- [x] Migration from-zero replay validated in CI
- [ ] e2e gate promoted to required (after dedicated test DB) — **deferred**

### Compliance / legal
- [x] `/privacy-policy` public (DPDP Act 2023) and exempt from auth fences
- [x] Consent banner present (`ConsentBanner` in root layout); `data_consent_logs` tracked
- [ ] DPDP/data-retention review current — see `src/lib/dataRetention.ts`; `TODO` confirm policy

### Observability
- [ ] Centralised error monitoring (e.g. Sentry) — `TODO — Requires Manual Verification` (none found in repo)
- [ ] Production logging/alerting destinations documented — `TODO`

## Future Roadmap

- Close all OPEN/`TODO` items above; add error monitoring; promote e2e to required.

## Related Documents

- [Launch Checklist](Launch Checklist.md) · [Infrastructure Checklist](Infrastructure Checklist.md) · [Secrets](../infrastructure/Secrets.md) · [security-audit-plan.md](../security-audit-plan.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
