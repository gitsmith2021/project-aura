# Company — Core Principles

## Purpose

The non-negotiable engineering and product principles that every contribution must respect. Derived from explicit rules in the codebase and ecosystem docs.

## Current State

These are enforced today through CI gates, branch protection, the Aura Core "golden rule", and the technology principles in [AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md).

## Implementation

### Platform principles (verified)
- **Multi-tenant SaaS · Cloud-first · API-first · Mobile-first · AI-ready · Enterprise-grade · Secure by design · Scalable by design** (stated technology principles for all products).
- **Aura Core golden rule:** a shared service must contain **zero** product-specific domain language. If it mentions "student", "hostel", "site", or "technician", it belongs in the product, not in Core.
- **Dependency direction:** products depend on `@aura/*` packages, never on each other; Core never imports product code.

### Security principles (verified)
- RLS is the source of truth for tenant data access; the service-role key is server-only.
- Privilege is re-validated against the DB (e.g. `/admin`), not trusted from cookies.
- Webhooks authenticate themselves (HMAC / bearer); secrets never live in client bundles or Git.
- Privacy by design: public privacy policy, consent logging, data-retention tooling (DPDP Act 2023).

### Engineering principles (verified)
- Strict TypeScript; `Result<T>` over thrown errors across action boundaries.
- "Green locally = green in CI": type-check, lint (0 errors), tests, and from-zero migration replay are gates.
- Schema is reproducible from Git (baseline + new migrations) and changed deliberately.
- Degrade gracefully: a dependency outage never takes the institution down.
- Don't reimplement a generic capability — route it through the existing service seam.

### Product principles (verified)
- Honest numbers in dashboards/demos.
- Consistent UX system (tokens, right-sliding drawers, `w-full` dashboards) — see [UX Philosophy](UX Philosophy.md).
- Focus: one product at a time; revenue funds expansion.

## Future Roadmap

- Encode the dependency rules as lint/CI constraints when the monorepo lands.

## Related Documents

- [Manifesto](Manifesto.md) · [AI Charter](AI Charter.md) · [UX Philosophy](UX Philosophy.md) · [Coding Standards](../developer/Coding Standards.md) · [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md)

## Last Updated

2026-06-29

## Owner

Founder & Leadership
