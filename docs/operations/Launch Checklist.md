# Operations — Launch Checklist

## Purpose

The one-time gate to clear before onboarding the first real paying institution onto Aura Campus (go-live), distinct from the per-release [Release Checklist](Release Checklist.md) and the standing [Production Checklist](Production Checklist.md).

## Current State

The product is feature-complete enough for a reference deployment (Bishop Heber College referenced in ecosystem docs; `aura-demo` showcase tenant exists). Several go-live hardening items remain open.

## Implementation — pre-launch gate

### Data & tenancy
- [ ] Production institution(s) created with correct slug → UUID
- [ ] Demo/test tenants (`aura-demo`, `@e2e.aura.test`) isolated from real tenants and excluded from real reporting
- [ ] Initial users provisioned with correct roles (SUPER_ADMIN / INST_ADMIN / PRINCIPAL / HOD / STAFF / STUDENT / PARENT / ALUMNI)
- [ ] RLS isolation re-verified against the real tenant

### Payments (if collecting fees at launch)
- [ ] Razorpay in **live** mode with verified settlement account — `TODO — Requires Manual Verification`
- [ ] Production webhook URL + secret registered and tested end-to-end
- [ ] `NEXT_PUBLIC_RAZORPAY_KEY_SECRET` removed + secret rotated (see [Secrets](../infrastructure/Secrets.md))

### Communications
- [ ] Email sending domain verified (SPF/DKIM/DMARC); a test email delivered to inbox (not spam)
- [ ] SMS/WhatsApp channels confirmed (if used at launch)

### Reliability & recovery
- [ ] PITR enabled with retention; one **restore drill** completed
- [ ] `BACKUP_ENCRYPTION_KEY` stored in the institution's password manager
- [ ] Uptime monitor live on `/api/scheduler-health`
- [ ] Error monitoring configured — `TODO` (none in repo)

### Domain & branding
- [ ] Production custom domain live with valid TLS
- [ ] Favicon/OG metadata correct (`src/app/layout.tsx`)
- [ ] Branding reviewed against [Brand Guidelines](../branding/Brand Guidelines.md)

### Legal
- [ ] `/privacy-policy` content reviewed and current (DPDP Act 2023)
- [ ] Data retention policy confirmed (`src/lib/dataRetention.ts`)
- [ ] Customer contract / DPA in place — `TODO`

### Operations
- [ ] On-call/admin contact + escalation path documented
- [ ] [Disaster Recovery](Disaster Recovery.md) runbook shared with the admin

## Future Roadmap

- Convert this into a repeatable per-tenant onboarding runbook once the first institution is live.

## Related Documents

- [Production Checklist](Production Checklist.md) · [Infrastructure Checklist](Infrastructure Checklist.md) · [Release Checklist](Release Checklist.md) · [docs/AURA_CAMPUS/DEMO_PLAYBOOK.md](../AURA_CAMPUS/DEMO_PLAYBOOK.md) · [docs/AURA_CAMPUS/OPERATIONAL_CHECKLIST.md](../AURA_CAMPUS/OPERATIONAL_CHECKLIST.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
