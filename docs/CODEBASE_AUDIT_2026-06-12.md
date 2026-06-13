# Codebase Audit & Rectification Report — 2026-06-12

> Full-codebase review after the Fable 5 build sprint (modules 1–10: landing page,
> Razorpay security, DPDP, audit log, super-admin dashboard + drill-down, CIA engine,
> CO/PO mapping, NAAC SSR Builder + exports). Scope: code-vs-live-schema validation,
> role-flow walkthrough, Dev Rule compliance, and a per-role good-to-have assessment.
> **Every issue found was fixed in this audit unless explicitly marked Deferred.**

---

## 1. Method

1. **Schema-vs-code validation** — pulled the live column list for every table the
   code touches and grepped the codebase for references to columns/tables that
   don't exist. This class of bug is silent and severe: PostgREST rejects the
   *entire* query when one selected column is wrong, so features render empty
   rather than erroring visibly.
2. **Role-flow walkthrough** — middleware fences and page surfaces for
   Super Admin, Admin, HOD, Staff, Student.
3. **Dev Rule compliance** — Rule 13 (audit trail) coverage across all sensitive
   Server Actions; RLS presence on all new tables; migration-history integrity.

---

## 2. Errors found → FIXED (commit `pending` / this audit)

### 2.1 Wrong column names vs live schema (severity: HIGH — features dead on arrival)

The live database renamed most legacy `tenant_id` columns to `institution_id`
(fee_payments, salary_disbursements, expenses, leave_requests) but kept
`tenant_id` on `schedules` — while some migration *files* still show the old
names. Code written against the files instead of the live schema broke:

| # | Location | Bug | Effect before fix |
|---|----------|-----|-------------------|
| 1 | `superAdmin.getPlatformOverview` | selected `fee_payments.tenant_id` | **Entire /admin overview failed** (error banner) |
| 2 | `superAdmin.getInstitutionAnalytics` | `.eq("tenant_id")` on fee_payments + salary_disbursements | Drill-down finance KPIs/charts failed |
| 3 | `ssrBuilder.getAISHEData` | `.eq("tenant_id")` on fee_payments, salary_disbursements, expenses | AISHE export failed |
| 4 | `ssrRegistry` | leave_requests + salary_disbursements marked `tenant_id`; schedules marked `institution_id` (inverted!) | 3 of 7 SSR criteria failed to count |
| 5 | `CollegeDashboard` sessions query | `.eq("institution_id")` on `schedules` (which kept `tenant_id`) | **Pre-existing**: "today's sessions" on the college dashboard rendered empty since the feature shipped |
| 6 | `superAdmin` enrollment + `examSchedules` hall ticket | selected `students.year` (column is `student_year`) | Fixed earlier today (`3944ed7`): drill-down enrollment chart failed; **hall tickets listed zero students since Phase 2B** |

> Verified clean: `scheduler.ts` and `CurrentClassWidget` correctly use
> `schedules.tenant_id`; staff/student portals filter schedules by
> `staff_id`/`department_id` (column-safe); all finance actions use `institution_id`.

### 2.2 Missing tables — shipped features writing to nothing (severity: HIGH)

Two migrations never reached this database (history drift pre-dating the
2026-06-12 migration-history repair):

| # | Missing | Broken feature | Fix |
|---|---------|----------------|-----|
| 7 | `promotion_logs` + `students.is_graduated` (file 20260609000011 never applied) | **Year Promotion (Phase 2D) failed on every run** — couldn't write the rollback log or set graduation flags | Repair migration `20260613020000` (applied ✅) |
| 8 | `staff_attendance` (file 20260506000004 never applied) | Dashboard Staff Attendance card errored every load → all staff displayed "absent" | Same repair migration — recreated with current naming (`institution_id`, FK → `public.staff`, institution-scoped RLS instead of the original `USING (true)`) ✅ |

### 2.3 Robustness (severity: MEDIUM)

| # | Issue | Fix |
|---|-------|-----|
| 9 | One failing evidence source sank the **entire** SSR readiness report (`countSource` threw) | Per-source error capture: failed counts render as "count failed" on that row; the other 34 sources still report |
| 10 | PostgREST's silent 1000-row cap on un-ranged selects | Fixed earlier today across superAdmin/cia/ssrBuilder aggregates (`.range()` ceilings); flagged → Arch A3 moves heavy aggregation into SQL |

---

## 3. Verified clean (no action needed)

- **Dev Rule 13 audit coverage** — `logAudit()` present in all 9 existing sensitive
  action files (examResults, feePayments, salary, yearPromotion, concessions,
  staffPortal leave review, user/member management, cia, departments HOD changes).
  lmsAssignments/budgets don't exist yet (Phase 6G/5L).
- **RLS** — enabled with policies on every table added this sprint (cia_results: 3,
  CO/PO tables: 2 each); audit_logs append-only (no UPDATE/DELETE policies);
  deny-all on the two service-role-only tables is intentional (recorded in 7D).
- **Middleware fences** — staff/student portal isolation correct both directions;
  `/admin` re-checks SUPER_ADMIN membership per request (cookie can't fake it);
  slug→UUID rewrite; webhooks exempted with their own auth (HMAC/bearer).
- **Migration history** — reconciled and clean; `db push` now applies exactly
  what's pending. All 4 sprint migrations live in the DB.
- **Secrets** — service-role/Razorpay secrets server-only; no `NEXT_PUBLIC_` leaks found.

---

## 4. Role-by-role assessment & good-to-haves

### 🛡️ Super Admin (platform operator)
**Has:** /admin overview (live KPIs, realtime sessions, growth/revenue charts),
institutions register, per-institution drill-down with finance/attendance/enrollment.
**Gaps (planned):** Health (7D) and Billing (7E) tabs are stubs; impersonation
deferred to 7D (needs audited magic-link flow); real MRR needs 7E subscriptions.
**Good-to-have:** failed-payment alerting on the overview; CSV export of the
institutions register; advisor items already recorded in 7D checklist.

### 🏛️ Institution Admin (today this IS the "Principal")
**Has:** the full institution surface — academics, finance, compliance, audit log,
CIA publish flow, CO/PO, SSR readiness + exports.
**Biggest UX gap:** **no notifications** (Phase 3 next in roadmap order) — results
publish, leave requests, payments succeed/fail and *nobody is told*; every flow
ends with "the other party must go look".
**Good-to-have:** institution onboarding wizard (Arch A4) — a new institution
currently lands on an empty dashboard with no guided setup; bulk backfill UI for
the new AISHE fields (gender/category/PwD) before the first AISHE export.

### 🎓 Principal (distinct role) — **does not exist**
There is no PRINCIPAL role anywhere in the schema or roadmap; the concept maps to
INST_ADMIN. If a Principal needs read-mostly oversight without edit rights, that's
a new role in the `institution_members` CHECK + middleware + RLS. **Decision
recorded, not built** — reasonable to defer until a real customer asks; revisit
with Arch A1 (fine-grained RLS).

### 👔 HOD / Department Head
**Has:** admin-equivalent navigation, department drill page, leave review, CIA
manage rights (RLS-backed).
**Gaps:** sees the whole institution nav rather than a department-scoped view;
HOD vs ADMIN separation is app-layer only until Arch A1 ships DB-level role gating.
**Good-to-have:** default the HOD's landing view to their own department; a marks
review/approval step before CIA publish.

### 🧑‍🏫 Staff
**Has:** complete self-service portal (schedule, attendance, leave, payslips,
lesson plans, curriculum, privacy).
**Real workflow gap found:** **staff cannot enter CIA marks.** Marks entry lives
under `/institutions/[id]/cia` (admin area — middleware blocks STAFF), and
cia_marks RLS only lets INST_ADMIN/DEPARTMENT_HEAD write. So subject teachers
hand marks to the HOD for data entry — workload concentrates exactly where it
shouldn't. **Recommended next CIA increment:** staff-portal marks entry scoped to
their `teaching_assignments`, with an RLS policy allowing staff INSERT/UPDATE on
components of subjects they teach.
**Also:** staff attendance has a reader (dashboard card) but **no writer** — no UI
marks staff present/absent. Table now exists (repair); the marking UI is Phase 5J
(Staff Daily Attendance + LOP) — until then the card shows defaults honestly.

### 🧑‍🎓 Student
**Has:** portal with timetable, attendance rings, fees + Razorpay payment, exams,
CIA marks + **official published results** (draft-invisible via RLS), curriculum,
internships, privacy/consent.
**Good-to-have:** notifications (results published, fee due, hall ticket ready);
downloadable marksheet/transcript PDF (pairs with the Phase 6C certificate
generator); arrear-clearance status tracker.

### 👪 Parent
Entirely Phase 6A (web) / 8F (mobile) — nothing exists yet, by plan.

---

## 5. Known blockers (deliberately NOT fixed here — owned by roadmap items)

| Blocker | Why deferred | Owner |
|---------|--------------|-------|
| No notification engine | Next phase in roadmap order; touches every module | Phase 3 |
| No test infrastructure (Vitest/Playwright) | Bootstrap is its own work item; both new engines (ciaEngine, coPoEngine) are pure and test-ready | Arch A2 |
| HOD/STAFF/ADMIN enforced app-layer only | DB-level role gating is a coordinated RLS rewrite | Arch A1 |
| No revenue mechanism | Subscriptions/billing | Phase 7E / A7 |
| Leaked-password toggle off; deny-all RLS docs | Recorded with conditions (Pro plan / if mandated) | 7D checklist |

---

## 6. Bottom line

- **10 runtime defects** found; **all fixed** (8 in this audit pass, 2 earlier today),
  including two whole-feature outages (Year Promotion, /admin overview) and two
  long-standing silent failures (hall-ticket student lists, dashboard sessions).
- Root cause of the worst class: **trusting migration files over the live schema**
  after a rename wave. Mitigation now in place: this audit's column map, plus the
  habit (adopted mid-sprint) of verifying live columns before writing queries.
- The build is clean, migration history is clean, the database matches the code.
- Highest-value next moves, in order: **Phase 3 notifications** (every role's #1 UX
  gap), **staff CIA marks entry** (real workflow blocker), **A2 test bootstrap**
  (two pure engines are sitting test-ready).
