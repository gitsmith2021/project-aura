# Infrastructure — Email

## Purpose

Transactional email (account/credential, notifications, receipts) for Aura Campus.

## Current Configuration

- **Provider:** **Resend** — SDK `resend` `^6.12.4` ([package.json](../../package.json)).
- **Implementation:** [src/lib/email.ts](../../src/lib/email.ts) with templates in [src/lib/emailTemplates.ts](../../src/lib/emailTemplates.ts).
- **Env vars:** `RESEND_API_KEY` (server secret), `EMAIL_FROM` (sender address).
- **Aura Connect context:** email is one channel of the (proto) **Aura Connect** service alongside SMS (`src/lib/sms.ts`, `SMS_API_KEY`) and WhatsApp (`src/lib/whatsapp.ts`, `WHATSAPP_TOKEN`, `NEXT_PUBLIC_WHATSAPP_NUMBER`). See [AURA_CORE/AURA_CONNECT.md](../AURA_CORE/AURA_CONNECT.md).
- **Sending domain / DNS (SPF/DKIM/DMARC):** configured in the Resend dashboard + DNS — `TODO — Requires Manual Verification`.

## Current Production Status

**Live** where `RESEND_API_KEY` is configured. The supabase local `config.toml` shows the **local** dev mailbox (Inbucket) for development; production transactional email goes through Resend.

> Note: Supabase **Auth** emails (confirmations, password reset) are sent by Supabase's own email system unless a custom SMTP is configured in the dashboard — `TODO — Requires Manual Verification`. Application emails (notifications, credentials, receipts) go through Resend.

## Deployment Flow

- `RESEND_API_KEY` + `EMAIL_FROM` set in Vercel (production) and `.env.local` (local). No build dependency; sends at runtime.

## Recovery Notes

- **Key leaked/rotated:** rotate in Resend, update Vercel + `.env.local`, redeploy.
- **Deliverability issues:** verify SPF/DKIM/DMARC for the sending domain in Resend; check Resend dashboard logs for bounces.
- **Provider outage:** email failures are non-fatal to core flows (logged); the abstraction in `email.ts` allows swapping providers (the Aura Connect design goal).

## Future Improvements

- Document the verified sending domain and DNS records here.
- Decide and document whether Supabase Auth emails use custom SMTP (Resend) for brand consistency.
- Graduate `email.ts` / `sms.ts` / `whatsapp.ts` into the `@aura/connect` package (monorepo plan).

## Related Documents

- [AURA_CORE/AURA_CONNECT.md](../AURA_CORE/AURA_CONNECT.md) · [Secrets](Secrets.md) · [Environment Variables](../operations/Environment Variables.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
