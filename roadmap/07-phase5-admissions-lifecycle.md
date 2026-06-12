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

#### What to build:
- [ ] `supabase/migrations/..._admissions.sql`
- [ ] Supabase Storage bucket: `admissions-documents` (policy: authenticated write, public read for issued documents)
- [ ] `src/lib/storage.ts` — uploadDocument(), getDocumentUrl() helpers using Supabase Storage client
- [ ] `src/app/admissions/[slug]/page.tsx` — Public application form (no auth required)
- [ ] `src/app/admissions/[slug]/apply/page.tsx` — Multi-step application wizard (personal → academic → documents → submit)
- [ ] `src/app/admissions/[slug]/status/page.tsx` — Applicant status check page (enter email + DOB)
- [ ] `src/app/institutions/[id]/admissions/page.tsx` — Admin: applications kanban (Applied → Shortlisted → Interview → Admitted → Enrolled)
- [ ] `src/app/institutions/[id]/admissions/[applicationId]/page.tsx` — Application detail + action buttons
- [ ] `src/actions/admissions.ts` — submitApplication, updateStatus, enrollStudent (converts application → student record)
- [ ] `src/components/admissions/ApplicationKanban.tsx` — Drag-and-drop status pipeline
- [ ] `src/components/admissions/ApplicationDetail.tsx` — Full application view with document previews
- [ ] `src/components/admissions/EnrollModal.tsx` — Confirm enrollment: auto-creates student + Supabase auth account + sends welcome email

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

#### What to build:
- [ ] `supabase/migrations/..._admission_enquiries.sql`
- [ ] `src/app/institutions/[id]/admissions/crm/page.tsx` — CRM board: enquiries by status (Kanban), follow-up calendar, source breakdown chart
- [ ] `src/app/institutions/[id]/admissions/crm/merit-list/page.tsx` — Merit list generator: filter by program/department, sort by marks %, generate ranked list, export as PDF
- [ ] `src/actions/admissionsCRM.ts` — createEnquiry, updateEnquiryStatus, scheduleFollowUp, generateMeritList, exportMeritListPDF, generateOfferLetter
- [ ] `src/components/admissions/EnquiryCard.tsx` — Card: name, program, source badge, last-contact date, follow-up countdown
- [ ] `src/components/admissions/MeritListTable.tsx` — Ranked table: rank, applicant name, marks %, category, offer status
- [ ] `src/components/admissions/OfferLetterTemplate.tsx` — Printable offer letter with institution letterhead, program, intake year, fee structure reference
- [ ] Enquiry → Application conversion: "Convert to Application" button on enquiry card creates a new row in `admissions` table
- [ ] Offer letter trigger: when application status moves to `admitted`, offer letter auto-generated and linked to the record

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

#### What to build:
- [ ] `supabase/migrations/..._recruitment.sql` — `job_postings`, `job_applications` (applicant details, CV URL, status)
- [ ] `src/app/institutions/[id]/recruitment/page.tsx` — Active job postings + pipeline overview
- [ ] `src/app/institutions/[id]/recruitment/[jobId]/page.tsx` — Applications list with status kanban
- [ ] `src/app/institutions/[id]/recruitment/[jobId]/[applicationId]/page.tsx` — Application detail + interview scheduling
- [ ] `src/actions/recruitment.ts` — createJobPosting, updateApplicationStatus, scheduleInterview
- [ ] `src/components/recruitment/JobPostingCard.tsx` — Role, dept, type (full-time/contract), deadline
- [ ] `src/components/recruitment/ApplicationPipeline.tsx` — Kanban: Applied → Screened → Interview → Offer → Joined/Rejected
- [ ] Hired applicant → one-click convert to Staff record (mirrors admissions enroll flow)

---

### Step 5C — Non-Teaching Staff & Payroll Integration

**Route:** `/institutions/[id]/staff` (filtered by type)

> Support non-teaching staff (office administrative workers, wardens, hostel mess workers, sweepers, security, and cleaning staff) in the staff directories, user profiles, daily shift tracking, and salary payroll system.

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
- [ ] `supabase/migrations/..._non_teaching_staff.sql` — Schema updates for `staff_type` and daily wage tracking
- [ ] `src/app/institutions/[id]/staff/page.tsx` — Onboarding/Edit Modals: update profile edits to select and configure `staff_type` and daily wage details
- [ ] `src/actions/salary.ts` — Update payroll run logic to support daily-wage multiplication based on attendance counts for support staff
- [ ] `src/components/users/BulkUploadModal.tsx` — Add `staff_type` mapping column to the CSV template for bulk onboarding of non-teaching personnel
- [ ] Staff Portal: `/staff-portal` — Customized dashboards for non-teaching roles:
  - Office Staff: view admin workflows and tasks
  - Wardens: quick-link widget to hostel room occupancy grid
  - Mess Workers: meal schedule planner
  - Support Staff: shift history and wage reports

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

#### What to build:
- [ ] `supabase/migrations/..._statutory_payroll.sql`
- [ ] `src/app/institutions/[id]/finance/payroll/statutory/page.tsx` — Statutory deduction dashboard: TDS summary, PF register, ESI register per month
- [ ] `src/app/institutions/[id]/finance/payroll/statutory/form16/page.tsx` — Generate Form 16: select academic year, generate per-staff PDF, bulk download as ZIP
- [ ] `src/actions/statutoryPayroll.ts` — computeTDS (income tax slab calculation old vs new regime), computePF, computeESI, runMonthlyStatutoryDeductions, generateForm16PDF
- [ ] `src/components/finance/StatutoryDeductionTable.tsx` — Staff-wise monthly breakdown: gross, basic, TDS, PF employee, ESI employee, net
- [ ] `src/components/finance/Form16Template.tsx` — Printable Form 16 Part B: employer details, TAN, salary breakup, deductions, TDS summary
- [ ] Update salary slip component to show TDS, PF, ESI as named deduction line items
- [ ] Staff portal: `src/app/staff-portal/tax-declaration/page.tsx` — Staff selects old/new tax regime, declares 80C/80D investments for TDS computation

#### Key features:
- TDS computation: old vs new tax regime per staff; applies standard deduction ₹50,000 (new regime); deducts declared 80C/80D (old regime); monthly TDS = annual tax liability ÷ 12
- PF deduction: 12% employee + 12% employer on basic salary; EPF wage ceiling ₹15,000 for capped employer contribution
- ESI deduction: 0.75% employee + 3.25% employer on gross; auto-disabled for employees earning > ₹21,000/month
- Salary slip: TDS, PF, ESI shown as separate named deduction rows — not lumped as "other deductions"
- Form 16 Part B: generated per employee per financial year in tax-department-prescribed format
- Statutory registers: PF Form 12A and ESI register downloadable per month as compliance records

---

### Step 5D — Alumni System & Panel

**Routes:** `/alumni-portal` (alumni self-service) · `/institutions/[id]/alumni` (admin)

> Graduates from year promotion (Step 2D) land here automatically. Alumni can update their profile; admins can broadcast to batches.

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
- [ ] `supabase/migrations/..._alumni.sql`
- [ ] `src/app/institutions/[id]/alumni/page.tsx` — Admin alumni directory (filter by batch, dept, year)
- [ ] `src/app/institutions/[id]/alumni/announcements/page.tsx` — Broadcast messages to alumni batches
- [ ] `src/app/alumni-portal/layout.tsx` — Alumni portal shell (teal theme, similar to student portal)
- [ ] `src/app/alumni-portal/page.tsx` — Alumni dashboard: batch stats, recent announcements
- [ ] `src/app/alumni-portal/profile/page.tsx` — Update employer, role, LinkedIn, city
- [ ] `src/app/alumni-portal/directory/page.tsx` — Browse fellow alumni (same batch/dept)
- [ ] `src/actions/alumni.ts` — getAlumniProfile, updateAlumniProfile, getAlumniDirectory, sendAlumniAnnouncement
- [ ] Login flow update: detect alumni role → redirect to `/alumni-portal`

#### Key features:
- Auto-populated from year promotion (Step 2D)
- Alumni can update professional info from their portal
- Admin can filter + export alumni list (batch-wise CSV)
- Batch-targeted announcements (e.g., "2022 UG CS batch reunion")
- Alumni directory browsable within same institution

### Step 5E — Staff Appraisal & NAAC Workload Reports

**Route:** `/institutions/[id]/appraisals`

> Annual staff appraisal system for NAAC compliance. Records teaching performance, research output, and faculty development activities. Generates workload reports showing hours taught vs planned per staff per week.

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

#### What to build:
- [ ] `supabase/migrations/..._appraisals.sql`
- [ ] `src/app/institutions/[id]/appraisals/page.tsx` — Appraisal cycles overview: list of appraisal periods and staff completion status
- [ ] `src/app/institutions/[id]/appraisals/[appraisalId]/page.tsx` — Individual appraisal form: review scores + activity log
- [ ] `src/app/institutions/[id]/appraisals/workload/page.tsx` — Workload report: hours taught per staff per week (from class_schedules + attendance data)
- [ ] `src/actions/appraisals.ts` — createAppraisalCycle, submitAppraisal, reviewAppraisal, generateWorkloadReport
- [ ] `src/components/appraisals/AppraisalForm.tsx` — Self-assessment form: scores + activities log with document upload
- [ ] `src/components/appraisals/WorkloadTable.tsx` — Staff-wise teaching hours vs planned hours per week
- [ ] Staff portal: `src/app/staff-portal/appraisal/page.tsx` — Staff fills self-appraisal, uploads activity proof documents

#### Key features:
- Self-appraisal: staff log their own activities (papers, FDPs, conferences, awards)
- HOD reviews self-appraisal and assigns final scores
- Workload report: cross-references class_schedules with actual attendance to calculate hours taught
- NAAC export: academic performance indicators per faculty (API format)
- Document upload for activity proof (via Supabase Storage `appraisal-docs` bucket)

---

### Step 5F — Placement Cell & Career Services

**Route:** `/institutions/[id]/placements`

> Single most important module for college reputation and NIRF rankings. Tracks every placement drive from company onboarding to offer letters. Feeds NIRF Criterion 5.2 (Student Progression).

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

#### What to build:
- [ ] `supabase/migrations/..._placements.sql`
- [ ] `src/app/institutions/[id]/placements/page.tsx` — Placement cell dashboard: drives, stats, company list
- [ ] `src/app/institutions/[id]/placements/drives/[driveId]/page.tsx` — Drive management: registrations, pipeline stages, results
- [ ] `src/app/institutions/[id]/placements/companies/page.tsx` — Company registry with HR contacts
- [ ] `src/app/institutions/[id]/placements/statistics/page.tsx` — Placement stats: % placed, avg CTC, highest package, dept-wise breakdown
- [ ] `src/actions/placements.ts` — getDrives, registerStudent, updateStageStatus, getPlacementStats, exportNIRF
- [ ] `src/components/placements/PlacementStatsCard.tsx` — KPI cards: total placed, avg package, highest package
- [ ] Student portal: `src/app/student-portal/placements/page.tsx` — Upcoming drives, one-click register, track application status

#### Key features:
- Full pipeline: company → drive → registration → stage tracking → placed
- Eligibility auto-check against student CGPA, backlogs, department, year
- "Already placed" flag: blocks re-registration on exclusive drives
- Placement statistics NIRF-ready export (Criterion 5.2)
- Student portal: real-time stage update notifications

---

### Step 5G — Scholarship Management

**Route:** `/institutions/[id]/scholarships`

> Most Indian colleges manage multiple government schemes — SC/ST, OBC, merit, minority, sports quota scholarships. Manual tracking is error-prone. Auto-eligibility checks and fee integration save hours of admin work.

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

#### What to build:
- [ ] `supabase/migrations/..._scholarships.sql`
- [ ] `src/app/institutions/[id]/scholarships/page.tsx` — Scholarship schemes registry + applications dashboard
- [ ] `src/app/institutions/[id]/scholarships/[schemeId]/page.tsx` — Applications per scheme: verify, approve, disburse
- [ ] `src/actions/scholarships.ts` — getSchemes, applyForScholarship, approveScholarship, disburseScholarship
- [ ] `src/components/scholarships/EligibilityChecker.tsx` — Auto-check student profile against scheme criteria
- [ ] Student portal: `src/app/student-portal/scholarships/page.tsx` — Available schemes, apply, track disbursement status
- [ ] Fee integration: approved scholarship amount auto-deducted from student fee dues (finance module)

#### Key features:
- Auto-eligibility check against student profile (category, marks, income limit)
- Scholarship amount auto-adjusts fee dues in finance module
- Document upload for proof (via Supabase Storage)
- Disbursement tracking and reporting
- WhatsApp notification on approval and disbursement (Phase 3C)

---

### Step 5H — Disciplinary Records & Anti-Ragging

**Route:** `/institutions/[id]/disciplinary`

> UGC mandates an anti-ragging committee and formal disciplinary mechanism. NAAC Criterion 6.2 requires documented evidence of grievance/disciplinary actions taken.

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

#### What to build:
- [ ] `supabase/migrations/..._disciplinary.sql`
- [ ] `src/app/institutions/[id]/disciplinary/page.tsx` — Incident register: filter by type, status, student
- [ ] `src/app/institutions/[id]/disciplinary/[incidentId]/page.tsx` — Incident detail + committee action recording
- [ ] `src/app/institutions/[id]/disciplinary/anti-ragging/page.tsx` — UGC anti-ragging committee incident register
- [ ] `src/actions/disciplinary.ts` — reportIncident, updateStatus, recordAction, generateWarningLetter
- [ ] Student portal: anonymous ragging reporting form
- [ ] Warning letter auto-generation: PDF via certificate module (Step 6C)
- [ ] NAAC Criterion 6.2: evidence export of disciplinary mechanism

#### Key features:
- Anonymous reporting protects complainant identity (no student_id stored for anonymous reports)
- Warning/suspension letters auto-generated and linked to certificate system
- UGC anti-ragging register format
- NAAC evidence: number of cases, resolution rate, action types

---

### Step 5I — Research & Publications Management

**Route:** `/institutions/[id]/research`

> NAAC Criterion 3 is entirely about Research & Innovation. Tracks staff research projects, publications, funding grants, and patents. Links to Staff Appraisal (Step 5E) for NAAC API data.

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

#### What to build:
- [ ] `supabase/migrations/..._research.sql`
- [ ] `src/app/institutions/[id]/research/page.tsx` — Research dashboard: active projects, publications count, funding total
- [ ] `src/app/institutions/[id]/research/projects/page.tsx` — Research projects registry
- [ ] `src/app/institutions/[id]/research/publications/page.tsx` — Publications directory with Scopus/UGC/impact factor filters
- [ ] `src/actions/research.ts` — getProjects, addProject, addPublication, getNIRFResearchData
- [ ] Staff portal: `src/app/staff-portal/research/page.tsx` — Staff logs own publications (auto-links to Appraisal 5E)
- [ ] NIRF Research & Innovation export (Criterion 3 format)

#### Key features:
- Scopus/UGC-listed flag for publications (critical for NAAC scoring)
- Research funding tracking: grants received vs spent
- Publications auto-link to Staff Appraisal (Step 5E) to avoid duplicate entry
- NIRF Criterion 3 data export
- Impact factor and h-index tracking per faculty

---

### Step 5J — Staff Daily Attendance & LOP Tracking

**Route:** `/institutions/[id]/staff-attendance`

> The existing attendance system tracks student attendance per class session. This separate
> module tracks whether each staff member is present on campus each working day. Required for
> payroll accuracy (absent days without approved leave are deducted as LOP), leave balance
> validation, and NAAC Criterion 2.4 (Teacher Quality evidence).

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

#### What to build:
- [ ] `supabase/migrations/..._staff_attendance.sql`
- [ ] `src/app/institutions/[id]/staff-attendance/page.tsx` — Daily register: all staff with today's status, one-click bulk mark present, admin marks exceptions (absent/late/half-day)
- [ ] `src/app/institutions/[id]/staff-attendance/reports/page.tsx` — Monthly report per staff: present days, absent days, LOP days, late count, leave days
- [ ] `src/actions/staffAttendance.ts` — markStaffAttendance, bulkMarkPresent, getMonthlyReport, getLOPSummary
- [ ] `src/components/staff-attendance/DailyRegister.tsx` — Tabular register: staff name, department, status toggle (P / A / L / HD / OD)
- [ ] Staff portal: `src/app/staff-portal/attendance/page.tsx` — Personal monthly attendance view: days present, absences, late count, leave days
- [ ] Payroll integration: monthly attendance summary feeds into `salary_disbursements` — absent days without approved leave deducted as LOP (Loss of Pay) from gross salary
- [ ] Leave cross-reference: when a leave request is approved (Step 1A), auto-mark those dates as `status='on_leave'` in staff_attendance

#### Key features:
- Daily register with one-click bulk-mark all present; admin marks exceptions only
- LOP auto-calculation: absent days with no approved leave → deducted during payroll run
- Late arrival tracking with reason field
- Monthly report: present %, late count, LOP days, leave days per staff
- NAAC Criterion 2.4: average teacher attendance % as an institution-wide metric

---

### Step 5K — Staff Career Lifecycle Management

**Route:** `/institutions/[id]/staff/career`

> Staff join, get promoted, receive increments, transfer departments, and eventually resign or
> retire. Without a lifecycle log there is no seniority data for salary increments, no paper
> trail for promotions, and no formal offboarding to trigger the Relieving Letter in the
> Certificate module (Step 6C). This module provides the complete audit trail.

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
- [ ] `supabase/migrations/..._staff_career_events.sql`
- [ ] `src/app/institutions/[id]/staff/career/page.tsx` — Career events log: filter by event_type, department, date range
- [ ] `src/app/institutions/[id]/staff/career/[staffId]/page.tsx` — Individual staff career timeline: chronological events from joining to present
- [ ] `src/actions/staffCareer.ts` — recordCareerEvent, getCareerTimeline, processResignation, processRetirement, getServiceYears
- [ ] `src/components/staff/CareerTimeline.tsx` — Vertical timeline: event type badge, old→new value, effective date, document link
- [ ] Increment workflow: recording an `increment` event auto-updates `staff.salary` to the new value — no separate manual edit needed
- [ ] Resignation / Retirement workflow: sets `staff.is_active = false`, auto-creates a Relieving Letter request in the Certificate module (Step 6C)
- [ ] Staff portal: `src/app/staff-portal/career/page.tsx` — Staff views their own career history (joining date, confirmations, promotions) — read-only
- [ ] Appraisal integration (Step 5E): HOD can trigger an increment or promotion career event directly from a completed appraisal review
- [ ] Seniority calculation: derive years of service from the `joining` event for salary increment eligibility

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
- [ ] `supabase/migrations/..._department_budgets.sql` — department_budgets + budget_line_items + RLS
- [ ] `src/app/institutions/[id]/finance/budgets/page.tsx` — Budget overview: all departments, allocated vs spent progress bars, approval status
- [ ] `src/app/institutions/[id]/finance/budgets/[deptId]/page.tsx` — Department budget detail: line items, actuals auto-pulled from expenses + POs
- [ ] `src/actions/budgets.ts` — createBudget, submitBudget, approveBudget, rejectBudget, addLineItem, getBudgetVsActuals
- [ ] `src/components/finance/BudgetCard.tsx` — Department card: total allocated, total spent, utilisation % progress bar
- [ ] `src/components/finance/BudgetLineItemTable.tsx` — Line items table: category, planned, actual, variance (with colour coding)
- [ ] HOD portal addition: HODs can draft and submit their department's annual budget from the admin panel
- [ ] Actuals integration: link approved purchase orders (4E-sub) and expenses (core expense logger) to `budget_line_items.actual_amt`
- [ ] NAAC Criterion 6.4 export: budget allocation and utilisation per department per academic year as Excel

#### Key features:
- Draft → Submitted → Approved workflow (HOD drafts, admin approves)
- Category-wise breakdown (lab equipment, IT, travel, events, etc.)
- Real-time actuals pulled from expense logger + PO payments — no manual entry of actuals
- Variance highlighting: over-budget line items shown in rose, under-budget in emerald
- Year-on-year comparison: current year vs previous year allocation per department
- NAAC 6.4 evidence: budget utilisation summary downloadable as PDF / Excel

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

