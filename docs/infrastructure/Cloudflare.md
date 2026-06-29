# Infrastructure — Cloudflare

## Purpose

Document any Cloudflare usage (DNS, CDN, WAF, proxy) in front of the Aura platform.

## Current Configuration

`TODO — Requires Manual Verification.`

There is **no Cloudflare configuration in the repository** — no `wrangler.toml`, no Cloudflare Workers/Pages config, and no Cloudflare references in code or config files (verified by repository search). Hosting and edge serving are handled by **Vercel** (see [Vercel](Vercel.md)).

If Cloudflare is used at all, it would be at the **DNS / domain** layer outside the repo. The following must be confirmed manually in the Cloudflare dashboard and recorded here:

- [ ] Is the production domain's DNS managed by Cloudflare? (`TODO`)
- [ ] Is Cloudflare proxy (orange-cloud) / CDN / WAF in front of Vercel? (`TODO`)
- [ ] Any Cloudflare DNS records (CNAME → Vercel, MX → email, TXT for SPF/DKIM/DMARC)? (`TODO`)
- [ ] Any Cloudflare Workers / Pages / R2 in use? (`TODO` — none found in repo)

## Current Production Status

**Unverified.** No evidence of Cloudflare in the codebase. Treat as "not used by the application" until the DNS/account is confirmed.

## Deployment Flow

Not applicable from the repository. If Cloudflare proxies the domain, deployment is unaffected (Vercel remains the origin); DNS changes are made in the Cloudflare dashboard.

## Recovery Notes

- If DNS is on Cloudflare and the site is unreachable: verify the CNAME/record points at the Vercel target and that proxy/SSL mode is "Full".
- Keep registrar + DNS provider credentials in the password manager.

## Future Improvements

- Confirm whether Cloudflare is in the stack and replace this `TODO` doc with verified records, or note explicitly that DNS is managed elsewhere (e.g. the registrar or Vercel DNS).

## Related Documents

- [Vercel](Vercel.md) · [Email](Email.md) (DNS for SPF/DKIM) · [Infrastructure Checklist](../operations/Infrastructure Checklist.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
