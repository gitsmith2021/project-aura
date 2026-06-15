# Aura Documentation

This `docs/` tree holds all **strategy, product, and platform documentation** for the Aura ecosystem, organised by area. As Aura grows from a single product (Aura Campus) into a multi-product SaaS ecosystem, each area owns its own vision, roadmap, and development tracker.

## Map

| Area | What it covers |
|------|----------------|
| [AURA/](AURA/) | Company & ecosystem level — vision, strategy, product portfolio, brand, glossary |
| [AURA_CORE/](AURA_CORE/) | Shared platform services consumed by every product (identity, connect, audit, docs, flow, insights, AI, mobile, vision-service) |
| [AURA_CAMPUS/](AURA_CAMPUS/) | **Active product** — Education ERP. Build roadmap, functional spec, release notes |
| [AURA_BUILD/](AURA_BUILD/) | Future — Construction & project execution platform (placeholder planning) |
| [AURA_FIELD/](AURA_FIELD/) | Future — Field Service Management platform (placeholder planning) |
| [AURA_VISION/](AURA_VISION/) | Future — Operational visibility & intelligence (CCTV/GPS/AI) (placeholder planning) |
| [AURA_EXECUTIVE/](AURA_EXECUTIVE/) | Executive & business strategy (one-pager, pricing, GTM, investor notes) |
| [RESEARCH/](RESEARCH/) | Market, competitor, and customer research |

## Engineering / ops docs (kept at `docs/` root)

These are referenced by code comments and CI, so they stay here rather than under an area folder:

- [`DISASTER_RECOVERY.md`](DISASTER_RECOVERY.md) — backup, PITR, RTO/RPO, scheduler resilience
- [`testing-guide.md`](testing-guide.md) — Vitest + Playwright conventions
- [`CODEBASE_AUDIT_2026-06-12.md`](CODEBASE_AUDIT_2026-06-12.md) — point-in-time codebase audit

> **Status:** Aura Campus is the only product in active development. Build / Field / Vision folders contain placeholder planning documents only — detailed requirements are intentionally not invented ahead of time.
