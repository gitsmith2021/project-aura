[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** N/A — cross-cutting technical debt register.
> **Feeds into:** Each item is tagged with a "Resolve by Phase X" deadline; A8 (Platform-Wide Audit Log) feeds [04 — Phase 2.5 Critical Fixes](04-phase2.5-critical-fixes.md), A2/A5 (testing & CI/CD) underpin every phase's completion checklist.

---

## 🔧 Architecture & Quality Improvement Register

> These are non-feature improvements that must be addressed progressively. Each item is tagged with the phase by which it should be resolved.

### A1 — Fine-grained Supabase RLS Policies ✅ Complete (commit `20260701000000`)

> **Status:** ✅ Resolved. Originally flagged because early policies checked only
> `institution_members` membership. Over Phases 2-Pre-C → 7 this was superseded by the
> **`private.get_user_authorizations()`** pattern — a `SECURITY DEFINER` function returning
> the caller's `(role, tenant_id, department_id)` grants — used across the schema for
> fine-grained `SUPER_ADMIN` / `INST_ADMIN` / `HOD` (dept-scoped) / staff-own / student-own
> enforcement at the DB layer. A1 closed it out with a full audit (below).

> **Original concern:** Current RLS policies check `institution_members` membership only; no DB-level enforcement of HOD vs STAFF vs ADMIN — handled at the app layer, which is fragile.

#### ✅ What was done (Arch A1 audit, 2026-06-20)
- [x] Caller-role resolution function — `private.get_user_authorizations()` (role + tenant + department), used in `using`/`with check` clauses platform-wide (avoids `institution_members` recursion).
- [x] Role-restricted policies on sensitive tables — marks/CIA, salary, appraisals, budgets, grievances, etc. already enforce HOD-dept / owner / admin scoping at the DB.
- [x] Full audit of **every** `public` policy: 0 tables with RLS off, only the 2 documented deny-all tables policy-less, 0 unconditional inserts, 0 trivially-true auth checks.
- [x] **Found & fixed 1 cross-tenant leak** — `staff_appraisal_activities: read` granted SELECT to all authenticated users (parent-exists check, no scoping); replaced with an owner-scoped read (`20260701000000`). Admins/HOD keep access via the existing ALL policy.
- [x] Methodology + detector queries + findings documented in [`docs/rls-policy-map.md`](../../rls-policy-map.md) (re-runnable on every new table).

---

### A2 — Testing Strategy (Resolve by: Phase 4)  🟡 Foundation in place
> No unit, integration, or e2e tests defined. For a multi-tenant ERP handling fees and marks, regression risk is high. Scope covers **both**: retroactive coverage of the 30 modules already built (Core, Phase 1, Phase 2) and a forward-looking gate so untested surface area doesn't keep growing through Phases 3–8.
>
> **Status (2026-06-13):** Test infrastructure stood up before Phase 3 (user chose "full infra now"). Vitest + Playwright configured and green; assessment-calculation engines unit-tested; public-route smoke crawl runs. Retroactive coverage of the remaining built actions and authenticated e2e flows are the progressive backlog below.

#### What to build:
- [x] Add **Vitest** for unit testing — `vitest` + `@vitejs/plugin-react`; `vitest.config.ts` with the `@/` alias; `npm test` / `npm run test:watch`
- [x] First-pass unit coverage — assessment-calculation engines: `src/lib/ciaEngine.ts` (CIA weighting/raw/mixed, missing, clamp, at-risk), `src/lib/coPoEngine.ts` (CO + PO attainment), `src/lib/roleLabel.ts` — 15 tests, all green
- [ ] Retroactive coverage of remaining calculation/aggregation logic in `src/actions/*` (feePayments, attendance %, curriculum completion, payroll, promotion eligibility) — *progressive; extract pure helpers as we touch each*
- [x] Add **Playwright** for e2e — `@playwright/test`; `playwright.config.ts` reuses the running dev server; `npm run test:e2e`
- [x] Route-crawl smoke test (seed) — `tests/e2e/smoke.spec.ts` asserts public routes (`/login`, `/privacy-policy`) load with no uncaught `pageerror`. Authenticated crawl over `/institutions/[id]/...`, `/staff-portal/...`, `/student-portal/...` is the next increment (needs a seeded storageState login fixture)
- [ ] Priority e2e flows: student login → view attendance, admin → add fee → student pays → verify status — *pending the auth fixture*
- [x] Added `npm run typecheck` (`tsc --noEmit`) script — wiring it into CI lands with Arch A5
- [x] `docs/testing-guide.md` — testing conventions, how to run, the storageState pattern, and the Phase 3+ Definition of Done
- [x] **Definition of Done, Phase 3 onward:** every new Server Action ships with a Vitest unit test for its core logic, every new page is added to the route-crawl smoke test, and every new user-facing flow gets a Playwright e2e test (see Dev Rule 18)

---

### A3 — Database Index Strategy (Resolve by: Phase 4)
> Tables like `attendance_sessions`, `fee_payments`, and `marks` will grow to millions of rows. No composite indexes or query plan documentation beyond basic PKs.

#### Indexes to add:
```sql
-- attendance_sessions: most queries filter by institution + date range
CREATE INDEX idx_att_sessions_inst_date ON attendance_sessions(institution_id, session_date DESC);

-- fee_payments: filter by institution + student + academic year
CREATE INDEX idx_fee_payments_student ON fee_payments(institution_id, student_id, academic_year_id);

-- marks: filter by subject + exam type + academic year
CREATE INDEX idx_marks_subject_exam ON marks(subject_id, exam_type, academic_year_id);

-- notifications: already indexed (recipient_id, is_read) — covered in Phase 3A

-- lesson_plans: filter by staff + date
CREATE INDEX idx_lesson_plans_staff_date ON lesson_plans(staff_id, plan_date DESC);
```
- [ ] `supabase/migrations/..._performance_indexes.sql`
- [ ] Run `EXPLAIN ANALYZE` on the top 5 slowest queries after Phase 4 and document results

---

### A4 — Institution Onboarding Wizard (Resolve by: Phase 5)
> A new institution signs up with no guidance. There is no setup wizard for departments, academic year, fee structures, or staff import. This is a critical SaaS adoption blocker.

**Route:** `/onboarding/[institutionId]`

#### What to build:
- [ ] `src/app/onboarding/[institutionId]/page.tsx` — Multi-step wizard: Welcome → Add Departments → Set Academic Year → Configure Fee Structures → Import Staff (CSV) → Done
- [ ] `src/components/onboarding/OnboardingProgress.tsx` — Step indicator showing completion %
- [ ] Auto-redirect new institutions to `/onboarding/[id]` on first login if `institutions.is_onboarded = false`
- [ ] `src/actions/onboarding.ts` — completeOnboardingStep, markOnboardingComplete
- [ ] Add `is_onboarded BOOLEAN DEFAULT FALSE` column to `institutions` table

---

### A5 — CI/CD Pipeline (Resolve by: Phase 5)
> Manual git push to Vercel is implied. No automated migration runner, type check, or preview deployment strategy.

#### What to build:
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit

  migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: supabase db push --dry-run  # validate migrations without applying
```
- [ ] `.github/workflows/ci.yml` — TypeScript check + migration dry-run on every PR
- [ ] `.github/workflows/db-backup.yml` — Weekly backup (see Phase 2.5C)
- [ ] Configure Vercel preview deployments for every PR branch
- [ ] Add branch protection rule: PRs require CI green before merge

---

### A6 — Multi-currency & Multi-timezone Support (Resolve by: Phase 7)
> Aura is hardcoded to INR + Asia/Kolkata. As a multi-tenant SaaS, even one institution outside India breaks finance and scheduling.

#### What to build:
- [ ] Add `locale TEXT DEFAULT 'en-IN'`, `currency TEXT DEFAULT 'INR'`, `timezone TEXT DEFAULT 'Asia/Kolkata'` columns to `institutions` table
- [ ] `src/lib/locale.ts` — `formatCurrency(amount, currency, locale)` and `formatDate(date, timezone)` helpers
- [ ] Replace all hardcoded `en-IN` / `INR` / `Asia/Kolkata` references with calls to these helpers
- [ ] Institution settings page: allow admin to configure locale, currency, timezone
- [ ] All `TIMESTAMPTZ` storage stays UTC; display layer converts using institution timezone

---

### A7 — SaaS Billing ✅ Delivered via Phase 7E (commit `d70babd`)
> The full subscription billing system shipped in **Phase 7E** — `subscription_plans` + `institution_subscriptions` + `subscription_invoices`, MRR/ARR, plan tiers + feature gating (`isFeatureEnabled`), seeded Starter/Pro/Enterprise, and manual invoicing. This supersedes the "minimal viable" interim design (columns on `institutions`), which was skipped in favour of the full module.
>
> **Remaining (small follow-ups):** middleware-level enforcement of expired/inactive plans (page-level `isFeatureEnabled` ships; a `/subscription-expired` redirect is not wired) and Razorpay *recurring* auto-charge (manual invoicing now; `razorpay_sub_id` is the integration point).

---

### A8 — Platform-Wide Audit Log ✅ Complete (commit `b3c2ed0`)

> **Status:** ✅ Shipped — central `audit_logs` table (append-only, immutable per Dev Rule 17) + `logAudit()` helper in `src/lib/auditLog.ts`, wired into every high-stakes mutation (marks, fees, salary, promotions, budgets, staff lifecycle, …). A cross-institution viewer is surfaced on `/admin/health` (Phase 7D).

> **Critical for NAAC, UGC, and ISO 27001.** Marks edits, fee adjustments, salary disbursements, and year promotions all mutate high-stakes records. The single `audit_logs` table + `logAudit()` helper provides the centralized, tamper-evident trail (the design below).
>
> **Resolve by Phase 2.5** — this is a cross-cutting concern. Every sensitive Server Action written from this point forward must call `logAudit()` before returning.

#### Database:
```sql
CREATE TABLE public.audit_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  performed_by   UUID NOT NULL REFERENCES auth.users(id),
  table_name     TEXT NOT NULL,          -- e.g. 'marks', 'fee_payments', 'salary_disbursements'
  record_id      UUID NOT NULL,          -- PK of the affected row
  action         TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE','PROMOTE','REVERT')),
  before_data    JSONB,                  -- snapshot of row before change (NULL for INSERT)
  after_data     JSONB,                  -- snapshot of row after change (NULL for DELETE)
  ip_address     TEXT,
  user_agent     TEXT,
  notes          TEXT,                   -- optional human-readable reason (e.g. "Corrected marks entry")
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_institution ON public.audit_logs(institution_id, created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Admins can read their own institution's audit logs; super admins read all
CREATE POLICY "audit_logs: admins can read own institution"
  ON public.audit_logs FOR SELECT
  USING (institution_id IN (
    SELECT institution_id FROM institution_members
    WHERE profile_id = auth.uid()
      AND role IN ('ADMIN','HOD')
  ));
-- No UPDATE or DELETE policy — audit logs are append-only (immutable)
```

#### Server-side helper (`src/lib/auditLog.ts`):
```typescript
import { createAdminClient } from '@/utils/supabase/admin';

interface AuditPayload {
  institutionId: string | null;
  performedBy: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'PROMOTE' | 'REVERT';
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  notes?: string;
}

// Use createAdminClient so the INSERT bypasses RLS (audit logs must always be written)
export async function logAudit(payload: AuditPayload): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('audit_logs').insert(payload);
  // Intentionally fire-and-forget — never let audit failure block the primary action
}
```

#### Tables that MUST call `logAudit()` on every mutation:
| Table | Actions to log | Notes |
|---|---|---|
| `marks` | INSERT, UPDATE, DELETE | Before/after marks values; log who changed and why |
| `cia_marks` | INSERT, UPDATE, DELETE | Same as marks |
| `fee_payments` | INSERT, UPDATE (status change) | Log payment capture and any manual status overrides |
| `salary_disbursements` | INSERT, UPDATE | Log disbursement runs and any adjustments |
| `student_promotions` | INSERT (PROMOTE), UPDATE (REVERT) | Full before/after cohort snapshot |
| `fee_concessions` | INSERT, UPDATE | Who granted and who approved |
| `leave_requests` | UPDATE (approve/reject) | Who took action and when |
| `institution_members` | INSERT, UPDATE, DELETE | Role changes, new member adds, removals |
| `lms_submissions` | UPDATE (graded) | Before/after marks_awarded and feedback |
| `department_budgets` | UPDATE (approve/reject) | Before/after status and admin_notes |

#### What to build:
- [x] `supabase/migrations/20260612200000_arch_a8_audit_logs.sql` ✅ Applied via MCP (June 12) — table + indexes + RLS. Deviations from spec, both justified: `performed_by` is **nullable** (NULL = system action, e.g. Razorpay webhook capture); SELECT policy uses real roles `SUPER_ADMIN`/`INST_ADMIN` via `private.get_user_authorizations()` (spec's `'ADMIN','HOD'` don't exist; HODs excluded — trail includes salary/fee data). Default grants revoked, `GRANT SELECT` only — verified on live DB
- [x] `src/lib/auditLog.ts` ✅ `logAudit()` + `logAuditBatch()` (bulk ops log in one insert); fire-and-forget, admin client, auto-captures IP + user-agent
- [x] Retrofit existing Server Actions (actual file/table names differ from spec):
  - [x] `src/actions/examResults.ts` (spec said marks.ts; table is `exam_results`) — bulk upsert logs per-row INSERT/UPDATE with before→after marks; delete logs full before-snapshot
  - [x] `src/actions/cia.ts` — bulkSaveCIAMarks logs per-row before→after
  - [x] `src/actions/feePayments.ts` — manual record, Razorpay order creation, checkout verification, manual status override
  - [x] `src/actions/salary.ts` — disbursement run generation (batch), single + bulk processing with before-snapshots
  - [x] `src/actions/yearPromotion.ts` (spec said promotion.ts; table is `promotion_logs`) — PROMOTE + REVERT entries; per-student snapshot stays in promotion_logs.rollback_snapshot
  - [x] `src/actions/concessions.ts` — grant, approve, reject with before-snapshots
  - [x] `src/actions/staffPortal.ts` — reviewLeaveRequest (approve/reject) with before-snapshot
  - [x] `src/actions/user.ts` + `src/actions/departments.ts` — institution_members INSERT (new member) and role UPDATEs (HOD appoint/demote/remove)
  - [x] `src/app/api/razorpay-webhook/route.ts` — webhook capture/failure logged with `performed_by = NULL` (system)
  - [ ] `src/actions/lmsAssignments.ts` — module doesn't exist yet (Phase 6G); wire logAudit when built
  - [ ] `src/actions/budgets.ts` — module doesn't exist yet (Phase 5L); wire logAudit when built
- [x] **Found & fixed two unaudited client-side direct mutations** (browser → Supabase, bypassing Server Actions entirely): leave approve/reject in `CollegeDashboard.tsx` now calls `reviewLeaveRequest`; manual fee entry in `RecordPaymentPanel.tsx` now calls `recordManualPayment` (its UI also no longer offers failed/refunded — those states come only from the Razorpay flow)
- [x] `src/app/institutions/[id]/audit-log/page.tsx` ✅ filterable by module, action, date range; paginated (25/page)
- [x] `src/components/audit/AuditLogTable.tsx` ✅ expandable rows, before/after diff with changed fields highlighted, System vs user attribution; "Audit Log" added to Institution sidebar group
- [ ] `src/app/admin/audit/page.tsx` — deferred to Phase 7A: no super-admin layout/auth exists yet to host a cross-institution view
- [x] Verify: no UPDATE/DELETE policy or grant on `audit_logs` — confirmed on live DB (authenticated has SELECT only)

#### Key features:
- **Append-only** — no UPDATE or DELETE policy on the table; even super admins cannot erase entries
- **Before/after snapshots** — every UPDATE stores the full row state before and after so any change can be reconstructed
- **Fire-and-forget** — `logAudit()` never throws or blocks the primary Server Action; audit failure is logged server-side but does not surface to the user
- **Admin audit viewer** — institution admin can filter by module, user, and date range to answer "who changed this and when?"
- **NAAC / UGC evidence** — the audit log page is the primary evidence for data integrity during accreditation visits
- **ISO 27001 requirement** — audit trails for access and modification of sensitive data are a mandatory ISO 27001 control

---

