[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** N/A — cross-cutting technical debt register.
> **Feeds into:** Each item is tagged with a "Resolve by Phase X" deadline; A8 (Platform-Wide Audit Log) feeds [04 — Phase 2.5 Critical Fixes](04-phase2.5-critical-fixes.md), A2/A5 (testing & CI/CD) underpin every phase's completion checklist.

---

## 🔧 Architecture & Quality Improvement Register

> These are non-feature improvements that must be addressed progressively. Each item is tagged with the phase by which it should be resolved.

### A1 — Fine-grained Supabase RLS Policies (Resolve by: Phase 3)
> Current RLS policies check `institution_members` membership only. There is no DB-level enforcement of HOD vs STAFF vs ADMIN permissions — this is handled entirely at the app layer, which is fragile.

#### What to build:
- [ ] Define `get_my_role(institution_id UUID)` PostgreSQL function that returns the caller's role within an institution
- [ ] Add role-restricted RLS policies to sensitive tables: `marks`, `salary_disbursements`, `cia_marks`, `lesson_plans`
  - Example: only HOD or ADMIN can read all department marks; staff can only read marks they entered
- [ ] `supabase/migrations/..._role_based_rls.sql`
- [ ] Audit all existing RLS policies and document which tables need role-gating in `docs/rls-policy-map.md`

---

### A2 — Testing Strategy (Resolve by: Phase 4)
> No unit, integration, or e2e tests defined. For a multi-tenant ERP handling fees and marks, regression risk is high.

#### What to build:
- [ ] Add **Vitest** for unit testing Server Actions: `npm install -D vitest @vitejs/plugin-react`
- [ ] Priority test targets: `src/actions/marks.ts`, `src/actions/feePayments.ts`, `src/actions/promotion.ts`
- [ ] Add **Playwright** for e2e: `npm install -D @playwright/test`
- [ ] Priority e2e flows: student login → view attendance, admin → add fee → student pays → verify status
- [ ] Add TypeScript check to CI: `npx tsc --noEmit` must pass on every PR
- [ ] `docs/testing-guide.md` — testing conventions and how to run

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

### A7 — SaaS Billing (Minimal viable — Resolve by: Phase 3)
> Platform subscription billing (Phase 7E) is planned too late. You need a revenue mechanism before onboarding real institutions. A minimal billing setup should exist by Phase 3.

#### Minimal viable billing (Phase 3 addition):
- [ ] Add `subscription_plan TEXT DEFAULT 'trial'`, `trial_ends_at TIMESTAMPTZ`, `is_active BOOLEAN DEFAULT TRUE` to `institutions` table
- [ ] `src/middleware.ts` — Check `is_active` and `trial_ends_at`; redirect inactive institutions to `/subscription-expired`
- [ ] `src/app/subscription-expired/page.tsx` — Expired plan page with upgrade CTA
- [ ] Wire up Razorpay Subscriptions API or a simple manual invoice flow for initial clients
- [ ] Full subscription management portal deferred to Phase 7E as planned

---

### A8 — Platform-Wide Audit Log (Resolve by: Phase 2.5 / before Phase 3)

> **Critical for NAAC, UGC, and ISO 27001.** Marks edits, fee adjustments, salary disbursements, and year promotions all mutate high-stakes records — but there is currently no centralized, tamper-evident trail. Individual modules have partial logs (`promotion_logs`, etc.) but there is no unified view. A single `audit_logs` table and `logAudit()` helper closes this entirely.
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
- [ ] `supabase/migrations/..._audit_logs.sql` — audit_logs table + indexes + RLS (append-only)
- [ ] `src/lib/auditLog.ts` — `logAudit()` helper (uses admin client, fire-and-forget)
- [ ] Retrofit existing Server Actions: add `logAudit()` call to all actions listed in the table above
  - [ ] `src/actions/marks.ts` — log INSERT/UPDATE/DELETE on marks
  - [ ] `src/actions/cia.ts` — log INSERT/UPDATE/DELETE on cia_marks
  - [ ] `src/actions/feePayments.ts` — log payment capture + status overrides
  - [ ] `src/actions/salary.ts` — log disbursement runs
  - [ ] `src/actions/promotion.ts` — log PROMOTE and REVERT actions
  - [ ] `src/actions/concessions.ts` — log grant and approval
  - [ ] `src/actions/staffPortal.ts` — log leave approve/reject
  - [ ] `src/actions/lmsAssignments.ts` — log grade submission
  - [ ] `src/actions/budgets.ts` — log budget approve/reject
- [ ] `src/app/institutions/[id]/audit-log/page.tsx` — Admin audit viewer: filterable by table, user, date range, action type; shows before/after diff
- [ ] `src/components/audit/AuditLogTable.tsx` — Table with expandable rows showing before/after JSONB diff (highlight changed fields)
- [ ] `src/app/admin/audit/page.tsx` — Super admin: cross-institution audit search (by user, table, date)
- [ ] Verify: `audit_logs` table has no DELETE RLS policy — rows must be immutable once written

#### Key features:
- **Append-only** — no UPDATE or DELETE policy on the table; even super admins cannot erase entries
- **Before/after snapshots** — every UPDATE stores the full row state before and after so any change can be reconstructed
- **Fire-and-forget** — `logAudit()` never throws or blocks the primary Server Action; audit failure is logged server-side but does not surface to the user
- **Admin audit viewer** — institution admin can filter by module, user, and date range to answer "who changed this and when?"
- **NAAC / UGC evidence** — the audit log page is the primary evidence for data integrity during accreditation visits
- **ISO 27001 requirement** — audit trails for access and modification of sensitive data are a mandatory ISO 27001 control

---

