[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [03 — Phase 2 Academic Operations](03-phase2-academic-operations.md) (year promotion feeds the alumni pipeline), [02 — Foundation Migrations](02-foundation-migrations.md) (`academic_years`), [06 — Phase 4 Campus Infrastructure](06-phase4-campus-infrastructure.md) (purchase orders referenced by department budgets).
> **Feeds into:** [09 — Phase 7 Super Admin](09-phase7-super-admin.md) (AISHE category/PWD fields, department budgets, staff appraisal NAAC workload reports all surface here).

---

## 🏫 Phase 5 — Admissions, Recruitment & Lifecycle Intake

> **Goal:** Manage the full student and staff lifecycles from first application through onboarding, graduation, and alumni operations. Prospective applicants are filtered in recruitment/admission panels, then onboarded directly.

### Step 5A — Student Admissions System

**Routes:** `/admissions/[institution-slug]` (public) · `/institutions/[id]/admissions` (admin)

> Prospective students apply online; admins shortlist, interview, and enroll — converting applications to student records in one click.

#### Database:
```sql
CREATE TABLE admissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  applicant_name    TEXT NOT NULL,
  applicant_email   TEXT NOT NULL,
  applicant_phone   TEXT,
  program_applied   TEXT NOT NULL CHECK (program_applied IN ('UG','PG')),
  department_id     UUID REFERENCES departments(id),
  dob               DATE,
  address           TEXT,
  previous_school   TEXT,
  marks_percentage  NUMERIC(5,2),
  documents_url     JSONB,
  status            TEXT NOT NULL DEFAULT 'applied'
                    CHECK (status IN ('applied','shortlisted','interview','admitted','rejected','enrolled')),
  admin_notes       TEXT,
  applied_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> **Status:** ✅ **Complete** (migration `20260616000000_phase5a_admissions`).
> Public application form + status-check at `/admissions/[slug]` (no auth — opened
> via middleware `PUBLIC_PREFIXES`; institution + departments resolved with the
> service-role client so anon visitors read only this public data). RLS: anyone may
> INSERT a new application (guarded to `status='applied'` so a direct call can't
> self-admit); admins read + manage. Admin pipeline (Applied → Shortlisted →
> Interview → Admitted → Enrolled, + Rejected) with per-card advance/reject and a
> copyable public link. **One-click Enroll** creates an auth account
> (`admin.auth.admin.createUser`) + profile + student record, generates a roll
> number (`PROG/YYYY/NNNN`), marks the application enrolled, and returns the login +
> temp password for the admin to share. Pure helpers (status flow, stats, roll-no,
> email) unit-tested (8 tests). **Deferred:** automated welcome email (creds shown
> to admin instead); 5A-sub CRM/merit-list.

#### What to build:
- [x] `supabase/migrations/20260616000000_phase5a_admissions.sql` — admissions + RLS (anon apply, admins manage) + indexes
- [x] Supabase Storage bucket: `admissions-documents` — created (public) via migration `20260616010000` with anon-upload + public-read policies; uploaded client-side via `src/lib/storage.ts`
- [x] `src/lib/storage.ts` — `uploadDocument()` / `getDocumentUrl()` helpers
- [x] `src/app/admissions/[slug]/page.tsx` — public application form (sectioned: personal → academic → documents); no auth
- [x] `src/app/admissions/[slug]/status/page.tsx` — applicant status check (email + DOB)
- [x] `src/app/institutions/[id]/admissions/page.tsx` — admin applications kanban + public-link copy + stats
- [x] `src/app/institutions/[id]/admissions/[applicationId]/page.tsx` — application detail + stage controls + notes + enroll
- [x] `src/actions/admissions.ts` — getPublicInstitution, submitApplication, checkApplicationStatus, getApplications, getApplication, updateApplicationStatus, enrollStudent
- [x] `src/components/admissions/ApplicationKanban.tsx` — pipeline columns with click-to-advance (robust over native DnD)
- [x] `src/components/admissions/ApplicationDetail.tsx` — full view with document links + stage/notes controls
- [x] `src/components/admissions/EnrollModal.tsx` — enroll → student + auth account; shows generated credentials (welcome email deferred)

#### Key features:
- Public URL shareable on institution website
- Multi-step wizard with progress bar
- Kanban board for admin (status drag-and-drop)
- One-click Enroll: creates student record, sets roll number, fires welcome email
- Applicant self-status-check without login

---

### Step 5A-sub — Admissions CRM & Merit List

**Route:** `/institutions/[id]/admissions/crm`

> The core admissions form (Step 5A) captures formal applications. This sub-step adds a pre-application enquiry layer (CRM) and a post-application merit list generator. Prospective students enquire months before applying — capturing and nurturing these leads converts to higher enrollment. Merit lists are a statutory requirement for most Indian UG/PG programs.

#### Database:
```sql
CREATE TABLE admission_enquiries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  program_interest TEXT NOT NULL CHECK (program_interest IN ('UG','PG','Diploma','Certificate')),
  department_id    UUID REFERENCES departments(id),
  source           TEXT NOT NULL DEFAULT 'website'
                   CHECK (source IN (
                     'website','walk_in','phone','referral',
                     'social_media','fair','other')),
  enquiry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  follow_up_date   DATE,
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN (
                     'new','contacted','interested',
                     'applied','not_interested','lost')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE admission_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admission_enquiries: institution members can manage"
  ON public.admission_enquiries
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

> **Status:** ✅ **Complete** (migration `20260616020000_admission_enquiries`).
> CRM funnel board (New → Contacted → Interested → Applied, + Not Interested / Lost
> closed lane) with per-card advance, **Convert to Application** (creates an
> `admissions` row, links it back, marks the enquiry applied + audit-logged),
> right-side create/edit drawer, source-breakdown bar chart, and overdue
> follow-up highlighting. Merit list generator filters by programme/department,
> ranks by qualifying marks (no-marks last, ties by name), exports **CSV** and
> **print** (statutory noticeboard), and produces a printable **provisional offer
> letter** per admitted/enrolled candidate. RLS mirrors `admissions`
> (SUPER_ADMIN + INST_ADMIN). PII retention entry added (`admissions-prospects`).
> Admissions sidebar item promoted to a NavGroup (Applications · Enquiries (CRM) ·
> Merit List). Pure helpers unit-tested (16 tests). **Deferred:** offer-acceptance
> → confirmation-fee collection (links to fee structures — tracked for Phase 5
> finance integration); offer letter is generated on demand rather than
> auto-fired on the `admitted` transition.

#### What to build:
- [x] `supabase/migrations/20260616020000_admission_enquiries.sql`
- [x] `src/app/institutions/[id]/admissions/crm/page.tsx` — CRM board: enquiries by status (Kanban), follow-up highlighting, source breakdown chart
- [x] `src/app/institutions/[id]/admissions/crm/merit-list/page.tsx` — Merit list generator: filter by program/department, sort by marks %, ranked list, CSV + print export
- [x] `src/actions/admissionsCRM.ts` — getEnquiries, createEnquiry, updateEnquiry, updateEnquiryStatus, scheduleFollowUp, convertEnquiryToApplication, getMeritList, deleteEnquiry
- [x] `src/lib/admissionsCRM.ts` — pure helpers (funnel flow, stats, source breakdown, follow-up countdown, merit ranking, CSV)
- [x] `src/components/admissions/EnquiryCard.tsx` — Card: name, program, source badge, follow-up countdown
- [x] `src/components/admissions/EnquiryDrawer.tsx` — right-side create/edit drawer
- [x] `src/components/admissions/CrmBoard.tsx` — funnel board + stats + source chart + close controls
- [x] `src/components/admissions/MeritListView.tsx` — ranked table: rank, applicant name, marks %, status, offer-letter action
- [x] `src/components/admissions/OfferLetterTemplate.tsx` — Printable offer letter with institution letterhead, program, intake year
- [x] Enquiry → Application conversion: "Convert" button on enquiry card creates a new row in `admissions` table
- [~] Offer letter trigger: generated on demand from the merit list for admitted/enrolled candidates (auto-fire on `admitted` deferred)

#### Key features:
- CRM funnel: enquiry → contacted → interested → applied → admitted pipeline
- Source tracking: where did the enquiry come from (website, walk-in, social media, fair)
- Follow-up scheduling: set a follow-up date per enquiry; overdue follow-ups highlighted in rose
- Merit list: sort all applicants by qualifying marks % per program; export as PDF for statutory noticeboard posting
- Offer letter: auto-filled with student name, program, institution letterhead, intake year, and fee structure reference
- Admission confirmation fee: offer acceptance triggers fee collection (links to existing fee structures module)

---

### Step 5B — Staff Recruitment Module

**Route:** `/institutions/[id]/recruitment`

> Manage the hiring pipeline for new faculty and staff. From job posting to offer letter. Hired staff convert to main directory profiles.

> **Status:** ✅ **Complete** (commit `3f1f213`).
> `job_postings` (open/on_hold/closed) + `job_applications` (applied→screened→interview→offer→joined/rejected).
> 5-column kanban per posting; interview scheduler (date + notes); offer form (date + terms);
> **one-click Hire** creates auth account + `profiles` + `staff` record (mirrors `enrollStudent`),
> links back via `converted_staff_id`, audit-logged. Recruitment standalone sidebar link.
> `dataRetention.ts` updated with 3-year "recruitment" PII policy. 13 unit tests.

#### What to build:
- [x] `supabase/migrations/20260616030000_recruitment.sql` — `job_postings`, `job_applications` + RLS + indexes
- [x] `src/app/institutions/[id]/recruitment/page.tsx` — Active job postings + pipeline overview (Server Component)
- [x] `src/app/institutions/[id]/recruitment/[jobId]/page.tsx` — Applications list with status kanban + stats
- [x] `src/app/institutions/[id]/recruitment/[jobId]/[applicationId]/page.tsx` — Application detail + interview scheduling + hire
- [x] `src/actions/recruitment.ts` — createJobPosting, updateJobPosting, getJobPostings, getJobPosting, getJobApplications, getJobApplication, createJobApplication, updateApplicationStatus, scheduleInterview, makeOffer, hireApplicant
- [x] `src/components/recruitment/JobPostingCard.tsx` — Role, dept, type (full-time/contract), deadline countdown, app count
- [x] `src/components/recruitment/JobPostingDrawer.tsx` — right-side create/edit drawer
- [x] `src/components/recruitment/RecruitmentBoard.tsx` — client board with stats strip
- [x] `src/components/recruitment/ApplicationPipeline.tsx` — Kanban: Applied → Screened → Interview → Offer → Joined/Rejected
- [x] `src/components/recruitment/ApplicationDetailView.tsx` — pipeline steps + interview scheduler + offer form + hire/reject actions
- [x] `src/components/recruitment/AddApplicantPanel.tsx` — inline drawer to manually add candidates
- [x] `src/components/recruitment/HireDrawer.tsx` — designation, joining date, dept → creates staff account + shows credentials
- [x] Hired applicant → one-click convert to Staff record (mirrors admissions enroll flow)

---

### Step 5C — Non-Teaching Staff & Payroll Integration

**Route:** `/institutions/[id]/staff` (filtered by type)

> Support non-teaching staff (office administrative workers, wardens, hostel mess workers, sweepers, security, and cleaning staff) in the staff directories, user profiles, daily shift tracking, and salary payroll system.

> **Status:** ✅ **Complete** (commit `1f51a4b`).
> DB: `staff_type` TEXT (5-value CHECK, NOT NULL, DEFAULT 'teaching') + `daily_wage_rate` NUMERIC(10,2) added via `apply_migration`. Pure helpers library `src/lib/staffTypes.ts` (labels, colors, isDailyWage, isWarden, computeDailyWageAmount) with 20 unit tests. EditPersonModal + AddPersonModal show staff_type dropdown + conditional daily_wage_rate field. BulkUploadModal STAFF CSV extended to cols 5–6 (staff_type, daily_wage_rate). `updatePersonProfile` patches new fields. `generateMonthlyDisbursements` skips `non-teaching_support` staff. New `generateDailyWageDisbursements(institutionId, month, workingDays)` creates pending disbursements from `daily_wage_rate * workingDays`. Staff portal page is role-aware: non-teaching staff see Quick Links panel (Hostel Management link for wardens, Wage Slips link for support staff, Leave Requests); daily-wage staff see their rate in an info banner.

#### Database:
```sql
-- Differentiate staff classifications
ALTER TABLE public.staff 
  ADD COLUMN IF NOT EXISTS staff_type TEXT DEFAULT 'teaching' 
  CHECK (staff_type IN ('teaching', 'non-teaching_office', 'non-teaching_warden', 'non-teaching_mess', 'non-teaching_support'));

-- Add salary computation factors for non-teaching daily/shift-wage contract staff
ALTER TABLE public.staff 
  ADD COLUMN IF NOT EXISTS daily_wage_rate NUMERIC(10,2) DEFAULT NULL;
```

#### What to build:
- [x] `supabase/migrations/add_staff_type_daily_wage` — Schema updates for `staff_type` and daily wage tracking (applied via MCP apply_migration)
- [x] `src/lib/staffTypes.ts` — pure helpers: StaffType, labels, colors, isNonTeaching, isDailyWage, isWarden, computeDailyWageAmount; 20 Vitest unit tests
- [x] `src/actions/user.ts` — `updatePersonProfile` patches `staff_type` + `daily_wage_rate` for STAFF role
- [x] `src/components/users/EditPersonModal.tsx` + `AddPersonModal.tsx` — staff_type dropdown + conditional daily_wage_rate field
- [x] `src/actions/salary.ts` — `generateMonthlyDisbursements` skips daily-wage staff; new `generateDailyWageDisbursements(institutionId, month, workingDays)`
- [x] `src/components/users/BulkUploadModal.tsx` — STAFF CSV template extended to cols 5-6 (staff_type, daily_wage_rate); parser validates/defaults
- [x] `src/types/staffPortal.ts` + `src/actions/staffPortal.ts` — `getStaffProfile` includes `staff_type` + `daily_wage_rate`
- [x] Staff Portal `/staff-portal` — role-aware dashboard: non-teaching → Quick Links panel (warden: Hostel link; support: Wage Slips link; all: Leave); daily-wage banner shows rate + salary link

---

### Step 5C-sub — Indian Statutory Payroll (TDS / PF / ESI / Form 16)

**Route:** `/institutions/[id]/finance/payroll/statutory`

> Indian colleges must deduct TDS on salaries under Section 192, contribute to EPF, and deduct ESI for eligible employees. Non-compliance attracts heavy penalties from the Income Tax Department, EPFO, and ESIC. This module automates all three statutory deductions and generates Form 16 for each employee at financial year end.

#### Database:
```sql
CREATE TABLE statutory_payroll_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE UNIQUE,
  pf_employer_pct  NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  pf_employee_pct  NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  esi_employer_pct NUMERIC(5,2) NOT NULL DEFAULT 3.25,
  esi_employee_pct NUMERIC(5,2) NOT NULL DEFAULT 0.75,
  esi_wage_ceiling NUMERIC(10,2) NOT NULL DEFAULT 21000,
  tan_number       TEXT,   -- TAN for TDS filings
  pf_number        TEXT,   -- EPF establishment code
  esi_number       TEXT,   -- ESI code number
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_tax_declarations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id             UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  academic_year_id     UUID REFERENCES academic_years(id),
  tax_regime           TEXT NOT NULL DEFAULT 'new' CHECK (tax_regime IN ('old','new')),
  declared_investments JSONB,   -- 80C, 80D, HRA, LTA declarations
  total_declared       NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(staff_id, academic_year_id)
);

CREATE TABLE monthly_statutory_deductions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id         UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id               UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  salary_disbursement_id UUID REFERENCES salary_disbursements(id),
  month                  TEXT NOT NULL,   -- e.g. "2025-07"
  gross_salary           NUMERIC(10,2) NOT NULL,
  basic_salary           NUMERIC(10,2) NOT NULL,
  tds_deducted           NUMERIC(10,2) NOT NULL DEFAULT 0,
  pf_employee            NUMERIC(10,2) NOT NULL DEFAULT 0,
  pf_employer            NUMERIC(10,2) NOT NULL DEFAULT 0,
  esi_employee           NUMERIC(10,2) NOT NULL DEFAULT 0,
  esi_employer           NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_salary             NUMERIC(10,2) NOT NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, month)
);
```

#### ✅ COMPLETE — commit `0ac0995`

#### What was built:
- [x] `supabase/migrations/..._statutory_payroll.sql` — 3 tables + RLS (applied via MCP)
- [x] `src/lib/statutoryPayroll.ts` — pure computation: new/old regime slabs, EPF, ESI, FY helpers; 42 unit tests
- [x] `src/types/finance.ts` — StatutoryPayrollConfig, StaffTaxDeclaration, MonthlyStatutoryDeduction, StatutorySummary types
- [x] `src/actions/statutoryPayroll.ts` — getStatutoryConfig, saveStatutoryConfig, getMonthlyDeductions, getStatutorySummary, getForm16Data, getStaffStatutoryData, upsertTaxDeclaration, runMonthlyStatutoryDeductions
- [x] `src/components/finance/StatutoryConfigPanel.tsx` — collapsible config drawer (PF %, ESI %, TAN/PF/ESI numbers)
- [x] `src/components/finance/StatutoryDeductionTable.tsx` — KPI strip + Run button + router.refresh() + CSV export + staff table with totals
- [x] `src/components/finance/Form16Template.tsx` — per-staff Form 16 Part B with monthly breakdown + TDS summary + print
- [x] `src/components/finance/MonthPicker.tsx` + `FyPicker.tsx` — client-side router-push pickers
- [x] `src/app/institutions/[id]/finance/payroll/statutory/page.tsx` — admin dashboard
- [x] `src/app/institutions/[id]/finance/payroll/statutory/form16/page.tsx` — Form 16 page
- [x] `src/app/staff-portal/tax-declaration/page.tsx` — staff regime selector + history
- [x] `src/components/staff-portal/TaxDeclarationForm.tsx` — old/new regime form + 80C/D/HRA/LTA
- [x] Sidebar: "Statutory" link under Finance; "Tax Declaration" link in staff portal nav
- [x] `src/lib/dataRetention.ts` — statutory tables added to financial-records (7-year policy)
- [x] `tests/unit/statutoryPayroll.test.ts` — 42 tests (all green)

#### Key features:
- TDS: new regime FY 2024-25 (std ₹75K, 87A ≤ ₹7L, 0/5/10/15/20/30% slabs, 4% cess); old regime (std ₹50K, 80C cap ₹1.5L, 80D cap ₹25K, 87A ≤ ₹5L)
- PF: 12% employee + employer capped at EPF wage ceiling (default ₹15K)
- ESI: 0.75%/3.25%, auto-disabled when gross > ₹21,000
- Run deductions: skips daily-wage staff; idempotent (alreadyRun counter)
- Form 16: full financial year breakdown (Apr–Mar) per staff with print support

---

### Step 5D — Alumni System & Panel

**Routes:** `/alumni-portal` (alumni self-service) · `/institutions/[id]/alumni` (admin)

> **Status:** ✅ **Complete** (migration `20260616030000_phase5d_alumni`, commit `035d11a`).

> Graduates from year promotion (Step 2D) land here automatically. Alumni can update their profile; admins can broadcast to batches.

#### ✅ COMPLETE — commit `035d11a`
- Tables `alumni` + `alumni_announcements` with RLS. Directory/announcement reads are scoped by `private.alumni_institution_ids()` (SECURITY DEFINER) so an alumnus can read fellow alumni of their own institution without the policy recursing on the `alumni` table.
- Schema deviation: the spec's `current_role` column is named `current_designation` (`current_role` is a reserved word in Postgres). Added `profile_id` (carried-over login) + `source_student_id` (provenance) beyond the spec.
- **Auth routing:** an active `alumni` row keyed on `profile_id` takes precedence over the retained student row in both `login` and `middleware`, routing the user to `/alumni-portal`; a middleware fence keeps alumni in and non-alumni out.
- **Import Graduates** (in place of an automatic 2D hook): pulls `students.is_graduated = true`, carries over their auth account, skips anyone already imported, and tags a graduation year.
- 12 Vitest unit tests (`tests/unit/alumni.test.ts`); retention entry added to `src/lib/dataRetention.ts`.

#### Database:
```sql
CREATE TABLE alumni (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  roll_no           TEXT,
  program           TEXT,
  department_id     UUID REFERENCES departments(id),
  graduation_year   INTEGER NOT NULL,
  batch             TEXT,
  current_employer  TEXT,
  current_role      TEXT,
  linkedin_url      TEXT,
  city              TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [x] `supabase/migrations/20260616030000_phase5d_alumni.sql`
- [x] `src/app/institutions/[id]/alumni/page.tsx` — Admin alumni directory (filter by batch, dept, year) + stats + CSV + Import Graduates → `AlumniDirectoryView`
- [x] `src/app/institutions/[id]/alumni/announcements/page.tsx` — Broadcast messages to alumni batches → `AlumniAnnouncementsManager`
- [x] `src/app/alumni-portal/layout.tsx` — Alumni portal shell (teal theme) → `AlumniPortalShell`
- [x] `src/app/alumni-portal/page.tsx` — Alumni dashboard: batch stats, recent (audience-matched) announcements
- [x] `src/app/alumni-portal/profile/page.tsx` — Update employer, designation, LinkedIn, city, phone → `AlumniProfileForm`
- [x] `src/app/alumni-portal/directory/page.tsx` — Browse fellow alumni grouped by graduating batch
- [x] `src/actions/alumni.ts` — getAlumniProfile, updateAlumniProfile, getAlumniDirectory, getAlumniForAdmin, createAlumni, updateAlumniAdmin, setAlumniActive, importGraduates, get/send/deleteAlumniAnnouncement
- [x] Login + middleware update: detect active alumni record → redirect to `/alumni-portal`
- [x] `src/lib/alumni.ts` pure helpers + `tests/unit/alumni.test.ts` (12 tests); `src/lib/dataRetention.ts` entry; Sidebar admin Alumni link

#### Key features:
- Auto-populated from year promotion (Step 2D)
- Alumni can update professional info from their portal
- Admin can filter + export alumni list (batch-wise CSV)
- Batch-targeted announcements (e.g., "2022 UG CS batch reunion")
- Alumni directory browsable within same institution

### Step 5E — Staff Appraisal & NAAC Workload Reports

**Route:** `/institutions/[id]/appraisals`

> **Status:** ✅ **Complete** (migration `20260616040000_phase5e_appraisals`, commit `79f8199`).

> Annual staff appraisal system for NAAC compliance. Records teaching performance, research output, and faculty development activities. Generates workload reports showing hours taught vs planned per staff per week.

#### ✅ COMPLETE — commit `79f8199`
- Tables `staff_appraisals` (adds `self_remarks`, `submitted_at`, `reviewed_at` + `unique(staff_id, appraisal_period)` beyond spec) + `staff_appraisal_activities`, with RLS: staff read/edit their own while `pending`/`submitted`; admins (SUPER_ADMIN/INST_ADMIN) manage all; HODs scoped to their department's staff. Admin activity policy's `WITH CHECK` mirrors `USING` (no always-true INSERT path — caught by advisor).
- `appraisal-docs` public storage bucket created in-migration (authenticated upload + public read) for activity proof documents.
- **Scoring:** reviewer assigns teaching/research/admin out of 100; overall is weighted 50/30/20 (`computeOverallScore`), with letter grade bands. Save (→ reviewed) or Finalize (→ completed).
- **Workload report:** `generateWorkloadReport` computes planned weekly hours from `class_schedules` (slot durations) and actual hours from distinct `attendance` sessions (schedule × date) in an optional date range; CSV export.
- Staff self-appraisal portal page; 17 Vitest unit tests (`tests/unit/appraisals.test.ts`); retention entry (`staff-appraisals`, NAAC 2.4).

#### What was built:
- [x] `supabase/migrations/20260616040000_phase5e_appraisals.sql`
- [x] `src/app/institutions/[id]/appraisals/page.tsx` — cycle overview → `AppraisalsOverview` (per-period stats, completion, New Cycle drawer, NAAC CSV)
- [x] `src/app/institutions/[id]/appraisals/[appraisalId]/page.tsx` — review → `AppraisalReviewPanel` (activities + weighted scoring + feedback)
- [x] `src/app/institutions/[id]/appraisals/workload/page.tsx` — `WorkloadTable` (planned vs actual hours, range filter, CSV)
- [x] `src/actions/appraisals.ts` — createAppraisalCycle, getAppraisals/getAppraisal, activities CRUD, submitAppraisal, saveAppraisalRemarks, reviewAppraisal, getMyAppraisals, generateWorkloadReport
- [x] `src/components/appraisals/AppraisalForm.tsx` — staff self-assessment (remarks + activity log + proof upload + submit)
- [x] `src/app/staff-portal/appraisal/page.tsx` — staff portal entry; Sidebar links (admin People group + staff nav)

#### Database:
```sql
CREATE TABLE staff_appraisals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  appraisal_period TEXT NOT NULL,    -- e.g. "2025-2026 Annual"
  teaching_score   NUMERIC(4,2),     -- Out of 100
  research_score   NUMERIC(4,2),
  admin_score      NUMERIC(4,2),
  overall_score    NUMERIC(4,2),
  feedback         TEXT,
  appraised_by     UUID REFERENCES staff(id),  -- HOD or Principal
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','submitted','reviewed','completed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE staff_appraisal_activities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id     UUID NOT NULL REFERENCES staff_appraisals(id) ON DELETE CASCADE,
  activity_type    TEXT NOT NULL CHECK (activity_type IN (
                     'paper_published','conference','fdp','workshop',
                     'award','project','patent','other')),
  title            TEXT NOT NULL,
  description      TEXT,
  date_of_activity DATE,
  document_url     TEXT   -- Proof document via Supabase Storage
);
```

#### Key features:
- Self-appraisal: staff log their own activities (papers, FDPs, conferences, awards)
- HOD reviews self-appraisal and assigns final scores
- Workload report: cross-references class_schedules with actual attendance to calculate hours taught
- NAAC export: academic performance indicators per faculty (API format)
- Document upload for activity proof (via Supabase Storage `appraisal-docs` bucket)

---

### Step 5F — Placement Cell & Career Services

**Route:** `/institutions/[id]/placements`

> **Status:** ✅ **Complete** (migration `20260616050000_phase5f_placements`, commit `8a43dea`).

> Single most important module for college reputation and NIRF rankings. Tracks every placement drive from company onboarding to offer letters. Feeds NIRF Criterion 5.2 (Student Progression).

#### ✅ COMPLETE — commit `8a43dea`
- Tables `companies`, `placement_drives` (+ `is_exclusive`, `created_at`), `placement_registrations` (+ `notes`, `registered_at`) with RLS: institution members read drives/companies; students see + register their own; admins manage all in their institution.
- Eligibility (`checkEligibility`): department enforced strictly (data we hold); `min_cgpa`/`no_backlogs` are advisory (students have no stored CGPA/backlog columns, so they only block when a value is known). Exclusivity blocks already-placed students from re-registering on exclusive drives.
- Stage pipeline registered → shortlisted → interviewed → offered → placed (+ rejected). Stage change fires an in-app notification to the student (`type: "placement"`).
- Statistics computed at query time from registrations + drives + departments → institution KPIs (placement %, avg/highest CTC over distinct placed students) + department-wise breakdown + NIRF CSV.
- Student portal: eligibility-gated one-click register, live stage display; 23 Vitest unit tests; dataRetention entry (NIRF 5.2).

#### What was built:
- [x] `supabase/migrations/20260616050000_phase5f_placements.sql`
- [x] `src/app/institutions/[id]/placements/page.tsx` → `PlacementDashboard` (+ `PlacementStatsCard`)
- [x] `src/app/institutions/[id]/placements/drives/[driveId]/page.tsx` → `DriveDetailView` (registration pipeline + stage updates)
- [x] `src/app/institutions/[id]/placements/companies/page.tsx` → `CompaniesManager`
- [x] `src/app/institutions/[id]/placements/statistics/page.tsx` → `PlacementStatistics` (dept-wise + NIRF CSV)
- [x] `src/actions/placements.ts` — companies/drives CRUD, getDriveRegistrations, updateStageStatus (+ notify), updateDriveStatus, getPlacementStats, getDrivesForStudent, registerForDrive
- [x] Student portal: `src/app/student-portal/placements/page.tsx` → `StudentPlacementsView`; Sidebar links (admin + student nav)

#### Database:
```sql
CREATE TABLE companies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  industry         TEXT,
  website          TEXT,
  hr_contact_name  TEXT,
  hr_contact_email TEXT,
  hr_contact_phone TEXT
);

CREATE TABLE placement_drives (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  company_id           UUID NOT NULL REFERENCES companies(id),
  academic_year_id     UUID REFERENCES academic_years(id),
  drive_date           DATE NOT NULL,
  job_role             TEXT NOT NULL,
  ctc_offered          NUMERIC(10,2),   -- in LPA
  eligibility_criteria JSONB,           -- { min_cgpa: 7.0, no_backlogs: true, departments: [] }
  process_stages       JSONB,           -- ["Resume Screening", "Aptitude", "Technical", "HR"]
  status               TEXT NOT NULL DEFAULT 'scheduled'
                       CHECK (status IN ('scheduled','ongoing','completed','cancelled'))
);

CREATE TABLE placement_registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id     UUID NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stage_status TEXT NOT NULL DEFAULT 'registered'
               CHECK (stage_status IN ('registered','shortlisted','interviewed','offered','rejected','placed')),
  offer_ctc    NUMERIC(10,2),
  placed_at    TIMESTAMPTZ,
  UNIQUE(drive_id, student_id)
);
```

#### Key features:
- Full pipeline: company → drive → registration → stage tracking → placed
- Eligibility auto-check against student CGPA, backlogs, department, year
- "Already placed" flag: blocks re-registration on exclusive drives
- Placement statistics NIRF-ready export (Criterion 5.2)
- Student portal: real-time stage update notifications

---

### Step 5G — Scholarship Management

**Route:** `/institutions/[id]/scholarships`

> **Status:** ✅ **Complete** (migration `20260616060000_phase5g_scholarships`, commit `ebd5caf`).

> Most Indian colleges manage multiple government schemes — SC/ST, OBC, merit, minority, sports quota scholarships. Manual tracking is error-prone. Auto-eligibility checks and fee integration save hours of admin work.

#### ✅ COMPLETE — commit `ebd5caf`
- Tables `scholarship_schemes` (8 scheme types + eligibility JSONB) + `scholarship_applications` (applied → verified → approved → rejected → disbursed) with RLS: members read schemes; students read/apply their own; admins manage all. `scholarship-docs` public bucket for proof uploads.
- **Eligibility** (`checkEligibility`): category enforced strictly (students hold `category`); min-marks and income-limit are advisory (no stored marks/income columns → only block when the value is known, verified from proof docs at the verification step).
- **Fee integration:** disbursing creates an **approved `fee_concession`** (type mapped from the scheme via `concessionTypeForScheme` — sports→sports_quota, merit→merit, else other) so the amount is deducted from the student's dues; audited (Dev Rule 13) and an in-app notification is sent (`type: "scholarship"`).
- Student portal: eligibility-gated apply with proof-document upload + status/disbursement tracking. `EligibilityChecker` component reused in admin + student views; 13 Vitest tests; dataRetention entry (8-yr govt audit).
- **Deferred:** WhatsApp notification on approval/disbursement (Phase 3C SMS/WhatsApp remains deferred platform-wide) — in-app notification is wired.

#### What was built:
- [x] `supabase/migrations/20260616060000_phase5g_scholarships.sql`
- [x] `src/app/institutions/[id]/scholarships/page.tsx` → `ScholarshipsDashboard` (+ `SchemeDrawer`)
- [x] `src/app/institutions/[id]/scholarships/[schemeId]/page.tsx` → `SchemeApplications` (verify/approve/disburse)
- [x] `src/actions/scholarships.ts` — schemes CRUD, getApplications/getSchemeApplications, updateApplicationStatus, disburseScholarship (+ fee_concession), getAvailableSchemes, applyForScholarship, getMyScholarshipApplications
- [x] `src/components/scholarships/EligibilityChecker.tsx`
- [x] Student portal: `src/app/student-portal/scholarships/page.tsx` → `StudentScholarshipsView`; Sidebar links (admin + student nav)
- [x] Fee integration: approved disbursement → approved `fee_concession` reduces dues

#### Database:
```sql
CREATE TABLE scholarship_schemes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  scheme_type          TEXT NOT NULL CHECK (scheme_type IN (
                         'government_central','government_state','institutional',
                         'private','sports','merit','minority','sc_st_obc')),
  eligibility_criteria JSONB,    -- { min_marks: 60, categories: ["SC","ST"], income_limit: 250000 }
  amount_per_student   NUMERIC(10,2),
  renewable            BOOLEAN NOT NULL DEFAULT TRUE,
  application_deadline DATE
);

CREATE TABLE scholarship_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  scheme_id        UUID NOT NULL REFERENCES scholarship_schemes(id),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  documents_url    JSONB,
  status           TEXT NOT NULL DEFAULT 'applied'
                   CHECK (status IN ('applied','verified','approved','rejected','disbursed')),
  disbursed_amount NUMERIC(10,2),
  disbursed_at     TIMESTAMPTZ,
  admin_notes      TEXT,
  UNIQUE(scheme_id, student_id, academic_year_id)
);
```

#### Key features:
- Auto-eligibility check against student profile (category, marks, income limit)
- Scholarship amount auto-adjusts fee dues in finance module
- Document upload for proof (via Supabase Storage)
- Disbursement tracking and reporting
- WhatsApp notification on approval and disbursement (Phase 3C)

---

### Step 5H — Disciplinary Records & Anti-Ragging

**Route:** `/institutions/[id]/disciplinary`

> **Status:** ✅ **Complete** (migration `20260616070000_phase5h_disciplinary`, commit `8c5b3e9`).

> UGC mandates an anti-ragging committee and formal disciplinary mechanism. NAAC Criterion 6.2 requires documented evidence of grievance/disciplinary actions taken.

#### ✅ COMPLETE — commit `8c5b3e9`
- Tables `disciplinary_incidents` + `disciplinary_actions` with **confidentiality-first RLS**: any institution member (student/staff/admin) may INSERT a report (`status='reported'`), but only admins (INST_ADMIN/SUPER_ADMIN) can SELECT/UPDATE/DELETE incidents and manage actions. Students have **no read access** to incidents.
- **Anonymous reporting:** when a student chooses anonymity, `reported_by` is stored NULL and the insert deliberately does not `.select()` the row back (no read access) — the complainant's identity is never persisted.
- Admin: incident register (type/status/search filters, stats, report drawer, NAAC 6.2 CSV) · incident detail (status `reported→under_review→resolved/escalated` + committee remarks + action summary; recorded `disciplinary_actions` with suspension duration / fine; **printable warning letter** via a browser print view) · UGC anti-ragging register (ragging-only view + resolution stats).
- **Warning letters** are generated via a client print view (a new window with formatted letter → `window.print()`) rather than a public storage bucket — avoids exposing sensitive disciplinary letters by URL. The full certificate-module PDF path remains for Step 6C.
- Student portal anonymous reporting form; 9 Vitest tests; dataRetention entry (7-yr, UGC/NAAC 6.2, no complainant identity).

#### What was built:
- [x] `supabase/migrations/20260616070000_phase5h_disciplinary.sql`
- [x] `src/app/institutions/[id]/disciplinary/page.tsx` → `IncidentRegister`
- [x] `src/app/institutions/[id]/disciplinary/[incidentId]/page.tsx` → `IncidentDetail` (status + actions + warning-letter print)
- [x] `src/app/institutions/[id]/disciplinary/anti-ragging/page.tsx` → `AntiRaggingRegister`
- [x] `src/actions/disciplinary.ts` — reportIncident, submitReport (student anonymous), updateIncidentStatus, recordAction/getActions/deleteAction, getIncidents/getIncident
- [x] Student portal: `src/app/student-portal/anti-ragging/page.tsx` → `StudentReportForm`; Sidebar links (admin Institution group + student nav)
- [~] Warning letter PDF via certificate module (Step 6C) — print-view stand-in shipped; full certificate integration deferred to 6C
- [x] NAAC Criterion 6.2 evidence export (incident register CSV)

#### Database:
```sql
CREATE TABLE disciplinary_incidents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  reported_by      UUID REFERENCES auth.users(id),
  student_id       UUID REFERENCES students(id),
  incident_type    TEXT NOT NULL CHECK (incident_type IN (
                     'misconduct','ragging','attendance_violation',
                     'exam_malpractice','property_damage','other')),
  incident_date    DATE NOT NULL,
  description      TEXT NOT NULL,
  is_anonymous     BOOLEAN NOT NULL DEFAULT FALSE,
  status           TEXT NOT NULL DEFAULT 'reported'
                   CHECK (status IN ('reported','under_review','resolved','escalated')),
  committee_remarks TEXT,
  action_taken     TEXT,
  resolved_at      TIMESTAMPTZ
);

CREATE TABLE disciplinary_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id  UUID NOT NULL REFERENCES disciplinary_incidents(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL CHECK (action_type IN (
                 'verbal_warning','written_warning','suspension',
                 'fine','expulsion','counseling','other')),
  effective_date DATE NOT NULL,
  duration_days  INTEGER,
  fine_amount    NUMERIC(8,2),
  issued_by      UUID REFERENCES staff(id),
  document_url   TEXT   -- Warning letter PDF
);
```

#### Key features:
- Anonymous reporting protects complainant identity (no student_id stored for anonymous reports)
- Warning/suspension letters auto-generated and linked to certificate system
- UGC anti-ragging register format
- NAAC evidence: number of cases, resolution rate, action types

---

### Step 5I — Research & Publications Management

**Route:** `/institutions/[id]/research`

> **Status:** ✅ **Complete** (migration `20260616080000_phase5i_research`, commit `aaf9778`).

> NAAC Criterion 3 is entirely about Research & Innovation. Tracks staff research projects, publications, funding grants, and patents. Links to Staff Appraisal (Step 5E) for NAAC API data.

#### ✅ COMPLETE — commit `aaf9778`
- Tables `research_projects` (adds `funding_spent` beyond spec, for sanctioned-vs-utilised tracking) + `publications` with RLS: institution members read; **staff manage their OWN publications** (`staff_id` ↔ their staff row); admins manage all. `research-docs` public bucket for publication PDFs.
- **Appraisal auto-link (5E):** when a staff member logs a publication from their portal, a matching `paper_published` activity is auto-created on their open (`pending`/`submitted`) appraisal — best-effort, so they never enter the same evidence twice.
- Admin: research dashboard (active/completed projects, funding sanctioned/utilised, publications, Scopus/UGC/patents KPIs + faculty research leaderboard) · projects registry (PI, co-investigators, grant tracking, status) · publications directory with Scopus / UGC-CARE / type / year filters + **NIRF Criterion 3 CSV export**.
- `src/lib/research.ts` pure helpers (`researchStats`, `publicationsByFaculty`, `publicationsCSV`); 9 Vitest tests; dataRetention entry (NAAC 3, permanent).
- **Deferred:** h-index per faculty needs citation data (not stored) — impact-factor aggregates shipped instead.

#### What was built:
- [x] `supabase/migrations/20260616080000_phase5i_research.sql`
- [x] `src/app/institutions/[id]/research/page.tsx` — dashboard (KPIs + faculty leaderboard)
- [x] `src/app/institutions/[id]/research/projects/page.tsx` → `ProjectsRegistry` (+ `ProjectDrawer`)
- [x] `src/app/institutions/[id]/research/publications/page.tsx` → `PublicationsDirectory` (+ `PublicationDrawer`, NIRF CSV)
- [x] `src/actions/research.ts` — projects CRUD, publications CRUD, getMyPublications, addMyPublication (auto-links appraisal), deleteMyPublication
- [x] Staff portal: `src/app/staff-portal/research/page.tsx` → `StaffPublications` (auto-links to Appraisal 5E); Sidebar links (admin + staff nav)
- [x] NIRF Research & Innovation export (Criterion 3 CSV)

#### Database:
```sql
CREATE TABLE research_projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id          UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title                   TEXT NOT NULL,
  principal_investigator  UUID REFERENCES staff(id),
  co_investigators        JSONB,      -- Array of staff_ids
  funding_agency          TEXT,
  funding_amount          NUMERIC(12,2),
  start_date              DATE,
  end_date                DATE,
  status                  TEXT NOT NULL DEFAULT 'ongoing'
                          CHECK (status IN ('proposed','ongoing','completed','published')),
  department_id           UUID REFERENCES departments(id)
);

CREATE TABLE publications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id       UUID NOT NULL REFERENCES staff(id),
  title          TEXT NOT NULL,
  pub_type       TEXT NOT NULL CHECK (pub_type IN (
                   'journal','conference','book','book_chapter','patent','other')),
  journal_name   TEXT,
  publisher      TEXT,
  pub_year       INTEGER NOT NULL,
  doi            TEXT,
  scopus_indexed BOOLEAN DEFAULT FALSE,
  ugc_listed     BOOLEAN DEFAULT FALSE,
  impact_factor  NUMERIC(6,3),
  authors        JSONB,     -- Array of author names
  document_url   TEXT
);
```

#### Key features:
- Scopus/UGC-listed flag for publications (critical for NAAC scoring)
- Research funding tracking: grants received vs spent
- Publications auto-link to Staff Appraisal (Step 5E) to avoid duplicate entry
- NIRF Criterion 3 data export
- Impact factor and h-index tracking per faculty

---

### Step 5J — Staff Daily Attendance & LOP Tracking

**Route:** `/institutions/[id]/staff-attendance`

> **Status:** ✅ **Complete** (migration `20260616090000_phase5j_staff_attendance`, commit `f3f6667`).

> The existing attendance system tracks student attendance per class session. This separate
> module tracks whether each staff member is present on campus each working day. Required for
> payroll accuracy (absent days without approved leave are deducted as LOP), leave balance
> validation, and NAAC Criterion 2.4 (Teacher Quality evidence).

#### ✅ COMPLETE — commit `f3f6667`
- Table `staff_attendance` (`unique(staff_id, date)`) with RLS: staff read their own; admins manage all; HODs manage their department's staff. The spec's single permissive member-policy was tightened to this role-scoped model.
- Admin daily register: one-click **"mark all present"** (skips anyone already marked), then set per-staff exceptions (absent / half-day / late / on-duty). `on_leave` and `holiday` rows are locked from manual edit.
- Monthly report: per-staff present/absent/half/late/leave + **LOP days** + attendance %; institution **NAAC 2.4 average attendance**; CSV export.
- **Leave cross-reference:** `reviewLeaveRequest` (Step 1A) now auto-upserts `on_leave` rows for every date in an approved leave range — best-effort/guarded so it never breaks the approval.
- **Payroll integration:** `generateMonthlyDisbursements` deducts LOP (`absent + half/2` days × `net ÷ days-in-month`) from `amount_disbursed`. **Additive & guarded** — with no `staff_attendance` data, LOP = 0 and payroll is byte-for-byte unchanged (fully backward-compatible).
- Staff portal personal view at **`/staff-portal/my-attendance`** (a new route — the existing `/staff-portal/attendance` class-marking page is untouched), with an LOP warning that prompts leave regularisation. 11 Vitest tests; dataRetention entry (5-yr).

#### What was built:
- [x] `supabase/migrations/20260616090000_phase5j_staff_attendance.sql`
- [x] `src/app/institutions/[id]/staff-attendance/page.tsx` → `DailyRegister`
- [x] `src/app/institutions/[id]/staff-attendance/reports/page.tsx` → `MonthlyReport`
- [x] `src/actions/staffAttendance.ts` — getDailyRegister, markStaffAttendance, bulkMarkPresent, getMonthlyReport, getMyAttendance
- [x] Staff portal: `src/app/staff-portal/my-attendance/page.tsx` → `MyAttendanceView`; Sidebar links (admin People group + staff nav)
- [x] Payroll integration (LOP deduction in `salary.ts`) + leave cross-reference (`staffPortal.ts`)
- [x] NAAC Criterion 2.4 — institution average teacher-attendance metric

#### Database:
```sql
CREATE TABLE staff_attendance (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id       UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  check_in_time  TIME,
  check_out_time TIME,
  status         TEXT NOT NULL DEFAULT 'present'
                 CHECK (status IN (
                   'present','absent','half_day','late',
                   'on_duty','on_leave','holiday')),
  late_reason    TEXT,
  remarks        TEXT,
  logged_by      UUID REFERENCES auth.users(id),   -- manual override by admin/HOD
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, date)
);
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_attendance: institution members can manage"
  ON public.staff_attendance
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### Key features:
- Daily register with one-click bulk-mark all present; admin marks exceptions only
- LOP auto-calculation: absent days with no approved leave → deducted during payroll run
- Late arrival tracking with reason field
- Monthly report: present %, late count, LOP days, leave days per staff
- NAAC Criterion 2.4: average teacher attendance % as an institution-wide metric

---

### Step 5K — Staff Career Lifecycle Management

**Route:** `/institutions/[id]/staff/career`

> **Status:** ✅ **Complete** (migration `20260618000000_phase5k_staff_career`, commit `29752a9`).

> Staff join, get promoted, receive increments, transfer departments, and eventually resign or
> retire. Without a lifecycle log there is no seniority data for salary increments, no paper
> trail for promotions, and no formal offboarding to trigger the Relieving Letter in the
> Certificate module (Step 6C). This module provides the complete audit trail.

#### ✅ COMPLETE — commit `29752a9`
- Table `staff_career_events` + RLS (staff read own via `profile_id`; admins manage all; HODs scoped to their department's staff — same `private.get_user_authorizations()` pattern as Phase 5J) + `staff-career-docs` public storage bucket for scanned order/letter uploads.
- **Increment workflow:** mirrors `createSalaryStructure`'s versioned pattern — deactivates the staff member's current active `salary_structures` row (`effective_to` = event date) and inserts a new one carrying forward HRA/TA/DA/deductions with the updated `basic_salary`. Errors clearly if no active structure exists yet (admin must create one in Salaries first — `net_salary` is a generated column and cannot be set directly).
- **Promotion** updates `staff.designation`; **transfer** updates `staff.department_id` (auto-resolves the new department's name for the `new_value` display field); **resignation/retirement/termination** set `staff.is_active = false`. All four paths call `logAudit()` (Dev Rule 13 extended to cover `staff` designation/department_id/is_active and `salary_structures`).
- `previous_value`/`new_value` auto-derive from the staff record's prior state when not explicitly supplied (e.g. previous designation, prior department name, prior salary formatted in `en-IN`).
- Admin: career events log (`CareerEventsLog`) — stat cards (total/promotions/increments/offboarded), event-type + search filters, NAAC CSV export, "Record Event" drawer (staff picker, event-type-conditional fields, document upload). Per-staff timeline page (`StaffCareerDetail`) — service-years badge, quick Resignation/Retirement confirm-dialog shortcuts, vertical `CareerTimeline`.
- Staff portal: read-only `/staff-portal/career` ("My Career") — own joining date, designation, department, service years, and full event timeline.
- Pure helpers `src/lib/staffCareer.ts` (event types/labels/colors, `serviceYears()`, `careerStats`, `filterCareerEvents`, `careerEventsCSV`); 23 unit tests. `dataRetention.ts` entry (permanent — NAAC 2.4 faculty stability evidence).
- **Deferred:** auto-creating a Relieving Letter request on resignation/retirement — the Certificate module (Step 6C) does not exist yet; will be wired when 6C ships. Appraisal-triggered increment/promotion (HOD shortcut from a completed 5E review) also deferred — `recordCareerEvent` is ready to be called from that flow once prioritized.

#### Database:
```sql
CREATE TABLE staff_career_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL CHECK (event_type IN (
                     'joining','confirmation','promotion','increment',
                     'transfer','resignation','retirement','termination','other')),
  effective_date   DATE NOT NULL,
  previous_value   TEXT,    -- e.g. old designation, old salary, old department
  new_value        TEXT,    -- e.g. new designation, revised salary, new department
  order_number     TEXT,    -- Official order/letter reference number
  document_url     TEXT,    -- Scanned order PDF via Supabase Storage
  remarks          TEXT,
  recorded_by      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE staff_career_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_career_events: institution members can manage"
  ON public.staff_career_events
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### What to build:
- [x] `supabase/migrations/20260618000000_phase5k_staff_career.sql`
- [x] `src/app/institutions/[id]/staff/career/page.tsx` — Career events log: filter by event_type + search; department filter available server-side via `getCareerEvents`
- [x] `src/app/institutions/[id]/staff/career/[staffId]/page.tsx` — Individual staff career timeline: chronological events from joining to present
- [x] `src/actions/staffCareer.ts` — recordCareerEvent, getCareerTimeline, getCareerEvents, getMyCareerTimeline, processResignation, processRetirement, getServiceYears
- [x] `src/components/staff/CareerTimeline.tsx` — Vertical timeline: event type badge, old→new value, effective date, document link
- [x] Increment workflow: recording an `increment` event creates a new `salary_structures` row (no `staff.salary` column exists — salary lives in `salary_structures`, see commit note above) — no separate manual edit needed
- [~] Resignation / Retirement workflow: sets `staff.is_active = false`; auto-creating a Relieving Letter request deferred — Certificate module (Step 6C) doesn't exist yet
- [x] Staff portal: `src/app/staff-portal/career/page.tsx` — Staff views their own career history (joining date, confirmations, promotions) — read-only
- [~] Appraisal integration (Step 5E): deferred — `recordCareerEvent` is ready to be called from a completed appraisal review once prioritized
- [x] Seniority calculation: `serviceYears()` derives years of service from `staff.joining_date`, shown on both admin and staff-portal views

#### Key features:
- Full audit trail: every career change recorded with effective date, before/after values, and document reference number
- Increment auto-updates salary record in the staff profile — single source of truth
- Resignation triggers staff deactivation + automatic Relieving Letter certificate request
- Staff can view their own career history in the staff portal (read-only)
- NAAC Criterion 2.4: faculty stability and promotion data for accreditation evidence

---

### Step 5L — Department Budget Management

**Route:** `/institutions/[id]/finance/budgets`

> Institutions allocate annual budgets per department. HODs plan expenditure, admin approves, and the system tracks actual spend vs budget in real time. Integrates with Expense Logger (core) and Purchase Orders (4E-sub) for actuals. NAAC Criterion 6.4 (Financial Management) requires evidence of budget planning and utilisation.

#### Database:
```sql
CREATE TABLE department_budgets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id    UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  total_allocated  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','submitted','approved','rejected')),
  submitted_by     UUID REFERENCES staff(id),
  approved_by      UUID REFERENCES auth.users(id),
  admin_notes      TEXT,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(department_id, academic_year_id)
);
ALTER TABLE department_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "department_budgets: institution members can manage"
  ON public.department_budgets
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE TABLE budget_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   UUID NOT NULL REFERENCES department_budgets(id) ON DELETE CASCADE,
  category    TEXT NOT NULL CHECK (category IN (
                'lab_equipment','stationery','furniture','it_hardware',
                'software','maintenance','travel','training','events','other')),
  description TEXT NOT NULL,
  planned_amt NUMERIC(10,2) NOT NULL,
  actual_amt  NUMERIC(10,2) NOT NULL DEFAULT 0,  -- updated by expense/PO actuals
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "budget_line_items: institution members can manage"
  ON public.budget_line_items
  USING (budget_id IN (
    SELECT id FROM department_budgets WHERE institution_id IN (
      SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
    )
  ));
```

#### What to build:
- [x] `supabase/migrations/20260619000000_phase5l_department_budgets.sql` — `department_budgets` + `budget_line_items` + RLS. Also **drops the legacy `public.budgets` table** (from `20260512000000_finance_module`) — that table's consumer code referenced a text `academic_year` column that was never created (only `academic_year_id` existed), so the original "Set Budgets" / "Budget vs Actuals" / "Budget Report" feature was silently broken since launch (0 rows ever written). Retired entirely in favour of this module rather than patched.
- [x] `src/app/institutions/[id]/finance/budgets/page.tsx` — Budget overview: all departments, allocated vs spent progress bars, approval status, AY selector, CSV export
- [x] `src/app/institutions/[id]/finance/budgets/[departmentId]/page.tsx` — Department budget detail: line items, actuals, submit/approve/reject actions
- [x] `src/actions/budgets.ts` — `getOrCreateDepartmentBudget`, `getDepartmentBudgets`, `addLineItem`/`updateLineItem`/`deleteLineItem`, `updateLineItemActual`, `submitBudget`, `approveBudget`, `rejectBudget`, `refreshActuals`
- [x] `src/components/finance/BudgetsOverview.tsx` — Department cards: total allocated, total spent, utilisation % progress bar (inline, no separate BudgetCard file)
- [x] `src/components/finance/BudgetDetail.tsx` — Line items table: category, planned, actual (editable), variance (colour-coded), KPI cards
- [~] HOD access: HODs draft/submit their own department's budget via the same admin route — RLS (`HOD`/`DEPARTMENT_HEAD` scoped by `department_id`) restricts what they can touch; no separate staff-portal HOD page built
- [x] Actuals integration: `refreshActuals` auto-syncs `budget_line_items.actual_amt` from the expense logger for categories with a direct mapping (`stationery`, `maintenance`, `events`, `it_hardware`→`it`, `other`); unmapped categories (`lab_equipment`, `furniture`, `travel`, `training`, `software`) stay manual since there's no reliable automatic attribution. Purchase order spend (4E-sub) is surfaced as a department-level figure for manual review rather than auto-attributed to a specific line item (POs have no per-category breakdown)
- [~] NAAC Criterion 6.4 export: CSV export built (`budgetsCSV`); not packaged as a formatted Excel/PDF

#### Key features:
- Draft → Submitted → Approved/Rejected workflow (HOD drafts, admin approves/rejects with a required reason); approve/reject is gated in the Server Action layer, not RLS, so HODs cannot self-approve
- Category-wise breakdown (lab equipment, IT, travel, events, etc.)
- Actuals pulled from expense logger where a category mapping exists; PO spend flagged separately for manual review
- Variance highlighting: over-budget line items shown in rose, under-budget in emerald
- NAAC 6.4 evidence: budget utilisation exportable as CSV
- Replaces the legacy, broken "Set Budgets" feature (Expenses page) and "Budget Report" tab (Reports page) entirely

---

### Phase 5 Completion Checklist
- [ ] Admissions public form live and accepting applications
- [ ] Enroll actions correctly create student and staff profiles
- [ ] Non-teaching staff classified and fully supported in payroll disbursements
- [ ] Alumni auto-populated from year promotion workflow
- [ ] Alumni portal accessible with `aura-role=alumni` cookie
- [ ] Appraisal cycles created and workload report generating from live schedule data
- [ ] Placement cell: drives, registrations, and NIRF statistics export working
- [ ] Scholarships: auto-eligibility check and fee-integration working
- [ ] Disciplinary: incident register and anti-ragging committee register working
- [ ] Research: publications with Scopus/UGC flags and NIRF export working
- [ ] Staff daily attendance register live; LOP auto-calculation integrated with payroll run
- [ ] Staff career lifecycle: joining events seeded for all existing staff; increment and resignation workflows working end-to-end
- [ ] Department budgets: at least one budget submitted and approved; actuals pulling from expense logger
- [ ] `git commit -m "feat: Phase 5 — Admissions, Recruitment & Alumni complete"`
- [ ] `git push origin main`

---

