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
> change the Campus v1.0 scope. **Last updated:** 2026-06-25

---

## Stream 1 — Aura Core Foundation (capabilities CF-1…CF-5)

> Full specs in [AURA_CORE_FOUNDATION.md](AURA_CORE_FOUNDATION.md). Tracked in
> [DEV_TRACKER.md](DEV_TRACKER.md).

```
P1  ── CF-1  App Configuration Center      → new @aura/config
       CF-2  Data Explorer                 → Aura Insights
P2  ── CF-3  Platform Operations Center     → Aura Insights + ops telemetry
       CF-4  Audit & Activity Center        → Aura Audit
P3  ── CF-5  Feature Management (arch only)  → Aura Identity + billing
```

| CF | Capability | Priority | Status |
|----|-----------|----------|--------|
| CF-1 | App Configuration Center | 🔴 P1 | 🔲 Planned |
| CF-2 | Data Explorer | 🔴 P1 | 🔲 Planned |
| CF-3 | Platform Operations Center | 🟠 P2 | 🔲 Planned |
| CF-4 | Audit & Activity Center | 🟠 P2 | 🔲 Planned |
| CF-5 | Feature Management | 🟢 P3 | 🔲 Planned (architecture only; runtime deferred) |

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
