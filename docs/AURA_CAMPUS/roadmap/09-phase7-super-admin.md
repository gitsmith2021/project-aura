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

#### ISO 27001 checklist — addressed this step:
- [x] `docs/rls-policy-map.md` (incl. intentional deny-all tables rationale)
- [x] `docs/security-audit-plan.md` (scope, methodology, annual pen-test cadence)
- [x] `docs/query-performance.md` (indexing strategy + EXPLAIN ANALYZE guidance)
- [x] Security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors` CSP) in `next.config.ts` — *full resource-restricting CSP deferred (report-only rollout) to avoid breaking Razorpay/Realtime/YouTube/SCORM*
- [x] `src/app/admin/security/page.tsx` — Security dashboard (live RLS coverage %, findings list, deny-all tables)
- [x] Data-retention documented — `src/lib/dataRetention.ts` (every PII table)
- [~] **Enable leaked-password protection** — deferred (requires Supabase **Pro plan**)

#### ISO 27001 Security Audit Checklist (resolve during this step):
- [ ] `docs/rls-policy-map.md` — document every table, its RLS policy, and which roles can read/write/delete
  - Include the **intentional deny-all tables**: `razorpay_webhook_events` and `scheduler_error_logs` have RLS enabled with **no policies on purpose** — they are written exclusively through `createAdminClient()` (service role) and no client role should ever read them. The Supabase advisor flags this as "RLS Enabled No Policy" (INFO) — document the rationale here so audits don't mistake it for an oversight; add explicit deny-all policies only if/when the linter or a compliance requirement makes it mandatory (carry-over note from the 2026-06-12 advisor run).
- [ ] **Enable leaked-password protection** (Supabase Auth → checks passwords against HaveIBeenPwned) — advisor WARN from 2026-06-12, one toggle in the dashboard. ⏸️ Deliberately deferred: requires the Supabase **Pro plan** — flip it as part of this step once the Pro upgrade is purchased.
- [ ] Verify `createAdminClient()` (service role) is used only in server-only files — grep for any client-side usage
- [ ] Run `EXPLAIN ANALYZE` on the 10 most-used queries and document results in `docs/query-performance.md`
- [ ] Confirm all Supabase Storage buckets have RLS enabled — no public buckets for sensitive data
- [ ] Review all API routes for missing auth checks — every route under `/api/` must verify `supabase.auth.getUser()`
- [ ] Document data retention periods for all PII tables in `src/lib/dataRetention.ts` (marks: 10yr, attendance: 5yr, medical: 7yr, financial: 7yr)
- [ ] Penetration test plan: document scope, methodology, and schedule (at minimum annual) in `docs/security-audit-plan.md`
- [ ] Verify `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are never in client bundles (`NEXT_PUBLIC_` prefix check)
- [ ] Add `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` headers to `next.config.js`
- [ ] `src/app/admin/security/page.tsx` — Security dashboard: RLS coverage %, last audit date, open findings list

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

#### Original build checklist:
- [x] `supabase/migrations/..._subscriptions.sql`
- [x] `src/app/admin/billing/page.tsx` — subscriptions: plan, status, next billing date, MRR contribution
- [x] `src/app/admin/billing/plans/page.tsx` — plan manager (tiers + feature gates)
- [x] `src/app/admin/billing/invoices/page.tsx` — invoice history (paid/pending/failed)
- [x] `src/actions/subscriptions.ts` — assignPlan, renew/cancel, generateInvoice (+ getBilling, isFeatureEnabled)
- [x] `src/components/billing/SubscriptionCard.tsx` — status card with trial countdown
- [~] Feature gating in **middleware** — page-level `isFeatureEnabled` shipped; middleware enforcement deferred (avoid hard lock-outs pre-assignment)
- [~] MRR/ARR fed into the Phase 7B dashboard — shown on `/admin/billing`; 7B card wiring is a follow-up
- [~] Razorpay recurring subscription integration — deferred

#### Database:
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

#### What to build:
- [ ] `supabase/migrations/..._subscriptions.sql`
- [ ] `src/app/admin/billing/page.tsx` — All institution subscriptions: plan, status, next billing date, MRR contribution
- [ ] `src/app/admin/billing/plans/page.tsx` — Plan manager: create/edit subscription tiers and feature gates
- [ ] `src/app/admin/billing/invoices/page.tsx` — Invoice history: paid, pending, failed — with PDF download
- [ ] `src/actions/subscriptions.ts` — assignPlan, renewSubscription, cancelSubscription, generateInvoice
- [ ] `src/components/billing/SubscriptionCard.tsx` — Institution subscription status card with trial countdown
- [ ] Feature gating: middleware checks institution plan before accessing premium modules (e.g., Online Exams, CCTV)
- [ ] MRR / ARR contributions fed into Phase 7B platform dashboard

#### Key features:
- Trial → Paid conversion tracking
- MRR / ARR calculations for the platform overview dashboard (Phase 7B)
- Automatic invoice generation on billing cycle
- Feature gating: restrict modules by plan tier
- Razorpay recurring subscription integration

---

### Step 7F — IQAC & Government Compliance Reports (NAAC / NIRF / AISHE)

**Routes:** `/institutions/[id]/iqac` (institution admin) · `/admin/iqac` (super admin overview)

> The crown jewel of AURA for Indian colleges. Aggregates data from ALL modules into NAAC, NIRF, AISHE, and UGC report formats. A real-time data completeness meter tells admin which criterion needs more data before the NAAC visit.

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

#### What to build:
- [ ] `src/app/institutions/[id]/iqac/page.tsx` — IQAC dashboard: criterion-wise data completeness meter (0–100%)
- [ ] `src/app/institutions/[id]/iqac/aqar/page.tsx` — AQAR data compilation view per academic year
- [ ] `src/app/institutions/[id]/iqac/naac/page.tsx` — NAAC criterion-wise data view with evidence count per criterion
- [ ] `src/app/institutions/[id]/iqac/nirf/page.tsx` — NIRF data export (Teaching, Research, Graduation, Outreach, Perception)
- [ ] `src/app/institutions/[id]/iqac/aishe/page.tsx` — AISHE annual report auto-population from student/staff counts
- [ ] `src/app/institutions/[id]/iqac/meetings/page.tsx` — **IQAC Meeting & Action Tracker** (see sub-section below)
- [ ] `src/actions/iqac.ts` — aggregateNAACData, generateAQAR, exportNIRFData, exportAISHEData, getCriterionCompleteness
- [ ] `src/components/iqac/CriterionDataCard.tsx` — Per-criterion completeness card with progress ring and data count
- [ ] `src/components/iqac/NIRFExportButton.tsx` — One-click NIRF-formatted CSV/Excel export

#### Key features:
- Real-time NAAC data completeness: "Criterion 3: Research — 70% data filled" with drill-down to missing data
- AQAR PDF auto-generation (pre-fills from all modules)
- NIRF data export: auto-populates all 5 NIRF parameters from live database
- AISHE annual report: student headcount, staff count, program-wise enrollment
- Best practices documentation editor (NAAC Criterion 7 evidence)
- Super admin can see NAAC readiness score across all institutions

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

- [ ] `supabase/migrations/..._students_aishe_fields.sql` — Add `category` + `is_pwd` to students
- [ ] Update student admission form (Phase 5A) and bulk import CSV template to include these fields
- [ ] `src/app/institutions/[id]/iqac/aishe/page.tsx` — auto-populate all AISHE fields from above mappings
- [ ] Validate: warn admin if any required AISHE field has null/zero values before export

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

**What to build:**
- [ ] `supabase/migrations/..._iqac_meetings.sql` — iqac_meetings + iqac_action_items + RLS
- [ ] `src/app/institutions/[id]/iqac/meetings/page.tsx` — Meeting register: list by academic year, status badges, minutes upload
- [ ] `src/app/institutions/[id]/iqac/meetings/[meetingId]/page.tsx` — Meeting detail: agenda, minutes editor, action items table
- [ ] `src/actions/iqacMeetings.ts` — createMeeting, updateMinutes, addActionItem, updateActionStatus, getMeetingStats
- [ ] `src/components/iqac/MeetingCard.tsx` — Card: date, meeting number, status badge, open action items count
- [ ] `src/components/iqac/ActionItemRow.tsx` — Row: description, assigned staff, due date, status dropdown (inline update)
- [ ] NAAC evidence export: meeting count per academic year, % action items resolved — feeds into Criterion 6.1 data

---

### Step 7F-sub — NAAC Self-Study Report (SSR) Builder

**Route:** `/institutions/[id]/iqac/ssr`

> The NAAC SSR is submitted once every 5–7 years. Aggregating data across all modules manually takes months and is error-prone. This module auto-generates the SSR data package by pulling from every NAAC-mapped module across all 7 Criteria, produces criterion-wise Excel sheets in NAAC-prescribed format, and generates the AISHE annual return and NIRF data extract in one click.

#### What to build:
- [ ] `src/app/institutions/[id]/iqac/ssr/page.tsx` — SSR dashboard: criterion-wise data completeness progress rings (Criteria 1–7), last-export timestamps, academic year selector
- [ ] `src/app/institutions/[id]/iqac/ssr/[criterion]/page.tsx` — Per-criterion data review: evidence count table, data gaps highlighted, drill-down to source module
- [ ] `src/app/institutions/[id]/iqac/ssr/export/page.tsx` — Export hub: download criterion-wise Excel (NAAC format), full SSR data ZIP, AISHE return, NIRF extract
- [ ] `src/actions/ssrBuilder.ts` — aggregateSSRData, getCriterionCompleteness, exportCriterionExcel, exportAISHEReturn, exportNIRFExtract
- [ ] `src/components/iqac/SSRCriterionCard.tsx` — Card per criterion: data completeness %, evidence count, missing-data warnings, "View Details" link
- [ ] `src/components/iqac/SSRExportButton.tsx` — Trigger Excel/ZIP export with loading state and download link on completion
- [ ] AISHE annual return: maps all Aura data fields to AISHE portal schema (leverages AISHE Field-Level Schema Mapping in Step 7F)
- [ ] NIRF extract: student progression (2D), placement (5F), research output (5I), outreach/alumni (5D), per academic year

#### Key features:
- Central SSR aggregation: pulls evidence counts from all NAAC-mapped modules (CIA, lesson plans, guest lectures, internships, research papers, placements, grievances, etc.)
- Criterion-wise completeness meter: shows % of required data fields populated — tells admin exactly what to fill before submission
- Export: criterion-wise Excel sheets structured in NAAC-prescribed column headers
- AISHE annual return: auto-populates all AISHE portal fields from Aura database in one export
- NIRF data extract: five-parameter NIRF submission (Teaching, Research, Graduation, Outreach, Perception) with year-on-year comparison
- Data gap warnings: highlights missing evidence (e.g., "Criterion 3 — 0 publications logged for 2024-25")

---

### Phase 7 Completion Checklist
- [ ] Super admin route fully protected
- [ ] No cross-institution data leaks to regular admins
- [ ] All charts rendering with real data
- [ ] Audit log capturing key actions
- [ ] Subscription plans and billing working end-to-end
- [ ] Feature gating blocks out-of-plan module access
- [ ] IQAC dashboard showing live criterion completeness from all modules
- [ ] NIRF and AISHE exports generating correctly
- [ ] `npx tsc --noEmit` passes
- [ ] `git commit -m "feat: Phase 7 — Super Admin Panel complete"`
- [ ] `git push origin main`

---

