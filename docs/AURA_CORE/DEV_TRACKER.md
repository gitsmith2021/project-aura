# Development Tracker — Aura Core

> Tracks **Aura Core Foundation** capabilities (CF-1…CF-5) and, later, the
> extraction of the 9 `@aura/*` services. See [AURA_CORE_FOUNDATION.md](AURA_CORE_FOUNDATION.md)
> for the capability specs and [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md)
> for the service architecture. **Last updated:** 2026-06-25

## Status Summary

| Area | Status |
|--------|--------|
| Planned | 5 (CF-1…CF-5) |
| In Progress | 0 |
| Completed | 0 |
| Deferred | 0 |

---

## Planned

| CF | Capability | Priority | Maps to Core service |
|----|-----------|----------|----------------------|
| CF-1 | App Configuration Center | 🔴 P1 | new `@aura/config` |
| CF-2 | Data Explorer | 🔴 P1 | Aura Insights |
| CF-3 | Platform Operations Center | 🟠 P2 | Aura Insights + ops telemetry |
| CF-4 | Audit & Activity Center | 🟠 P2 | Aura Audit |
| CF-5 | Feature Management (architecture only) | 🟢 P3 | Aura Identity + billing |

---

## In Progress

- _none_

---

## Completed

- _none_

---

## Deferred

- **CF-5 runtime enforcement** — feature-flag *runtime gating / middleware
  enforcement* is intentionally deferred; CF-5 defines architecture only.

---

## Notes

- Aura Core Foundation is a **separate platform stream**, not an Aura Campus phase.
  It does **not** gate or change the Campus v1.0 release.
- Capabilities are built **inside the Campus repo first**, designed product-agnostic
  so Build/Field/Vision reuse them unchanged (apply the reuse test in
  [AURA_CORE_FOUNDATION.md](AURA_CORE_FOUNDATION.md) §2).
- Cross-reference: Campus roadmap pointer section in
  [../AURA_CAMPUS/AURA_ROADMAP.md](../AURA_CAMPUS/AURA_ROADMAP.md).
