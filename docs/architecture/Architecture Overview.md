# Architecture Overview

> Production-grade reference for how the Aura platform is built today. This document describes **only what exists in the repository and verified infrastructure**. Anything that cannot be verified from the codebase is explicitly marked `TODO — Requires Manual Verification`.

## Purpose

Give any engineer, reviewer, or operator a single, accurate mental model of the Aura platform: the frontend, backend, authentication, multi-tenant data isolation, AI layer, the query model, the shared "Aura Core" services concept, the current package layout, and the planned monorepo extraction.

## Current State

Aura today is a **single Next.js 16 application** (the Aura Campus product) backed by Supabase, with two companion sub-projects living in the same Git repository:

| Component | Path | Tech | Status |
|---|---|---|---|
| Web app (Aura Campus) | `src/` | Next.js 16 (App Router), React 19, TypeScript (strict) | **Production** |
| Scheduler engine | `aura-scheduler-engine/` | Python + Google OR-Tools (FastAPI service) | **Production** (Railway) |
| Mobile shell | `aura-mobile/` | Expo / React Native | In repo; see `docs/AURA_CORE/AURA_MOBILE.md` |

The much larger "Aura ecosystem" (Build, Field, Vision) is **vision/planning only** — see [AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md). Only Aura Campus is in active development.

## Implementation

### Overall platform architecture

```
                Browser (admin / staff / student / parent / alumni portals)
                                     │
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │  Vercel — Next.js 16 App Router (Aura Campus)             │
        │  • Server Components + Server Actions (src/actions/*)     │
        │  • Edge middleware: src/proxy.ts → updateSession()        │
        │  • API routes: src/app/api/* (webhooks, health, mobile)  │
        └───────────────┬───────────────────────┬─────────────────┘
                        │                         │
       (cookie session, │              (X-API-Key)│              (Claude API)
        RLS-scoped)     ▼                         ▼                    ▼
        ┌───────────────────────────┐   ┌──────────────────┐  ┌────────────────┐
        │ Supabase (Postgres + Auth │   │ Scheduler engine │  │ Anthropic API  │
        │ + Storage + Realtime +    │   │ (Python OR-Tools │  │ (claude-opus-  │
        │ Row-Level Security)       │   │ on Railway)      │  │ 4-8)           │
        │ project: nsaheksysxin…    │   └──────────────────┘  └────────────────┘
        └───────────────────────────┘
                ▲             ▲
   Razorpay ────┘             └──── Resend (email) · SMS · WhatsApp (Aura Connect seams)
   (payments + webhook)
```

### Frontend

- **Framework:** Next.js `16.2.4` (App Router) with React `19.2.4`, TypeScript `strict`. See [package.json](../../package.json), [tsconfig.json](../../tsconfig.json).
- **Rendering:** Server Components by default; client components (`"use client"`) where interactivity is required. The app router lives in [src/app/](../../src/app/).
- **Routing tiers (verified in [src/utils/supabase/middleware.ts](../../src/utils/supabase/middleware.ts)):**
  - Admin tier: `/`, `/institutions/[id]/*`, `/admin/*` (SUPER_ADMIN only for `/admin`).
  - Self-service portals: `/staff-portal`, `/student-portal`, `/parent-portal`, `/alumni-portal`.
  - Public: `/`, `/login`, `/privacy-policy`, `/forgot-password`, `/admissions/*`.
- **Styling:** Tailwind CSS v4 with a semantic design-token system in [src/app/globals.css](../../src/app/globals.css) (class-based dark mode via `@custom-variant dark`). See [Colours](../branding/Colours.md).
- **Fonts:** Geist Sans + Geist Mono (`next/font/google`) — see [src/app/layout.tsx](../../src/app/layout.tsx).
- **Animation:** GSAP + Lenis (landing page); Recharts for data visualisation.

### Backend

- **Primary backend is Supabase** (managed Postgres 17). The Next.js app talks to it through three client factories in [src/utils/supabase/](../../src/utils/supabase/):
  - `client.ts` — browser client (anon/publishable key).
  - `server.ts` — server-component / server-action client (cookie session).
  - `admin.ts` — service-role client (server-only; bypasses RLS — never imported into client code).
  - `middleware.ts` — `updateSession()` used by the edge middleware.
- **Business logic** is implemented as **Next.js Server Actions** in [src/actions/](../../src/actions/) (78 modules) and pure helpers in [src/lib/](../../src/lib/) (70+ modules). Examples: `feePayments.ts`, `cia.ts`, `admissionsCRM.ts`, `knowledgeAI.ts`.
- **Scheduler microservice:** the AI timetable generator is a separate Python/OR-Tools service (`aura-scheduler-engine/`) on Railway, called via `callScheduler()` in [src/lib/scheduler.ts](../../src/lib/scheduler.ts). See [Railway](../infrastructure/Railway.md).
- **API routes** ([src/app/api/](../../src/app/api/)): Razorpay webhook, NFC attendance webhook, scheduler-health probe, and parent-mobile endpoints.

### Authentication

- **Supabase Auth** (email/password) is the identity provider. Sign-up is gated; password reset via `/forgot-password`.
- **Edge middleware** ([src/proxy.ts](../../src/proxy.ts) → `updateSession`) runs on every non-static request and is responsible for:
  1. **Session refresh** via `@supabase/ssr` cookie handling.
  2. **Role resolution & caching** — on first authenticated request it resolves the user's role (querying `alumni`, `parents`, `institution_members`, then `staff`/`students`) and caches it in an `httpOnly` `aura-role` cookie (7-day max-age) plus a JS-readable `aura-role-label` cookie. Access tiers collapse `SUPER_ADMIN`/`INST_ADMIN`/`PRINCIPAL` → `admin`; `HOD`/`DEPARTMENT_HEAD` → `hod`.
  3. **Portal fencing** — students, staff, parents, and alumni are redirected to their own portal and blocked from others.
  4. **`/admin` re-validation** — the SUPER_ADMIN area re-checks the DB membership row on every request (cookie not trusted for privilege escalation).
- **Slug → UUID rewrite:** browser URLs use a human slug (`/institutions/bishop-heber-college/...`); the middleware rewrites the slug segment to the institution UUID so page code always receives `params.id` as a UUID. (This is the behaviour fixed in the sidebar nav work — see git history.)
- **Webhook/API exemptions:** `/api/razorpay-webhook`, `/api/attendance/nfc`, `/api/scheduler-health`, and `/api/parent/*` skip the cookie redirect (they authenticate via HMAC, bearer secret, or are public health probes).

### RLS strategy

- **Row-Level Security is the primary tenant-isolation mechanism.** Every tenant-scoped table is keyed by `institution_id`; policies ensure a user only reads/writes rows for institutions they belong to.
- The **anon and authenticated** roles operate under RLS; the **service-role** key (used only server-side via `admin.ts`, e.g. demo seeding, webhooks) bypasses RLS and must never reach the browser.
- An InitPlan optimisation pass wrapped `auth.uid()` / `auth.email()` calls as `(select auth.uid())` across policies (migration `supabase/migrations/20260709000000_rls_initplan_fix.sql`).
- The full policy inventory lives in [docs/rls-policy-map.md](../rls-policy-map.md).
- RLS is validated continuously by the Playwright **institution-isolation / IDOR** e2e suite (see [Testing](../developer/Testing.md)).

### Supabase architecture

- **Managed Postgres 17**, project ref `nsaheksysxinemtjcako` (verified in [middleware.ts](../../src/utils/supabase/middleware.ts) fallback + [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md)).
- Exposed schemas: `public`, `graphql_public`. Extra search path includes `extensions`.
- Auth, Storage (receipts, documents), and Realtime (e.g. the institutions dashboard subscription) are all used.
- Schema is managed as migrations in `supabase/migrations/`, with an authoritative squashed **baseline** (`00000000000000_baseline.sql`); pre-baseline files are archived in `supabase/migrations_archive/`. See [Migration Guidelines](../developer/Migration Guidelines.md).
- `supabase/config.toml` in the repo is the **local CLI dev** configuration (ports, local auth defaults). **Production project settings live in the Supabase dashboard** — `TODO — Requires Manual Verification` for any production-only setting (compute size, PITR retention, network restrictions).

### AI architecture

The AI layer is **generative + retrieval (RAG)**, implemented in [src/actions/knowledgeAI.ts](../../src/actions/knowledgeAI.ts) and [src/lib/knowledgeAI.ts](../../src/lib/knowledgeAI.ts):

- **Model:** `claude-opus-4-8` via the official `@anthropic-ai/sdk`. Configured through `ANTHROPIC_API_KEY`; if the key is absent, AI features fail closed with a clear error (they do not crash the app).
- **Capabilities (Knowledge Hub, KH-5):**
  - *AI summaries* — owner/admin generates a discovery abstract for a resource.
  - *Knowledge Assistant* — admin/HOD-gated RAG: retrieves the top matches over the **full-text** search index (`searchResources`), answers grounded in and citing those documents, and logs the exchange to `knowledge_assistant_logs`.
- **Important accuracy note:** retrieval is currently **Postgres full-text search**, *not* vector embeddings. The code explicitly defers embeddings/semantic search ("Embeddings/semantic search are a separate, deferred concern"). The "Vector Search / pgvector" item on the marketing landing page is **aspirational** — `TODO — Requires Manual Verification` before claiming pgvector is live.
- See [Anthropic](../infrastructure/Anthropic.md) and `docs/AURA_CORE/AURA_AI.md`.

### Query Model

- **Server Actions** are the primary read/write path. Convention (verified across `src/actions/*`): every action is `"use server"`, authenticates via `supabase.auth.getUser()`, and returns a **discriminated-union `Result<T>`**:

  ```typescript
  type Result<T = undefined> = T extends undefined
    ? { success: true } | { success: false; error: string }
    : { success: true; data: T } | { success: false; error: string };
  ```

- **RLS enforces authorization at the database** — actions add an explicit application-level gate before spending resources (e.g. the AI summary checks ownership/role before calling Claude), but the database remains the source of truth for access.
- **Reads** happen in server components / actions through the cookie-scoped server client; **privileged operations** (webhooks, seeding, demo reset) use the service-role admin client.
- **Realtime** is used selectively (e.g. dashboard institution changes) via `supabase.channel(...)`.
- Query performance guidance and index strategy: [docs/query-performance.md](../query-performance.md).

### Aura Core Foundation (CF-1 to CF-8)

> **Verification note:** The repository does **not** define a foundation labelled "CF-1 to CF-8." That specific numbering is `TODO — Requires Manual Verification`. What the repository *does* define ([AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md), [AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md)) is **"The Nine Aura Core Services"** — the shared, product-agnostic platform layer. The mapping below documents the verified model; if a CF-1..CF-8 scheme is later formalised, align it to these services.

| # | Aura Core service | Owns | Current Campus seam | Extraction priority |
|---|---|---|---|---|
| CF-1 | **Aura Identity** | Auth, sessions, SSO, RBAC, tenant context, user directory | `utils/supabase/*`, `actions/user.ts` | 🔴 First |
| CF-2 | **Aura Connect** | Email, SMS, WhatsApp, Push, in-app notifications | `lib/email.ts`, `lib/sms.ts`, `lib/whatsapp.ts`, `lib/notifications.ts` | 🔴 First |
| CF-3 | **Aura Audit** | Audit logs, activity tracking, tamper-evident trail | `lib/auditLog.ts`, `actions/auditLogs.ts` | 🟡 Second |
| CF-4 | **Aura Docs** | File storage, document metadata, versioning, receipts | Supabase Storage usage | 🟡 Second |
| CF-5 | **Aura Flow** | Approval engine, workflow state machines | booking/leave/concession approvals | 🟡 Second |
| CF-6 | **Aura Insights** | Reporting framework, dashboards, CSV/Excel export | `actions/reports.ts`, `lib/excelXml.ts` | 🟢 Third |
| CF-7 | **Aura Mobile** | Shared Expo/React Native shell, role-adaptive nav | `aura-mobile/` | 🟢 Third |
| CF-8 | **Aura AI** | AI assistant, knowledge search, predictive analytics | `actions/knowledgeAI.ts` (live) | ⚪ Active/Future |

> A ninth service, **Aura Vision** (CCTV / GPS / drone / image analysis), is defined in the ecosystem docs as future. **Golden rule:** a Core service must contain zero product-specific domain language (no "student", "hostel", "site"). See the full service contracts in [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md) §3.

### Package structure (current)

The repo is a single workspace (not yet a monorepo). Top-level `src/` layout:

```
src/
├── app/          Next.js App Router routes (admin, portals, api, public)
├── actions/      Server Actions — business logic (78 modules)
├── components/   React components (layout, landing, dashboard, feature UIs)
├── context/      React context providers (Theme, Institution, Sidebar)
├── hooks/        Shared client hooks
├── lib/          Pure helpers & service seams (email, sms, scheduler, AI, engines…)
├── utils/        supabase/ client factories (client, server, admin, middleware)
├── types/        Shared TypeScript types
├── diagrams/     Architecture diagrams
└── proxy.ts      Edge middleware entrypoint (Next.js 16 `proxy` convention)
```

Companion projects in the same repo: `aura-scheduler-engine/` (Python), `aura-mobile/` (Expo). Both are excluded from the web app's `tsconfig.json`. Full walkthrough: [Project Structure](../developer/Project Structure.md).

### Future monorepo extraction

The documented target ([AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md) §4–5) is a **pnpm + Turborepo monorepo**:

```
aura/
├── packages/   @aura/identity · @aura/connect · @aura/audit · @aura/docs ·
│               @aura/flow · @aura/insights · @aura/ui · @aura/types · (@aura/ai, @aura/vision future)
├── apps/       campus/ · build/ · field/ · mobile/   (products consume packages, never each other)
└── services/   scheduler-engine/                       (current aura-scheduler-engine/)
```

Extraction is **opportunistic and incremental** (Stage 1 establish workspace → Stage 2 `@aura/types` → Stage 3 `@aura/connect` → Stage 4 `@aura/identity` → …). Feature work on Campus is not blocked for the refactor. **Status: planned — not yet started.**

## Future Roadmap

- Establish the pnpm/Turborepo workspace and move the Next.js app to `apps/campus/` (Stage 1).
- Extract `@aura/types` and `@aura/connect` first (cleanest seams).
- Promote AI retrieval from full-text to **pgvector embeddings** (then the landing-page "Vector Search" claim becomes verifiably true).
- Harden e2e to run against an ephemeral/branch Supabase DB instead of the shared production project.

## Related Documents

- [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md) — Core service contracts & monorepo plan
- [AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md) — Multi-product north star
- [rls-policy-map.md](../rls-policy-map.md) · [query-performance.md](../query-performance.md)
- [Supabase](../infrastructure/Supabase.md) · [Vercel](../infrastructure/Vercel.md) · [Anthropic](../infrastructure/Anthropic.md) · [Railway](../infrastructure/Railway.md)
- [Project Structure](../developer/Project Structure.md) · [Coding Standards](../developer/Coding Standards.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
