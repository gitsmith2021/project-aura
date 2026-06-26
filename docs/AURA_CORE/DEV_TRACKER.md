# Development Tracker — Aura Core

> Tracks **Aura Core Foundation** capabilities (CF-1…CF-5) and, later, the
> extraction of the 9 `@aura/*` services. See [AURA_CORE_FOUNDATION.md](AURA_CORE_FOUNDATION.md)
> for the capability specs and [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md)
> for the service architecture. **Last updated:** 2026-06-26

## Status Summary

| Area | Status |
|--------|--------|
| Planned | 3 (CF-3…CF-5) |
| In Progress | 0 |
| Completed | 2 (CF-1 v1, CF-2 v1) |
| Deferred | 0 |

---

## Planned

| CF | Capability | Priority | Maps to Core service |
|----|-----------|----------|----------------------|
| CF-3 | Platform Operations Center | 🟠 P2 | Aura Insights + ops telemetry |
| CF-4 | Audit & Activity Center | 🟠 P2 | Aura Audit |
| CF-5 | Feature Management (architecture only) | 🟢 P3 | Aura Identity + billing |

---

## In Progress

- _none_

---

## Completed

- **CF-2 — Data Explorer (v1, Visual Builder)** — an Institutional Intelligence
  Platform, **not** a SQL tool ([CF2_DATA_EXPLORER.md](CF2_DATA_EXPLORER.md)).
  `Visual Builder → Query Model (JSON) → PostgREST compiler → Results`. Migration
  `20260713000000` (`data_explorer_entities` registry + 5-entity Campus seed +
  `data_explorer_reports` saved views, RLS). Pure engine `src/lib/dataExplorer.ts`
  (validation · nested AND/OR PostgREST compiler · in-process group/aggregate ·
  CSV; **19 unit tests**). Actions `src/actions/dataExplorer.ts` (run as the user →
  read-only + RLS-scoped; save/load/favourite views, audited). UI
  `src/components/data-explorer/DataExplorer.tsx` at `/data-explorer` (entity →
  columns → filters (match ALL/ANY) → group-by → aggregations → sort → date range →
  results grid → CSV/Excel/PDF export → saved views) + sidebar nav.
  **Migration `20260713000000` applied to the remote DB (2026-06-26, via SQL editor)
  → `/data-explorer` live.** Deferred to
  future (designed-for, not built): Advanced SQL mode + Natural-Language queries;
  nested AND/OR *UI* (engine already supports nesting); per-entity views for prettier
  label joins / exact large-scale aggregation.

- **CF-1 — App Configuration Center (v1, engine)** — product-agnostic config engine
  (the `@aura/config` seam): `app_setting_definitions` (registry) + `app_setting_values`
  (institution-scoped) with RLS + a 47-setting seed across all 17 categories; pure
  resolver `src/lib/config.ts` (precedence: institution value → default; +12 unit tests);
  `src/actions/config.ts` (list/set/reset, INST_ADMIN+ gated, audited); the `/settings`
  page rebuilt as a registry-driven Configuration Center (category sidebar + search +
  typed controls + reset-to-default), replacing the former mock tabs.
  **Migration `20260712000000` applied to the remote DB (2026-06-26, via SQL editor).**

  **Wiring (2026-06-26):** added the consumption layer (`src/lib/configServer.ts` —
  service-role, request-cached `getInstitutionSettings` + `isSettingEnabled` /
  `getNumberSetting`, fail-open) and an honesty layer (`ENFORCED_KEYS` / `DEFERRED_KEYS`
  in `lib/config.ts` → per-setting **Live / Planned / Advisory** badge in the UI).
  **11 settings now genuinely enforce:** finance.online_payments, integrations.razorpay_enabled,
  admissions.online_enabled, ai.summaries_enabled, ai.assistant_enabled,
  integrations.scheduler_engine, faculty_portal.marks_entry, student_portal.show_fees/
  show_attendance/show_results, parent_portal.enabled. Deferred-infra toggles
  (SMS/WhatsApp/push/2FA/session-timeout) are badged **Planned**. Remaining ~25 are badged
  **Advisory** (stored + audited, not yet wired) — tracked backlog. Settings → General was
  reworked to real-only (profile + localization persist; behaviour moved to App Config).

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
