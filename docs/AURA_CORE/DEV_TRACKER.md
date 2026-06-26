# Development Tracker — Aura Core

> Tracks **Aura Core Foundation** capabilities (CF-1…CF-5) and, later, the
> extraction of the 9 `@aura/*` services. See [AURA_CORE_FOUNDATION.md](AURA_CORE_FOUNDATION.md)
> for the capability specs and [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md)
> for the service architecture. **Last updated:** 2026-06-25

## Status Summary

| Area | Status |
|--------|--------|
| Planned | 4 (CF-2…CF-5) |
| In Progress | 0 |
| Completed | 1 (CF-1 v1 — engine) |
| Deferred | 0 |

---

## Planned

| CF | Capability | Priority | Maps to Core service |
|----|-----------|----------|----------------------|
| CF-2 | Data Explorer | 🔴 P1 | Aura Insights |
| CF-3 | Platform Operations Center | 🟠 P2 | Aura Insights + ops telemetry |
| CF-4 | Audit & Activity Center | 🟠 P2 | Aura Audit |
| CF-5 | Feature Management (architecture only) | 🟢 P3 | Aura Identity + billing |

---

## In Progress

- _none_

---

## Completed

- **CF-1 — App Configuration Center (v1, engine)** — product-agnostic config engine
  (the `@aura/config` seam): `app_setting_definitions` (registry) + `app_setting_values`
  (institution-scoped) with RLS + a 47-setting seed across all 17 categories; pure
  resolver `src/lib/config.ts` (precedence: institution value → default; +12 unit tests);
  `src/actions/config.ts` (list/set/reset, INST_ADMIN+ gated, audited); the `/settings`
  page rebuilt as a registry-driven Configuration Center (category sidebar + search +
  typed controls + reset-to-default), replacing the former mock tabs.
  **Migration `20260712000000` must be applied to the remote DB.** Wiring individual
  settings to runtime behaviour is the planned follow-up (seed is inert by decision).

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
