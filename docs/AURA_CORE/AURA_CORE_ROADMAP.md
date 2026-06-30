# Aura Core — Roadmap

> Sequencing for building the first reusable platform capabilities and, later,
> extracting shared services out of Aura Campus into the platform.
>
> **Two layers, one platform:**
> - **Capabilities** (admin-facing surfaces) → [AURA_CORE_FOUNDATION.md](AURA_CORE_FOUNDATION.md) — **active planning**
> - **Services** (the 9 `@aura/*` backend packages) → [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md)
>
> **Status:** Planning. Aura Campus remains the only product in active *code*
> development; Core Foundation is a parallel **planning** stream and does not
> change the Campus v1.0 scope. **Last updated:** 2026-06-30

---

## Stream 1 — Aura Core Foundation (capabilities CF-1…CF-5)

> Full specs in [AURA_CORE_FOUNDATION.md](AURA_CORE_FOUNDATION.md). Tracked in
> [DEV_TRACKER.md](DEV_TRACKER.md).

```
P1  ── CF-1  App Configuration Center      → new @aura/config
       CF-2  Data Explorer                 → Aura Insights
       CF-3  Aura Intelligence             → Aura Insights (on top of CF-2)
P2  ── CF-4  Audit & Activity Center        → Aura Audit
       CF-6  Platform Operations Center     → Aura Insights + ops telemetry
P3  ── CF-5  Feature Management (arch only)  → Aura Identity + billing
```

> **CF-3 was reassigned to Aura Intelligence (2026-06-26).** The former Platform
> Operations Center is renumbered **CF-6**.

| CF | Capability | Priority | Status |
|----|-----------|----------|--------|
| CF-1 | App Configuration Center | 🔴 P1 | ✅ v1 — engine + 17-category seed + Configuration Center UI (migration `20260712000000`) |
| CF-2 | Data Explorer | 🔴 P1 | ✅ v1 — Visual Builder + Query Model + PostgREST compiler + saved views + exports (migration `20260713000000`) |
| CF-3 | **Aura Intelligence** | 🔴 P1 | ✅ **v2 + CF-3.1 COMPLETE** — general executive engine (slot extraction → semantic/**vector** resolution → query planner → CF-2 → response strategy → composer) **+ CF-3.1 quality milestone** (evaluation suite in CI · confidence · clarification · Developer Lab · metrics/analytics · semantic catalog manager · response pattern library · observability). 783 tests; eval baseline 100%. [CF3_AURA_INTELLIGENCE.md](CF3_AURA_INTELLIGENCE.md); migrations `…14000000`–`…26000000` |
| CF-4 | Audit & Activity Center | 🟠 P2 | 🔲 Planned |
| CF-5 | Feature Management | 🟢 P3 | 🔲 Planned (architecture only; runtime deferred) |
| CF-6 | Platform Operations Center (was CF-3) | 🟠 P2 | 🔲 Planned |

---

## Stream 2 — Service extraction (the 9 `@aura/*` packages)

> Full architecture + migration path in [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md) §5.
> Opportunistic, non-disruptive; begins in earnest before Aura Build.

```
Identity · Connect  (🔴 first)  →  Audit · Docs · Flow  (🟡 second)
   →  Insights · Mobile  (🟢 third)  →  AI · Vision  (⚪ future)
```

> CF capabilities and service extraction reinforce each other: e.g. CF-1 seeds
> `@aura/config`, CF-2/CF-3 exercise `Aura Insights`, CF-4 exercises `Aura Audit`.

---

*Aura Core is the shared platform behind the Aura ecosystem. Capabilities are
built in Campus first, then generalized. Revisit before starting Aura Build.*
