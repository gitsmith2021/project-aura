[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** Nearly all prior phases — NAAC criterion mapping aggregates data from Phase 2 (academics), Phase 4 (campus infrastructure), Phase 5 (admissions, budgets, appraisals), and Phase 6 (industry connect, LMS).
> **Feeds into:** [12 — Architecture & Quality Register](12-architecture-quality-register.md) items A6 (multi-currency/timezone) and A7 (SaaS billing).

---

## 📊 Phase 7 — Super Admin Panel (SaaS Multi-Tenancy)

> **Goal:** A bird's-eye view across ALL institutions for the Aura platform owner. This is the SaaS operator dashboard — not for college admins. Perfect for platform health monitoring.

### Step 7A — Super Admin Layout & Auth ✅ (commit `24f64f1`)

**Route:** `/admin` (role=SUPER_ADMIN only)

#### What to build:
- [x] Migration: add `SUPER_ADMIN` role to institution_members — *no new migration needed: role already present in the CHECK constraint since `20260609000005_foundation_2pre_c_hod_role.sql`*
- [x] `src/app/admin/layout.tsx` — Super admin layout, separate from institution nav (operator shell + AdminNav with 7C/7D/7E placeholder tabs)
- [x] Middleware update — protect `/admin` for SUPER_ADMIN only (lives in `src/utils/supabase/middleware.ts`; membership re-checked per request since the `aura-role` cookie collapses SUPER_ADMIN/INST_ADMIN; layout re-verifies as defense in depth)
- [x] `src/actions/superAdmin.ts` — cross-institution data fetching (SUPER_ADMIN gate → `createAdminClient()` read-only aggregates, Dev Rule 16 comment included)

---

### Step 7B — Platform Overview Dashboard ✅ (commit `24f64f1`)

**Route:** `/admin/page.tsx`

#### What to build:
- [x] Platform KPI cards:
  * Total Institutions registered
  * Total Students across all institutions
  * Total Staff across all institutions
  * Total Revenue collected (all fee payments)
  * Active sessions today (live classes — distinct schedules with attendance, IST)
  * ~~Monthly Recurring Revenue trend~~ → **Collections this month + % delta vs last month** — honest stand-in until Phase 7E billing exists (MRR has no real data source before subscriptions)
- [x] Institutions table: name, students count, staff count, revenue, last active (= latest completed payment)
- [x] Platform growth chart: new institutions per month (recharts AreaChart, 12 months, IST buckets)
- [x] Revenue chart: total fee collections per month across all institutions
- [x] Top performing institutions by collections (top-3 strip; collection *rate* needs expected-fee totals — revisit with 7E)

#### Premium enhancements (decided — no new dependencies):
> Deliberately scoped: **no Three.js / globe / socket.io.** This is an operator analytics
> tool for an all-India tenant base — data-density and scan-speed win over 3D eye-candy
> (that lives on the Landing Page). Only two enhancements, both using already-installed packages.

- [x] **Supabase Realtime — live "Active Sessions Today" card.** Subscribes to `attendance`
  INSERTs (table already in the `supabase_realtime` publication) via `supabase.channel(...)`;
  events trigger a debounced (1.5s) re-count through the SUPER_ADMIN-gated server action so
  NFC marking bursts coalesce. Channel removed on unmount.
- [x] **GSAP count-up on KPI cards.** All six KPI numbers count up on mount via `useGSAP`
  (imported from `src/lib/gsap.ts`, same registration as Landing Page). Charts not animated.
  `prefers-reduced-motion` renders final values immediately. INR formatted `en-IN` with
  lakh/crore compaction (full value in tooltip).

---

### Step 7C — Per-Institution Drill Down ✅ (commit `d21e9bd`)

**Route:** `/admin/institutions/[id]/page.tsx` (+ `/admin/institutions` register)

#### What to build:
- [x] Full institution analytics:
  * Enrollment trends — students by year of study + admissions/month (12m)
  * Attendance rate trends — 6 months, head-count queries via attendance → class_schedules → departments join; present+late = attended
  * Fee collection rate — completed vs pending payment amounts
  * Payroll vs revenue ratio — KPI + 12-month grouped bars (processed disbursements vs completed collections)
  * Department-wise breakdown — students/staff/ratio per department with colors + funding labels
- [x] Quick actions: View institution ("Open dashboard" → `/institutions/[slug]`); **Impersonate admin deferred to Phase 7D** — needs an audited `auth.admin` magic-link flow + an `IMPERSONATE` audit action type; shipping it without the audit trail would violate Dev Rule 13's spirit. Stubbed disabled in the UI with tooltip.

---

### Step 7D — Platform Health, Audit & Security ✅ (commit `d3ec04e`)

**Routes:** `/admin/health` · `/admin/security`

> **Status:** ✅ **Complete** (migration `20260628000000_phase7d_platform_table_stats`, commit `d3ec04e`).
> SUPER_ADMIN-gated operator dashboards (service-role reads, Dev Rule 16). A
> `public.platform_table_stats()` SECURITY DEFINER function (EXECUTE revoked from
> anon/authenticated, granted to service_role only) feeds live per-table row
> estimates + RLS flags without exposing pg_catalog to clients. `src/lib/platformHealth.ts`
> (error-rate, RLS-coverage, compact-number helpers) has 7 Vitest tests.

#### What to build:
- [x] Audit log table (all admin actions with timestamp + user) — recent cross-institution trail on `/admin/health`
- [x] Failed payments tracker across all institutions — failure rate + 7d/30d counts + recent-failures list
- [x] Scheduler engine health check (ping FastAPI /health endpoint) — reuses `checkSchedulerHealth()`
- [x] Database size and row counts per table — `platform_table_stats()` (catalog estimates), largest-15 table panel
- [x] Error rate monitoring (failed payments) — *(failed-login logging not yet captured; noted in plan)*

#### ISO 27001 checklist (addressed in 7D):
- [x] `docs/rls-policy-map.md` — every table category, its RLS policy, and the **intentional deny-all tables** (`razorpay_webhook_events`, `scheduler_error_logs`) rationale.
- [~] **Enable leaked-password protection** (HaveIBeenPwned) — deferred: requires the Supabase **Pro plan**; flip on upgrade.
- [x] Verify `createAdminClient()` used only in server-only files — confirmed (surfaced as a Security-dashboard finding).
- [~] Run `EXPLAIN ANALYZE` on the 10 hottest queries — indexing strategy + EXPLAIN guidance documented in `docs/query-performance.md`; full 10-query capture is a carry-over.
- [~] Storage buckets review — document-URL buckets are public by convention (no sensitive-PII listing); documented in the RLS map + Security dashboard.
- [x] Review `/api/` routes for auth — confirmed (`/api/scheduler-health` is intentionally public, returns only up/down + latency).
- [x] Document data-retention periods for all PII tables — `src/lib/dataRetention.ts`.
- [x] Penetration-test plan — `docs/security-audit-plan.md` (annual cadence).
- [x] Verify `RAZORPAY_KEY_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` never in client bundles (no `NEXT_PUBLIC_` prefix).
- [x] `Content-Security-Policy` (`frame-ancestors`), `X-Frame-Options`, `X-Content-Type-Options` headers in `next.config.ts`.
- [x] `src/app/admin/security/page.tsx` — Security dashboard: live RLS coverage %, findings list, deny-all tables.

---

### Step 7E — SaaS Subscription & Billing Management ✅ (commit `d70babd`)

**Route:** `/admin/billing`

> **Status:** ✅ **Complete** (migration `20260629000000_phase7e_subscriptions`, commit `d70babd`).
> Plans/subscriptions/invoices + MRR/ARR + feature gating shipped. **Razorpay
> recurring auto-charge is deferred** (manual invoicing now) — `razorpay_sub_id` /
> `razorpay_payment_id` are the integration point. `src/lib/subscriptions.ts` has 12
> Vitest tests.

> Manage institution subscription plans, billing cycles, and invoice generation for the Aura SaaS business. This is the revenue backbone of the platform. Without this, Aura has no monetization layer.

#### ✅ What was built — commit `d70babd`
- `subscription_plans` + `institution_subscriptions` + `subscription_invoices` with RLS (SUPER_ADMIN manages; an institution admin reads its own subscription/invoices); seeded **Starter / Pro / Enterprise**.
- `src/lib/subscriptions.ts` — feature catalog (10 module keys, premium flags), **MRR/ARR** (paying subs only; annual amortised over 12), trial/expiry countdown, plan-limit checks, INR + invoice-number formatting.
- `src/actions/subscriptions.ts` — SUPER_ADMIN-gated plan CRUD, assign/renew/cancel subscription, invoice generate + mark paid/failed, `getBilling` (MRR/ARR summary + per-institution usage-vs-caps), and **`isFeatureEnabled`** (default-allow so un-subscribed tenants are grandfathered until plans are assigned).
- `/admin/billing` (MRR/ARR strip + `SubscriptionCard`s with trial countdown + assign/renew/cancel/invoice), `/admin/billing/plans` (tier + feature-gate manager), `/admin/billing/invoices` (generate + mark). AdminNav **Billing** tab live.
- [~] **Razorpay recurring** + **middleware-level** feature enforcement — deferred (manual invoicing; page-level `isFeatureEnabled` available). MRR/ARR shown on the billing page; wiring an MRR card into the 7B overview is a small follow-up.

#### Database (design reference):
```sql
CREATE TABLE subscription_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,   -- e.g. "Starter", "Pro", "Enterprise"
  price_monthly   NUMERIC(10,2) NOT NULL,
  price_annual    NUMERIC(10,2),
  max_students    INTEGER,
  max_staff       INTEGER,
  features        JSONB NOT NULL,         -- Array of enabled feature module keys
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE institution_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE UNIQUE,
  plan_id          UUID NOT NULL REFERENCES subscription_plans(id),
  billing_cycle    TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'trial'
                   CHECK (status IN ('active','trial','expired','cancelled')),
  razorpay_sub_id  TEXT,   -- Razorpay subscription ID for recurring billing
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_invoices (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id),
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','failed','refunded')),
  razorpay_payment_id TEXT,
  invoice_pdf_url     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Step 7F — IQAC & Government Compliance Reports (NAAC / NIRF / AISHE) ✅ (commit `3cc2876`)

**Routes:** `/institutions/[id]/iqac` (institution admin) · `/admin/iqac` (super admin overview)

> **Status:** ✅ **Complete** (migration `20260630000000_phase7f_iqac_meetings`, commit `3cc2876`).
> Delivered as the **IQAC dashboard + AQAR + IQAC Meeting & Action tracker (NAAC 6.1)**.
> **NAAC criterion completeness, NIRF and AISHE exports are delivered by the existing
> SSR Builder (7F-sub)** — the IQAC dashboard reuses its `aggregateSSRData` aggregator and
> links to it rather than duplicating those pages. `src/lib/iqac.ts` has 8 Vitest tests.

> The crown jewel of AURA for Indian colleges. Aggregates data from ALL modules into NAAC, NIRF, AISHE, and UGC report formats. A real-time data completeness meter tells admin which criterion needs more data before the NAAC visit.

#### ✅ What was built — commit `3cc2876`
- **IQAC dashboard** (`/institutions/[id]/iqac`) — overall NAAC readiness %, per-criterion completeness rings (from the SSR aggregator), IQAC meeting/action health (6.1 compliance), and links to the SSR Builder (NIRF/AISHE/criterion exports), Meetings and AQAR.
- **IQAC Meeting & Action Tracker** (NAAC 6.1) — `iqac_meetings` + `iqac_action_items` + RLS; register + create, meeting detail with **agenda, minutes editor and action-taken items** (inline status, assignee, due date + overdue flag), `getIqacStats` (meetings ≥2/year compliance + resolved-%).
- **AQAR compilation** (`/iqac/aqar`) — year-scoped, printable Annual Quality Assurance Report: headline counts (students/staff), NAAC criterion table, meeting/action stats.
- `src/lib/iqac.ts` (status metadata, compliance & banding maths) + `src/actions/iqac.ts` (overview + AQAR) + `src/actions/iqacMeetings.ts` (full CRUD). Sidebar: **IQAC Dashboard** + **NAAC SSR Builder** links; dataRetention entry.
- **Consolidation note:** the spec's separate `/iqac/naac`, `/iqac/nirf`, `/iqac/aishe` pages and the AISHE `students.category`/`is_pwd` migration were already delivered by **7F-sub (SSR Builder)** — reused here, not rebuilt (DRY).

#### NAAC Criterion → Module Mapping:
| NAAC Criterion | Primary Data Source |
|---|---|
| 1. Curricular Aspects | Curriculum (2F), Guest Lectures (2H), CIA (2E) |
| 2. Teaching-Learning | Attendance, Timetable, Lesson Plans (2G), Feedback (6E) |
| 3. Research & Innovation | Publications (5I), Research Projects (5I) |
| 4. Infrastructure | Library (4A), Labs (4D), Sports (4J), Assets (4E) |
| 5. Student Support | Scholarships (5G), Placements (5F), Clubs (4H), Alumni (5D) |
| 6. Governance | Grievances (6F), Disciplinary (5H), Appraisals (5E) |
| 7. Institutional Values | MOUs (6H), Sports (4J), Guest Lectures (2H) |

---

#### AISHE Field-Level Schema Mapping

> AISHE (All India Survey on Higher Education) requires annual data submission. Every field in Aura must map to a specific AISHE portal field. This mapping drives the auto-population in `/iqac/aishe`.

| AISHE Field | Aura Data Source | Notes |
|---|---|---|
| Total Enrolled Students (by gender) | `students` table — count by `gender` | Filter by `academic_year_id` |
| Students by Social Category (SC/ST/OBC/General) | `students.category` column (add if missing) | Requires `category` enum on students |
| Programme-wise enrollment | `students` grouped by `program` + `year` | Map programme names to AISHE codes |
| Teaching Staff (by gender, qualification) | `staff` table — `role = 'STAFF'` or `'HOD'` | Filter by `qualification` field |
| Non-Teaching Staff (by gender) | `staff` table — `role = 'NON_TEACHING'` | Phase 5C adds this role |
| Number of classrooms / labs | `departments` + assets (Phase 4E) | Count rooms tagged as classroom/lab |
| Library volumes | `library_books` table (Phase 4A) | Count by book type |
| Annual income (grants, fees) | `fee_payments` + `department_budgets` (Phase 5L) | Sum by category |
| Annual expenditure | `salary_disbursements` + `expenses` | Sum all outflows |

**Database change required:**
```sql
-- Add AISHE-required fields to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('general','obc','sc','st','ews','other')),
  ADD COLUMN IF NOT EXISTS is_pwd   BOOLEAN NOT NULL DEFAULT FALSE;  -- Persons with Disability flag
```

> Shipped: the `students.category` / `is_pwd` migration (`20260613000000` series) and AISHE auto-population via the SSR Builder (`getAISHEData`). Carry-over: surfacing these fields in the Phase 5A admission form + bulk-import CSV template.

---

#### IQAC Meeting & Action Tracker

> NAAC Criterion 6.1 requires evidence of IQAC meetings (minimum 2 per year) with documented agendas, minutes, and action-taken reports. Without this, institutions lose points in governance criteria.

**Database:**
```sql
CREATE TABLE iqac_meetings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  meeting_date     DATE NOT NULL,
  meeting_number   INTEGER NOT NULL,   -- e.g. 1st meeting, 2nd meeting of the year
  agenda           TEXT NOT NULL,
  minutes          TEXT,               -- Full minutes text or rich content
  chaired_by       UUID REFERENCES staff(id),
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','completed','minutes_pending')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE iqac_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iqac_meetings: institution members can manage"
  ON public.iqac_meetings
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE TABLE iqac_action_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID NOT NULL REFERENCES iqac_meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES staff(id),
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','in_progress','completed','deferred')),
  resolved_at TIMESTAMPTZ,
  remarks     TEXT
);
ALTER TABLE iqac_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iqac_action_items: institution members can manage"
  ON public.iqac_action_items
  USING (meeting_id IN (
    SELECT id FROM iqac_meetings WHERE institution_id IN (
      SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
    )
  ));
```

> ✅ Built in 7F (commit `3cc2876`) — see the "What was built" summary above. Migration `20260630000000_phase7f_iqac_meetings`. The SQL above is the original design reference.

---

### Step 7F-sub — NAAC Self-Study Report (SSR) Builder ✅

**Route:** `/institutions/[id]/iqac/ssr`

> **Status:** ✅ **Complete** (shipped earlier; `ssrRegistry.ts` + `ssrBuilder.ts`). Powers the 7F IQAC dashboard's criterion completeness and the NIRF/AISHE exports.

> The NAAC SSR is submitted once every 5–7 years. Aggregating data across all modules manually takes months and is error-prone. This module auto-generates the SSR data package by pulling from every NAAC-mapped module across all 7 Criteria, produces criterion-wise Excel sheets in NAAC-prescribed format, and generates the AISHE annual return and NIRF data extract in one click.

> **What shipped:** SSR dashboard (criterion completeness rings + AY selector), per-criterion review (evidence counts + data-gap warnings), export hub (criterion Excel, AISHE return, NIRF extract); `ssrBuilder.ts` (`aggregateSSRData`, `getAISHEData`, `getNIRFData`) + `ssrRegistry.ts` (the 7-criteria → table evidence map); `SSRCriterionCard` + `SSRExportButton`.

---

### Phase 7 Completion Checklist
- [x] Super admin route fully protected (middleware + layout + per-action SUPER_ADMIN gate)
- [x] No cross-institution data leaks to regular admins (RLS; service-role only behind the gate)
- [x] All charts rendering with real data (7B/7C)
- [x] Audit log capturing key actions (`audit_logs`; viewer on `/admin/health`)
- [x] Subscription plans and billing working end-to-end (7E; Razorpay recurring deferred)
- [~] Feature gating blocks out-of-plan module access — page-level `isFeatureEnabled` shipped; middleware enforcement deferred
- [x] IQAC dashboard showing live criterion completeness from all modules (7F + SSR aggregator)
- [x] NIRF and AISHE exports generating correctly (7F-sub SSR Builder)
- [x] `npx tsc --noEmit` passes
- [x] committed — `feat: Phase 7 … complete` across 7A–7F + SSR
- [x] `git push origin main`

---

