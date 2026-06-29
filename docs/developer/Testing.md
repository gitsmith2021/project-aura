# Developer — Testing

## Purpose

How the platform is tested and what a contributor must run/keep green. The deeper conventions guide is [docs/testing-guide.md](../testing-guide.md).

## Current State

Two layers: **Vitest** unit tests (hard CI gate) and a **Playwright** authenticated end-to-end suite (currently secret-gated / skip-green until a dedicated test DB exists). Verified in [ci-cd.md](../ci-cd.md).

## Implementation

### Unit tests — Vitest
- Run: `npm test` (`vitest run`) / `npm run test:watch`.
- Config: `vitest.config.ts` (forks pool, pinned for runner reliability).
- **Hard gate:** part of the Definition of Done and the CI `quality` job.

### End-to-end — Playwright
- Projects (`playwright.config.*`): `public` (unauthenticated) and `authed` (authenticated suite).
- Run: `npm run test:e2e` (all) · `npm run test:e2e:public` · `npm run test:e2e:setup`.
- Seed first: `npm run seed:e2e` — idempotent, service-role seeder → `.auth/seed-manifest.json`, creating namespaced `@e2e.aura.test` / `e2e-college-*` tenants.
- The `authed` project runs against the **built** app (`npm run start`) and covers:
  - **setup** — per-role `storageState`,
  - **route-crawl** — all ~230 routes × owner role,
  - **critical flows** (5),
  - **cross-role denial** (27),
  - **institution isolation** (RLS / IDOR).

### CI behaviour
- `quality` (type-check · lint · unit) and `migrations` (from-zero replay) are **required** on `main`.
- `e2e` is **secret-gated**: it skips green until the Supabase secrets + repo variable `RUN_E2E=true` are set, so it never blocks a merge prematurely. Tradeoff: it currently writes seed data to the shared production project (documented in [ci-cd.md](../ci-cd.md)).

### What to test for a change
- New server action → unit test the logic branches (success + failure `Result`s) where practical.
- New route/page → it is covered by the route-crawl; add a critical-flow test if it's a key journey.
- New tenant-scoped table/policy → ensure the isolation suite still passes (no cross-tenant leakage).

## Future Roadmap

- Run e2e against an ephemeral/branch Supabase DB, then promote `Authenticated e2e` to a required check.
- Expand unit coverage of finance/AI engines.

## Related Documents

- [testing-guide.md](../testing-guide.md) · [ci-cd.md](../ci-cd.md) · [Release Checklist](../operations/Release Checklist.md) · [rls-policy-map.md](../rls-policy-map.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
