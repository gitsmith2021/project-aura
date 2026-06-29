# Infrastructure — Secrets

## Purpose

Authoritative inventory of every secret/credential the platform uses, **where each is stored**, who may read it, and how to rotate it. **No secret values appear in this document or anywhere in the repository.**

## Current Configuration

### Secret inventory (names only)

| Secret | Type | Stored in | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Vercel, `.env.local`, GH Actions | Public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (publishable) | Vercel, `.env.local`, GH Actions | RLS-bound; safe in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical secret** | Vercel, `.env.local`, GH Actions | Bypasses RLS — server-only, never client |
| `SUPABASE_DB_URL` | **Critical secret** | GH Actions secrets | Direct Postgres conn string (backup workflow) |
| `BACKUP_ENCRYPTION_KEY` | **Critical secret** | GH Actions secrets **+ external password manager** | Without it, backups are unrecoverable |
| `ANTHROPIC_API_KEY` | Secret | Vercel, `.env.local` | Claude API |
| `RAZORPAY_KEY_ID` | Semi-public | Vercel, `.env.local` | Key id |
| `RAZORPAY_KEY_SECRET` | **Critical secret** | Vercel, `.env.local` | Payment secret — server-only |
| `RAZORPAY_WEBHOOK_SECRET` | Secret | Vercel, `.env.local` | HMAC verification |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public | Vercel, `.env.local` | Browser checkout |
| `RESEND_API_KEY` | Secret | Vercel, `.env.local` | Email |
| `EMAIL_FROM` | Config | Vercel, `.env.local` | Not secret |
| `SCHEDULER_API_URL` | Config | Vercel, `.env.local` | Engine URL |
| `SCHEDULER_API_KEY` | Secret | Vercel **and** Railway | Must match on both sides |
| `SMS_API_KEY` | Secret | Vercel, `.env.local` | SMS channel (referenced in code) |
| `WHATSAPP_TOKEN` | Secret | Vercel, `.env.local` | WhatsApp channel |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Public | Vercel, `.env.local` | Display number |
| `AURA_NFC_WEBHOOK_SECRET` | Secret | Vercel, `.env.local` | NFC attendance webhook bearer |
| `AURA_INSTITUTION_TIMEZONE` | Config | Vercel, `.env.local` | Not secret |

> Sources: `.env.local` keys, `grep process.env.*` across `src/`/`scripts/`, [ci-cd.md](../ci-cd.md), [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md). Production presence of every variable in Vercel is `TODO — Requires Manual Verification`.

### Storage locations

- **Vercel** → Project → Settings → Environment Variables (production runtime).
- **GitHub Actions** → Settings → Secrets and variables → Actions (`SUPABASE_DB_URL`, `BACKUP_ENCRYPTION_KEY`, + e2e activation secrets).
- **Railway** → service variables (`SCHEDULER_API_KEY`, `SCHEDULER_API_URL`).
- **`.env.local`** → local development only; **git-ignored**, never committed.

## Current Production Status

**Active.** Secrets are split across Vercel / GitHub / Railway as above. `.env.local` is git-ignored.

## ⚠️ Security Findings (action required)

1. **`NEXT_PUBLIC_RAZORPAY_KEY_SECRET` exists in `.env.local`.** `NEXT_PUBLIC_*` variables are bundled into client JavaScript. A payment **secret must never be public**. **Action:** verify it is unused in client code, delete the `NEXT_PUBLIC_` variant, and **rotate `RAZORPAY_KEY_SECRET`** if it was ever deployed to a `NEXT_PUBLIC_` name. See [Razorpay](Razorpay.md).
2. **`BACKUP_ENCRYPTION_KEY` must be copied outside GitHub** (a password manager). If lost, every encrypted backup is unrecoverable.

## Rotation Procedure (general)

1. Generate/rotate the secret in the provider console.
2. Update it in **every** store it lives in (Vercel / GitHub Actions / Railway / `.env.local`).
3. Redeploy the affected surface (Vercel and/or Railway).
4. Invalidate old artifacts where relevant (e.g. delete old encrypted backups after rotating `BACKUP_ENCRYPTION_KEY`).

Provider-specific rotation steps: [Supabase](Supabase.md), [Razorpay](Razorpay.md), [Anthropic](Anthropic.md), [Email](Email.md), [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md).

## Future Improvements

- Resolve security finding #1 (remove/rotate the public Razorpay secret).
- Adopt a single secrets manager (e.g. Vercel + 1Password/Doppler sync) to avoid drift across stores.
- Add secret-scanning (e.g. GitHub secret scanning / `gitleaks`) to CI.

## Related Documents

- [Environment Variables](../operations/Environment Variables.md) · [Razorpay](Razorpay.md) · [Supabase](Supabase.md) · [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
