# 🧱 AURA CORE FOUNDATION

> **Type:** Product architecture & development roadmap. **No implementation.**
>
> This document defines the **first set of reusable platform capabilities** of
> Aura Core. They are developed *initially inside the Aura Campus repository*,
> but are intentionally designed to graduate into the shared platform behind the
> entire Aura ecosystem — **Campus, Build, Field, Vision, and future products.**
>
> **This is NOT an Aura Campus phase.** It is tracked as a separate platform
> stream (CF-1…CF-5) and must not change the Aura Campus v1.0 release scope.
>
> **Companion docs:** [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md) (the 9
> Core *services* + monorepo migration) · [AURA_CORE_ROADMAP.md](AURA_CORE_ROADMAP.md)
> (sequencing) · [DEV_TRACKER.md](DEV_TRACKER.md) (status). · **Last updated:** 2026-06-25

---

## 1. Purpose

Aura Core Foundation represents the first reusable platform services that will
become the shared platform behind the Aura ecosystem.

Where [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md) defines the **backend
service decomposition** (the 9 `@aura/*` services — Identity, Connect, Audit,
Docs, Flow, Insights, Mobile, AI, Vision), this document defines the first
**admin-facing capability surfaces** that sit on top of those services. The two
are complementary — every capability below maps onto one or more of the 9
services (see §3), so the platform tells one coherent story.

**Design rule for every capability here:** design with reusability in mind. No
business logic should be Campus-specific unless absolutely necessary. When a
design decision is made, ask: **"Can Aura Build or Aura Field reuse this?"** —
if no, reconsider the design.

---

## 2. Architecture Principles

Every Core Foundation capability must satisfy all eight:

| Principle | Means |
|-----------|-------|
| **Product-independent** | No `student` / `hostel` / `site` / `technician` nouns in the capability's core. Deals in tenants, users, roles, settings, records, events. |
| **Institution-independent** | Works for any tenant type (campus / build-project / field-org), not just a college. |
| **Reusable** | Built once in Campus; importable unchanged by Build/Field/Vision. |
| **API-first** | A typed interface (`Result<T>` discriminated unions) precedes any UI. UI is one consumer of the API, not the source of truth. |
| **Secure by default** | RLS-on, deny-by-default, least-privilege; no capability ships without an access model. |
| **Audit-friendly** | Every state-changing action is recordable via Aura Audit. |
| **Multi-tenant aware** | Tenant context is a first-class input; global vs. tenant-scoped is explicit. |
| **Configuration over hardcoding** | Behaviour is data, not code. (CF-1 is the literal embodiment of this principle.) |

> **The reuse test (apply on every decision):** *"Can Aura Build or Aura Field
> reuse this exact capability?"* If the answer is no, the design has leaked
> product-specific logic — pull it back to generic.

---

## 3. Capability → Core-Service Map

Each CF capability is a surface over the product-agnostic services in
[AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md). This keeps the Foundation
coherent with the service architecture instead of inventing a parallel one.

| CF | Capability | Primary Core service | New service seam | Campus precedent to generalize |
|----|-----------|----------------------|------------------|-------------------------------|
| **CF-1** | App Configuration Center | (new) **`@aura/config`** | Settings registry + resolver | Settings UI, locale (Arch A6), `isFeatureEnabled` |
| **CF-2** | Data Explorer | **Aura Insights** | Query builder over Insights | `actions/*` reports, `lib/excelXml.ts`, SSR/NIRF/AISHE exports |
| **CF-3** | Platform Operations Center | **Aura Insights** + ops telemetry | Health/telemetry aggregator | Phase 7D `/admin/health`, scheduler `/health`, `scheduler_error_logs` |
| **CF-4** | Audit & Activity Center | **Aura Audit** | Activity surface over `audit_logs` | `lib/auditLog.ts`, `audit_logs` (Arch A8), login events |
| **CF-5** | Feature Management | **Aura Identity** + billing | Flag definition & targeting model | `subscription_plans` (7E), `isFeatureEnabled` |

---

## 4. The Capabilities

> Each capability below is **planning only** — audience, purpose, requirements,
> the Core mapping, reuse notes, and the Campus-specific traps to avoid. No
> schema, no code.

### CF-1 — App Configuration Center · **P1**

**Audience:** Super Admin · Chairman · Principal.

**Purpose:** A centralized application configuration experience where
administrators manage platform behaviour **without changing code** — the literal
embodiment of *configuration over hardcoding*.

**Requirements:**
- Category-based settings · search across all settings
- Global settings now · institution-specific overrides (future)
- Field types: toggle switches · dropdowns · number fields · text inputs
- Default values · per-setting descriptions

**Suggested categories:** Institution · Admissions · Academics · Attendance ·
Examination · Finance · HR · Student Portal · Parent Portal · Faculty Portal ·
Knowledge Hub · AI Features · Notifications · Integrations · Security · Mobile ·
Feature Flags.

**Core mapping:** introduces **`@aura/config`** — a generic settings **registry**
(key, type, default, description, scope, category) + a **resolver**
(`getSetting(key, tenantId?)` → value with global→tenant override precedence).
The *categories* are product-supplied metadata, not Core logic.

**Reusability:** Build/Field register their own categories and keys against the
same registry. The resolver, override precedence, search, and UI shell are 100%
generic.

**Campus-specific traps to avoid:** category *names* (e.g. "Admissions") are
Campus-registered config, **not** hardcoded Core enums. Core knows "a category",
not "the Admissions category."

**Goal:** move configurable behaviour out of application code.

---

### CF-2 — Data Explorer · **P1**  ·  full spec → [CF2_DATA_EXPLORER.md](CF2_DATA_EXPLORER.md)

> **Direction (2026-06-26):** an **Institutional Intelligence Platform** (Power BI /
> Salesforce Reports style), **not** a SQL tool. The **Visual Builder is the primary
> (and only v1) experience.** Everything compiles to one internal **Query Model
> (JSON)** that future Natural-Language and Advanced-SQL modes also produce.

**Audience:** Chairman · Principal · IQAC · Administrator · HOD · power users — **non-developers**.

**Purpose:** build reports and explore institutional data **without writing SQL**.

**v1 features:** entity picker · column selection · nested **AND/OR** filters · date
ranges · sorting · **group by** + **aggregations** (count/sum/avg/min/max) · results
grid · **saved views** + favourites · export (CSV / Excel / PDF) · charts-ready · role-aware (RLS).

**Architecture:** `Visual Builder → Query Model (JSON) → PostgREST/Supabase compiler → Results`.
The Query Model is the durable abstraction (saved views, charts, exports, and future
AI queries all build on it). Execution runs **as the user** — read-only by nature,
RLS-respecting, no SQL-injection surface.

**Core mapping:** a surface over **Aura Insights**; exports reuse the Excel helper;
runs/exports audited (A8 → feeds CF-4).

**Reusability:** operates over a registered **entity allow-list** (`data_explorer_entities`),
never assuming `students`/`fees`. Build/Field register their own entities.

**Deferred (NOT v1):** **Advanced SQL mode** — SUPER_ADMIN only, dedicated read-only
PG role, statement timeout, row limit, DDL/DML blocked, SQL validated + every query
logged. A specialist platform capability, never the default. **Natural Language** →
translates to the same Query Model. Both are designed-for extension points now.

**Goal:** an intelligence platform any administrator can use — reporting power without SQL.

---

### CF-3 — Platform Operations Center · **P2**

**Audience:** Platform Administrators.

**Purpose:** Monitor the operational health of the Aura platform from one place.

**Suggested widgets:** Scheduler Engine health · Railway status · Vercel status ·
Supabase status · background jobs · queue monitoring · failed jobs · notification
queue · API usage · storage usage · database health · error logs · active users.

**Core mapping:** an aggregation surface combining **Aura Insights** (metrics) with
ops telemetry. Generalizes Campus's Phase 7D `/admin/health` (scheduler ping,
payment-failure scan, DB counts) and the scheduler `/health` + `scheduler_error_logs`
into a **product-agnostic health board** driven by registered health-check providers.

**Reusability:** each product registers its own **health-check providers** and
**job/queue sources**; the dashboard shell, status rollups, and alerting are generic.
Aura Vision/Field add their own providers (devices, sync queues) without UI changes.

**Campus-specific traps to avoid:** "Scheduler Engine" is a *registered provider*,
not a hardcoded widget. Core renders "providers + their status", not a fixed list.

**Goal:** a single operational dashboard for Aura.

---

### CF-4 — Audit & Activity Center · **P2**

**Purpose:** Every important action inside Aura should be traceable.

**Track:** login history · configuration changes · permission changes · data
exports · failed logins · security events · scheduler executions · AI usage ·
administrative actions.

**Core mapping:** a surface over **Aura Audit** (`record()` / `query()` /
`verifyIntegrity()`), reading the existing append-only `audit_logs` (Arch A8) plus
auth/login events. CF-1 config changes, CF-2 exports, and CF-5 flag changes all
emit audit entries that surface here — the capabilities reinforce each other.

**Reusability:** Audit deals in generic `{ actorId, action, resourceType,
resourceId, metadata }`; the activity center renders any product's entries. No
Campus domain knowledge required.

**Campus-specific traps to avoid:** `resourceType` is a free string the product
supplies — Core never enumerates Campus resource types. Immutability of
`audit_logs` (no UPDATE/DELETE) is preserved.

**Goal:** enterprise-grade transparency.

---

### CF-5 — Feature Management · **P3**

**Purpose:** Prepare Aura for future feature-flag management. **Architecture only;
runtime enforcement is intentionally deferred.**

**Future targeting dimensions:** by institution · by subscription plan · by user
role · by environment · by beta program.

**Core mapping:** a flag **definition & targeting model** spanning **Aura Identity**
(role/tenant context) and billing (`subscription_plans`, 7E). Generalizes Campus's
page-level `isFeatureEnabled` (default-allow today) into a multi-dimensional,
product-agnostic targeting model.

**Scope of this phase:** define the architecture only — the data model, the
targeting dimensions, and the resolution precedence (env → plan → institution →
role → beta). **Do not** build runtime enforcement or middleware gating now;
that is a deliberate later step (and aligns with the deferred middleware-gating
note in Campus Phase 7E).

**Reusability:** every Aura product gates features through the same model; targeting
dimensions are generic (tenant, plan, role, environment, cohort).

**Campus-specific traps to avoid:** flags are keyed by generic strings; the model
must not assume Campus plan names or roles — those are *values*, not schema.

**Goal:** a future-ready, product-agnostic feature-flag foundation.

---

## 5. Priorities & Sequencing

> Independent tracks. Sequencing favours the capabilities that most reduce
> code-coupling and manual work first.

```
P1  ── CF-1  App Configuration Center   (config-over-hardcoding foundation)
       CF-2  Data Explorer              (reduces custom report dev)
P2  ── CF-3  Platform Operations Center (single ops dashboard)
       CF-4  Audit & Activity Center    (enterprise transparency)
P3  ── CF-5  Feature Management         (architecture only; runtime deferred)
```

| CF | Capability | Priority | Status |
|----|-----------|----------|--------|
| CF-1 | App Configuration Center | 🔴 P1 | ✅ v1 (engine + seed + UI) — migration `20260712000000` |
| CF-2 | Data Explorer | 🔴 P1 | 🔲 Planned |
| CF-3 | Platform Operations Center | 🟠 P2 | 🔲 Planned |
| CF-4 | Audit & Activity Center | 🟠 P2 | 🔲 Planned |
| CF-5 | Feature Management (architecture only) | 🟢 P3 | 🔲 Planned |

> **Gating note:** Aura Core Foundation does **not** gate or alter the Aura Campus
> v1.0 release. It is a parallel platform stream. v1.0 ships on the Campus track.

---

## 6. Long-Term Vision

```
        Aura Campus
            ↓        (first application — proves the patterns)
   Aura Core Foundation
            ↓        (CF-1…CF-5 — first reusable capabilities, built in Campus)
    Aura Core Platform
            ↓        (the 9 @aura/* services extracted into a monorepo — see Architecture doc)
       Aura Ecosystem
                     (Campus · Build · Field · Vision · future products, all on shared Core)
```

Aura Campus is the first application built on the Aura platform. Aura Core
Foundation is the **beginning of the shared platform** that will eventually
support every Aura product. Every capability created here is designed with that
future architecture in mind — and validated against the reuse test in §2.

---

## 7. Boundaries (what this document is and isn't)

- ✅ **Is:** a product-architecture & roadmap planning doc for CF-1…CF-5.
- ✅ **Is:** coherent with [AURA_CORE_ARCHITECTURE.md](AURA_CORE_ARCHITECTURE.md) (capabilities map onto the 9 services).
- ❌ **Is not:** an Aura Campus phase (tracked separately; no v1.0 scope change).
- ❌ **Is not:** implementation — no schema, no code, no migrations.
- ❌ **Is not:** the start of Aura Build / Field / Vision (those remain placeholder-planning).

*Aura Core Foundation — the first reusable platform capabilities of Aura Core.
Build once in Campus; reuse across the ecosystem. Revisit before extracting the
`@aura/*` packages (Architecture doc §5).*
