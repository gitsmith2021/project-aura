# Company — Manifesto

## Purpose

The beliefs that drive how Aura is built and run. Written to be durable and to settle arguments when trade-offs get hard.

## Current State

These tenets are reconstructed from the patterns and explicit rules already in the codebase and docs (the ecosystem vision, the Core architecture golden rule, the engineering Definition of Done). They describe how Aura *actually* operates today.

## Implementation — what we believe

1. **Build the platform, not just the product.** Auth, communication, audit, AI, and reporting are shared **Aura Platform** services — built once, reused everywhere. We never ship a fourth way to send an email or check a permission.

2. **Focus beats breadth.** One product at a time. Campus must earn revenue and prove the platform before Build or Field begin. The biggest risk is doing too much too soon.

3. **The database tells the truth.** Multi-tenant isolation is enforced by Row-Level Security, not by hope in the application layer. Privilege is re-checked, not trusted from a cookie.

4. **Honest numbers.** Dashboards and demos show real, seeded data — never inflated vanity metrics.

5. **Green locally means green in production.** Type-check, lint, tests, and from-zero migration replay are gates, not suggestions. Schema changes are deliberate and reversible.

6. **Degrade gracefully.** A dependency outage (scheduler, AI) must never take the institution offline; the product falls back to a working manual path with a clear message.

7. **Respect the people.** Accessibility, privacy (DPDP Act 2023, consent, data retention), and calm, helpful copy are part of the work, not an afterthought.

8. **Document what exists.** The repository should be self-documenting; we describe reality and mark the unknown as unverified rather than inventing it.

## Future Roadmap

- Revisit these tenets at each product/phase boundary; amend by PR with rationale.

## Related Documents

- [Vision](Vision.md) · [Mission](Mission.md) · [Core Principles](Core Principles.md) · [AI Charter](AI Charter.md) · [UX Philosophy](UX Philosophy.md)

## Last Updated

2026-06-29

## Owner

Founder & Leadership
