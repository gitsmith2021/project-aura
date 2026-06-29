# Company — Objectives

## Purpose

Translate the [Vision](Vision.md) and [Mission](Mission.md) into objectives that guide near-term decisions.

## Current State

The strategic sequencing is recorded in [AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md). Specific dated/numeric targets are strategy decisions and, where not stated in the repo, are marked for verification.

## Implementation

### Strategic objectives (verified direction)
1. **Campus first.** Make Aura Campus a confident, production-grade deployment; win paying institutions; establish the reference client. *Stated milestone in the ecosystem doc: "get to the first 10 paying institutions before starting Build."*
2. **Extract Aura Platform.** Graduate Campus's generic capabilities (Identity, Connect, Audit, …) into product-agnostic `@aura/*` packages — opportunistically, without blocking feature work.
3. **Build second, Field third.** Launch new verticals on top of the hardened platform, reusing Vision/GPS/asset primitives.
4. **Vision compounds throughout.** Every product that feeds Aura Vision increases the long-term moat.

### Engineering objectives (verified, in-flight)
- Keep `main` always-deployable behind required CI gates; zero lint errors on new code.
- Maintain reproducible schema (baseline + new migrations) and tested RLS isolation.
- Close the open production-readiness items: PITR verification, secret hygiene (the `NEXT_PUBLIC_RAZORPAY_KEY_SECRET` finding), uptime monitoring, error monitoring, and promoting the e2e gate. See [Production Checklist](../operations/Production Checklist.md).

### Quantitative targets
`TODO — Requires Manual Verification` — revenue, institution-count, and timeline targets beyond the "first 10 institutions" milestone are not fixed in the repository; see `AURA/AURA_5_YEAR_STRATEGY.md` and `AURA_EXECUTIVE/`.

## Future Roadmap

- Set and track measurable OKRs per quarter once the first institutions are live.

## Related Documents

- [Vision](Vision.md) · [Mission](Mission.md) · [AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md) · `AURA_EXECUTIVE/` · [Production Checklist](../operations/Production Checklist.md)

## Last Updated

2026-06-29

## Owner

Founder & Leadership
