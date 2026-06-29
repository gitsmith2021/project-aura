# Operations — Environment Variables

## Purpose

The complete list of environment variables the platform reads, what each is for, where it is set, and which surface needs it. **Values are never recorded here** — see [Secrets](../infrastructure/Secrets.md) for storage and rotation.

## Current State

Variables are sourced from `.env.local` (local), Vercel (production web), GitHub Actions (CI/backup), and Railway (scheduler). The table below is derived from `.env.local` keys + `grep process.env.*` across `src/`, `scripts/`, and the scheduler engine.

## Implementation

| Variable | Surface | Purpose | Public? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Web, CI | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web, CI | Supabase publishable/anon key (RLS-bound) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Web (server), CI | Service-role client (bypasses RLS) | **No** |
| `SUPABASE_DB_URL` | CI (backup) | Direct Postgres connection string | **No** |
| `BACKUP_ENCRYPTION_KEY` | CI (backup) | Encrypts backup artifacts | **No** |
| `ANTHROPIC_API_KEY` | Web (server) | Claude API for Knowledge Hub AI | **No** |
| `RAZORPAY_KEY_ID` | Web (server) | Razorpay key id | Semi |
| `RAZORPAY_KEY_SECRET` | Web (server) | Razorpay secret | **No** |
| `RAZORPAY_WEBHOOK_SECRET` | Web (server) | Razorpay webhook HMAC verification | **No** |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Web (client) | Browser checkout key id | Yes |
| `RESEND_API_KEY` | Web (server) | Transactional email (Resend) | **No** |
| `EMAIL_FROM` | Web (server) | Sender address | Config |
| `SCHEDULER_API_URL` | Web (server) | Scheduler engine base URL | Config |
| `SCHEDULER_API_KEY` | Web + Railway | Shared `X-API-Key` secret for `/generate-schedule` | **No** |
| `SMS_API_KEY` | Web (server) | SMS channel | **No** |
| `WHATSAPP_TOKEN` | Web (server) | WhatsApp channel | **No** |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Web (client) | Display WhatsApp number | Yes |
| `AURA_NFC_WEBHOOK_SECRET` | Web (server) | NFC attendance webhook bearer secret | **No** |
| `AURA_INSTITUTION_TIMEZONE` | Web (server) | Default institution timezone | Config |
| `DEMO_STUDENTS` | Scripts | Tunable demo seed scale | Config |
| `NODE_ENV` | Runtime | Standard Node environment flag | Config |

> Production presence of each variable in Vercel is `TODO — Requires Manual Verification`. The local-dev `supabase/config.toml` also references `OPENAI_API_KEY` and S3 (`S3_HOST` etc.) **for the local Supabase stack only** — not used by the deployed app.

### Rules

- Anything prefixed `NEXT_PUBLIC_` is shipped to the browser — never put a secret behind that prefix. (See the [Secrets](../infrastructure/Secrets.md) finding on `NEXT_PUBLIC_RAZORPAY_KEY_SECRET`.)
- The service-role key is server-only (`src/utils/supabase/admin.ts`); it must never be imported into a client component.
- Changing a Vercel env var requires a redeploy to take effect.

## Future Roadmap

- Provide a committed `.env.example` (names + descriptions, no values) to speed onboarding.
- Centralise secret distribution to avoid drift across stores.

## Related Documents

- [Secrets](../infrastructure/Secrets.md) · [Developer Setup](../developer/Developer Setup.md) · [Deployment Guide](Deployment Guide.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
