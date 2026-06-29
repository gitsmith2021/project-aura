# Developer — Architecture Decisions (ADRs)

## Purpose

A lightweight log of the significant, durable engineering decisions that shape the platform, with the rationale captured at the time. These are reconstructed from the codebase and existing docs; new decisions should be appended here as ADRs going forward.

## Current State

No formal ADR process existed previously; the decisions below are **recovered from verified evidence** in the repo. Future decisions follow the template at the end.

## Implementation — decision log

### ADR-001 — Supabase + Postgres + RLS as the backend
**Decision:** Use Supabase managed Postgres with Row-Level Security as the primary tenant-isolation mechanism.
**Why:** Multi-tenant SaaS with strong, DB-enforced isolation; auth/storage/realtime in one platform; India hosting.
**Evidence:** `src/utils/supabase/*`, `rls-policy-map.md`, RLS InitPlan migration.

### ADR-002 — Next.js App Router + Server Actions returning `Result<T>`
**Decision:** Business logic lives in Server Actions returning discriminated-union `Result<T>`; Server Components by default.
**Why:** Co-locate logic with the framework, avoid a separate API tier, make error handling explicit.
**Evidence:** all `src/actions/*`.

### ADR-003 — Slug→UUID rewrite in edge middleware
**Decision:** Browser URLs carry human slugs (`/institutions/<slug>/…`); middleware rewrites to the UUID so pages receive `params.id`.
**Why:** Friendly URLs without changing page code; enforce portal fencing centrally.
**Evidence:** `src/utils/supabase/middleware.ts`, `src/proxy.ts`.

### ADR-004 — Scheduler as a separate Python/OR-Tools service
**Decision:** Timetable optimization runs in a standalone stateless Python service on Railway, called via `callScheduler()`.
**Why:** OR-Tools is Python; isolation means a scheduler outage loses no data and the app degrades to manual scheduling.
**Evidence:** `aura-scheduler-engine/`, `src/lib/scheduler.ts`, `DISASTER_RECOVERY.md`.

### ADR-005 — Migration baseline squash
**Decision:** Squash 133+ incremental migrations into one authoritative baseline; archive the originals; new changes are appended.
**Why:** The schema must replay from zero in CI; foundational tables had been created by manual SQL and weren't reproducible.
**Evidence:** `supabase/migrations/00000000000000_baseline.sql`, `supabase/migrations_archive/`, `ci-cd.md`.

### ADR-006 — AI = Claude generative + full-text RAG (embeddings deferred)
**Decision:** Use `claude-opus-4-8` for summaries and a RAG assistant grounded in **Postgres full-text** search; defer vector embeddings.
**Why:** Ship useful AI without the complexity of an embeddings pipeline yet; gate by role and token caps to bound cost.
**Evidence:** `src/actions/knowledgeAI.ts` (explicitly defers embeddings).

### ADR-007 — Aura Core (Nine Services) + future monorepo, extracted opportunistically
**Decision:** Treat auth/comms/audit/docs/flow/insights/mobile/AI/vision as product-agnostic "Aura Core" services; extract into `@aura/*` packages incrementally without blocking Campus.
**Why:** Reuse across future products (Build/Field/Vision) without a big-bang refactor.
**Evidence:** `AURA_CORE/AURA_CORE_ARCHITECTURE.md`, `AURA/AURA_ECOSYSTEM_VISION.md`.

### ADR-008 — CI gates + protected `main`; migrations not auto-applied
**Decision:** Type-check/lint/unit + from-zero migration replay are required on `main`; schema is applied to production intentionally, not by CI.
**Why:** "Green locally = green in CI"; prevent broken migrations reaching the remote DB; keep schema changes deliberate.
**Evidence:** `.github/workflows/ci.yml`, branch protection, `ci-cd.md`.

## Future Roadmap

- Adopt this file as the running ADR log; one ADR per significant decision.

### ADR template
```
### ADR-NNN — <title>
Decision: <what was decided>
Why: <rationale / alternatives rejected>
Status: proposed | accepted | superseded by ADR-XXX
Evidence: <files/docs>
Date:
```

## Related Documents

- [Architecture Overview](../architecture/Architecture Overview.md) · [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md) · [ci-cd.md](../ci-cd.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
