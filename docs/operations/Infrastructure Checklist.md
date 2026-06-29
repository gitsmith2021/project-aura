# Operations — Infrastructure Checklist

## Purpose

Verify that every external service the platform depends on is correctly provisioned, connected, and recoverable.

## Current State

Five providers are in the critical path: Vercel, Supabase, Railway, GitHub, and the third-party APIs (Anthropic, Razorpay, Resend). Cloudflare is unverified.

## Implementation — checklist

### Vercel (web hosting)
- [x] GitHub repo connected; preview-per-PR + prod-on-merge
- [x] Plan: Pro
- [ ] All production env vars present (see [Environment Variables](Environment Variables.md)) — `TODO — Requires Manual Verification`
- [ ] Custom production domain configured + recorded — `TODO`

### Supabase (database/auth/storage)
- [x] Project `nsaheksysxinemtjcako`, Postgres 17, Pro plan
- [x] Migrations baseline in repo; CI replays from zero
- [ ] PITR enabled, retention ≥ 7 days — `TODO`
- [ ] Storage backup policy — `TODO`

### Railway (scheduler engine)
- [x] Service deployed; `/health` reachable; auto-restart via `railway.json`
- [x] `SCHEDULER_API_KEY` matches Vercel
- [ ] Project ID/region recorded — `TODO`

### GitHub (source + CI + backup)
- [x] Branch protection on `main` with required checks
- [x] `ci.yml` + `db-backup.yml` present
- [ ] Actions secrets set (`SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`) — `TODO — Requires Manual Verification`

### Third-party APIs
- [x] Anthropic (`ANTHROPIC_API_KEY`) — ~$20 credit
- [x] Razorpay (`RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`) + webhook registered
- [x] Resend (`RESEND_API_KEY`, `EMAIL_FROM`)
- [ ] Email sending domain SPF/DKIM/DMARC verified — `TODO`

### Cloudflare
- [ ] Confirm whether Cloudflare is in the stack at all — `TODO` (no repo evidence; see [Cloudflare](../infrastructure/Cloudflare.md))

### Recovery readiness
- [ ] Uptime monitor on `/api/scheduler-health` — **not yet configured**
- [ ] `BACKUP_ENCRYPTION_KEY` stored outside GitHub — `TODO`
- [ ] Restore drill performed in the last quarter — `TODO`

## Future Roadmap

- Close `TODO` items; add monitoring; record provider IDs/domains.

## Related Documents

- [Vercel](../infrastructure/Vercel.md) · [Supabase](../infrastructure/Supabase.md) · [Railway](../infrastructure/Railway.md) · [GitHub](../infrastructure/GitHub.md) · [Cloudflare](../infrastructure/Cloudflare.md) · [Secrets](../infrastructure/Secrets.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
