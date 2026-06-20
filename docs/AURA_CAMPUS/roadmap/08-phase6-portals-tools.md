[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [03 — Phase 2 Academic Operations](03-phase2-academic-operations.md) (curriculum data for the LMS), [01 — Phase 1 Portals](01-phase1-portals.md) (Student/Staff Portals extended with new tabs).
> **Feeds into:** [10 — Phase 8 Mobile Apps](10-phase8-mobile-apps.md) (Parent Portal → Parent mobile app), [09 — Phase 7 Super Admin](09-phase7-super-admin.md) (industry connect MOUs feed NAAC reporting).

---

## 🚀 Phase 6 — Parent Portals & Extended Digital Tools

> **Goal:** Elevate AURA with specialized portals and digital toolsets: Parent portals, bus route tracking, document generators, and online MCQ examinations.

### Step 6A — Parent Portal

**Route:** `/parent-portal`

> **Status:** ✅ **Complete** (migration `20260620000000_phase6a_parents`, commit `a85f205`).

> Read-only view of a child's academic activity. Parents can also pay fees. One parent account
> can be linked to multiple children (e.g. siblings in the same institution) via a junction table.

#### ✅ COMPLETE — commit `a85f205`
- Tables `parents` + `parent_student_links` (siblings via the junction table) with RLS: a parent reads their own account + links; admins manage their institution's parents/links.
- **Child data security:** parents have no RLS path to another student's `attendance`/`cia_results`/`fee_demands`. Each read in `parentPortal.ts` first verifies the parent↔student link, then fetches with the service-role client (Dev Rule 16 justification documented in-file) — rather than adding parent-aware RLS to every academic table.
- Parent portal (amber theme) with a **cookie-persisted child-switcher** in the topbar: dashboard (overall attendance %, fees due, upcoming exams), subject-wise attendance, published `cia_results`, and a fees ledger.
- **Auth:** `login` + `middleware` detect a `parents.user_id` and route to `/parent-portal` (`aura-role=parent`), with a fence keeping parents in and others out.
- **Admin:** `/institutions/[id]/parents` — create a parent login (temp password `Aura@1234`, must-reset) and link/unlink one or many children with a relationship.
- `src/lib/parentPortal.ts` pure helpers + 8 Vitest tests; dataRetention entry.
- **Deferred:** parent-initiated Razorpay "pay on behalf" — `createRazorpayOrder` is RLS-bound to the student/admin and a secure parent payment path needs its own RLS work; the fees page shows the ledger with a clear note. Tracked for a follow-up.

#### Database (design reference):
```sql
-- Parent account — one parent, potentially many linked children
CREATE TABLE parents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  user_id         UUID REFERENCES auth.users(id),   -- Supabase auth account
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Junction table: one parent ↔ many students (siblings supported)
CREATE TABLE parent_student_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'parent'
               CHECK (relationship IN ('father','mother','guardian','other')),
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,  -- primary contact for this student
  UNIQUE(parent_id, student_id)
);
```

---

### Step 6B — Transport Management

**Route:** `/institutions/[id]/transport`

> **Status:** ✅ **Complete** (migration `20260621000000_phase6b_transport`, commit `eb1756c`).

> Manage institution transport services and vehicle allocation.
> 
> *Note on Optimization:* Integrate with the **Python Engine's Vehicle Routing Problem (VRP) solver** to generate turn-by-turn routes, optimize student stop pickup sequences, and reduce overall fleet fuel consumption.

#### Database:
```sql
CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  vehicle_number  TEXT NOT NULL UNIQUE,   -- e.g. "TN12AB1234"
  vehicle_type    TEXT NOT NULL CHECK (vehicle_type IN ('bus','van','mini_bus')),
  capacity        INTEGER NOT NULL DEFAULT 40,
  driver_name     TEXT NOT NULL,
  driver_phone    TEXT NOT NULL,
  driver_license  TEXT,
  insurance_expiry DATE,
  fitness_expiry  DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bus_routes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  vehicle_id      UUID REFERENCES vehicles(id),
  route_name      TEXT NOT NULL,
  stops           JSONB NOT NULL,   -- Array of { name, pickup_time, lat, lng }
  morning_start   TIME,
  evening_start   TIME
);

CREATE TABLE transport_allocations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  bus_route_id     UUID NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  boarding_stop    TEXT NOT NULL,
  academic_year_id UUID REFERENCES academic_years(id),
  UNIQUE(student_id, academic_year_id)
);
```

#### ✅ COMPLETE — commit `eb1756c`
- Tables `vehicles`, `bus_routes` (JSONB `stops`) and `transport_allocations` with RLS: admins manage their institution's fleet/routes/allocations; a **student reads only their own allocation** plus the route and vehicle it points at (nested `auth.email()` ownership policies), so the student portal works through normal RLS — no service-role needed.
- `src/lib/transport.ts` pure helpers — vehicle typing, insurance/fitness **expiry classification** (`EXPIRY_WARN_DAYS = 30`), fleet alert aggregation, stop parsing and pickup-time lookup — with **14 Vitest tests**.
- `src/actions/transport.ts` — vehicle CRUD, route CRUD (with ordered stops), student allocation/unassignment, `getExpiryAlerts`, and `getStudentRoute` for the portal.
- Admin UI (sky theme, right-drawer forms): vehicle & driver registry with insurance/fitness expiry badges + a fleet compliance banner; route list with vehicle + student/capacity counts; route detail with a stops timeline and the allocated-students table.
- Student portal **My Transport** page: route, boarding stop, pickup time, vehicle + driver contact (tap-to-call) and the full stops timeline with the student's stop highlighted.
- `fee_structures.fee_type` CHECK extended with `'transport'` so bus fees can be raised; dataRetention `transport` policy entry (driver/student PII).
- Nav links added to both the admin Sidebar (Campus group) and the student-portal sidebar.

---

### Step 6C — Certificate & Document Generator

**Route:** `/institutions/[id]/certificates`

> **Status:** ✅ **Complete** (migration `20260622000000_phase6c_certificates`, commit `048e0cc`).

> High-demand feature. Students request documents; admin approves + generates.

#### ✅ COMPLETE — commit `048e0cc`
- Single `certificate_requests` table covering both holders (a `requester_type` + matching `student_id`/`staff_id` CHECK), all 10 document types, the `requested → approved → issued / rejected` lifecycle and the issued certificate number. RLS: admins manage their institution's requests; a student reads and raises only their own (no cross-student leakage).
- `src/lib/certificates.ts` — type/label/prefix metadata, status styling, `formatCertificateNo` (`BON/2026/0007`) and **formal body-text templates per document type** auto-filled from holder context, with **12 Vitest tests**.
- `src/actions/certificates.ts` — request / approve / reject / issue (assigns a per-type, per-year sequential number), direct **staff-document issuance** (offer/experience/relieving/salary/service letters issued straight by admin), delete, and a print-context reader gated by RLS (admin or the owning student).
- **Printable** `CertificateDocument` — letterhead, ref no + date, underlined title, justified body, signature block and a browser print-to-PDF button — shared by the admin and student print routes.
- Admin queue with status filters and inline issue/reject + "issue staff document" drawer; student portal request/track/download page. Nav links added to both sidebars; dataRetention `certificates` entry.
- **Note:** PDF is produced via the browser's print-to-PDF on the styled document (consistent with the 5H warning-letter / 5C Form-16 precedent) rather than a server-side PDF lib.

---

### Step 6D — Online Examination System

**Route:** `/institutions/[id]/online-exams`

> **Status:** ✅ **Complete** (migration `20260623000000_phase6d_online_exams`, commit `6153c1a`).

> Internal assessments and unit tests conducted digitally. Auto-graded MCQ. Results feed directly into the marks module (Step 2C).

#### ✅ COMPLETE — commit `6153c1a`
- 5 tables — `online_exams`, `online_exam_questions`, `online_exam_sessions`, `online_exam_answers`, `online_exam_violations` — with RLS. **Security cornerstone:** answer keys (`correct_keys`) must never reach a student's browser, so students have **no RLS read** on the questions/answers tables; the whole exam-player flow (fetch questions, submit, grade, log violations) runs in **service-role server actions** that strip the keys on the way out and grade tamper-proof on the server. Admins manage everything; a student reads only their own session and the published exams targeted to them (dept match or institution-wide).
- `src/lib/onlineExams.ts` — auto-grading (single-MCQ, multi-select exact-set, short-answer normalized match; no partial credit), exam-window state, countdown/timer maths — **18 Vitest tests** on the security-sensitive scoring logic.
- `src/actions/onlineExams.ts` — exam + question CRUD, publish (recomputes total marks from the bank), `startExam` (one session per student, returns stripped questions + remaining time), `submitExam` (server-graded, idempotent), `logViolation` (3 → auto-submit + flag), admin results and student review readers.
- **ExamPlayer** — full-screen timed interface: live countdown, question palette, single/multi/short inputs, and anti-cheating: tab-switch detection, full-screen-exit detection with a re-enter modal, copy/paste/cut/context-menu blocking, and a per-student unique `session_token`; 3 violations auto-submit with a flag. Pre-exam **ExamLauncher** shows the rules and enters full-screen on the Start gesture.
- Admin question-bank editor (MCQ single/multi + short, mark-correct UI), exam manager (draft → published → closed) and a results dashboard (average %, flagged count, ranked attempts). Student list + launcher + player + answer-review. Nav added to both sidebars; dataRetention entry.
- **Deferred:** auto-push of scores into the CIA gradebook — the spec's `exam_results` table doesn't exist (Step 2C results live in `cia_results`, which models weighted CIA components, not a one-off quiz). Online-exam scores stay self-contained and are surfaced in the module; a later mapping into `cia_results` can be added deliberately.

---

### Step 6E — Student Feedback & Faculty Ratings

**Route:** `/institutions/[id]/feedback`

> **Status:** ✅ **Complete** (migration `20260624000000_phase6e_feedback`, commit `e937daf`).

> Anonymous end-of-semester feedback forms. Staff see their own aggregated ratings. Aggregated reviews help institutions improve instruction.

#### ✅ COMPLETE — commit `e937daf`
- **Anonymity model (the core design):** `feedback_responses` stores **no `student_id`** — only the answers. Double-submission is prevented by a **separate, deliberately unjoinable** `feedback_submissions` ledger that records just `(form_id, student_id)` and none of the answers. So neither admins nor faculty can ever trace a response to a student, yet a student can't submit twice (the ledger's `unique(form_id, student_id)` guards it, written first in the submit action).
- RLS: admins manage their institution's forms; the **rated faculty** read their own forms + aggregated responses (matched by `staff.email = auth.email()`); eligible students read active forms and **insert** responses (anonymous) but can never **read** responses; the ledger is student-own + admin-read.
- `src/lib/feedback.ts` — per-question aggregation (averages + 1–5★ distributions), overall rating, response-rate, and a stopword-filtered **word-frequency (word cloud)** helper — **12 Vitest tests**.
- `src/actions/feedback.ts` — form CRUD (details-only edit **preserves** the question set), `submitFeedback` (ledger-guarded), report builder (aggregate + word cloud + response rate, with the eligible-student count taken via service-role head-count so faculty reports work without students-table RLS), staff overview.
- Admin form manager with a star/comment **question builder** and a report page (overall stars, per-question distribution bars, word cloud, comment stream). Student form list + star/comment fill page. Staff own-ratings overview + report. Nav added to all three sidebars; dataRetention entry.

### Step 6F — Grievance Redressal System

**Routes:** `/institutions/[id]/grievances` (admin) · `/student-portal/grievance` (student) · `/staff-portal/grievance` (staff)

> **Status:** ✅ **Complete** (migration `20260625000000_phase6f_grievances`, commit `51a8422`).

> NAAC Criterion 6.2 mandates a formal, documented grievance mechanism. Without this, NAAC auditors will flag it as a critical gap. Includes anonymous submission option for harassment/ragging cases.

#### ✅ COMPLETE — commit `51a8422`
- Single `grievances` table (complainant_type student/staff/anonymous, 7 categories, the `submitted → acknowledged → under_review → resolved / escalated / closed` lifecycle, `assigned_to` staff, `deadline`, `resolution_notes`). **Confidentiality model:** an anonymous grievance stores NO complainant identity (`submitted_by` NULL, enforced by a `CHECK`), so it can never be traced — but is consequently untrackable. RLS: admins manage their institution's cases; any member files a new one (status forced to `submitted`, submitter = self or NULL); a named complainant reads ONLY their own rows.
- `src/lib/grievances.ts` — category/status labels + colours, sensitive-category anonymity defaulting, SLA/overdue maths (30-day NAAC target), stats (resolution rate, within-SLA rate, avg days-to-resolve, overdue count) and the NAAC 6.2 CSV — **15 Vitest tests**.
- `src/actions/grievances.ts` — `submitGrievance` (portal, anonymous-aware), `getMyGrievances` (complainant tracking), admin `getGrievances`/`getGrievance`, `acknowledgeGrievance` (sets default SLA deadline), `assignGrievance`, `setGrievanceDeadline`, `updateGrievanceStatus`, `deleteGrievance`. Every status change notifies the named complainant (`grievance_status` notification type + builder added to `notifications.ts`); anonymous cases have nobody to notify.
- Admin dashboard (6 KPI cards, category/status/search filters, overdue banner, NAAC 6.2 CSV export) + case-detail workflow (acknowledge, assign to staff, set deadline, status + resolution notes). Student & staff portal pages share one `GrievancePortalView` (submission form with sensitive-category anonymity auto-select + own-case tracking list).
- Nav links: admin Governance group, student-portal and staff-portal sidebars; `dataRetention` `grievances` entry (7 years, anonymous reports store no identity); `ssrRegistry` grievance source flipped **live** under Criterion 6.2 (corrected from a mislabelled 7.1 slot).
- **Note:** SLA is tracked via the admin-set `deadline` + overdue badges; auto-escalation after the deadline is surfaced as an overdue alert for manual escalation rather than a background cron job.

#### Database (design reference):
```sql
CREATE TABLE grievances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  submitted_by     UUID REFERENCES auth.users(id),  -- NULL if anonymous
  complainant_type TEXT NOT NULL CHECK (complainant_type IN ('student','staff','anonymous')),
  category         TEXT NOT NULL CHECK (category IN (
                     'academic','financial','infrastructure','staff_conduct',
                     'harassment','ragging','other')),
  subject          TEXT NOT NULL,
  description      TEXT NOT NULL,
  evidence_url     JSONB,
  status           TEXT NOT NULL DEFAULT 'submitted'
                   CHECK (status IN ('submitted','acknowledged','under_review','resolved','escalated','closed')),
  assigned_to      UUID REFERENCES staff(id),
  resolution_notes TEXT,
  resolved_at      TIMESTAMPTZ,
  deadline         DATE,    -- Resolution deadline set by admin
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### Step 6G — E-Learning & Study Materials (LMS)

**Route:** `/institutions/[id]/lms`

> **Status:** ✅ **Complete** (migration `20260626000000_phase6g_lms`, commit `4c8513f`).

> Post-COVID necessity. Every college needs teachers to upload notes, slides, and lecture recordings. Students access materials any time. Linked to syllabus units (Step 2F) for organized delivery. **Scope expanded** to include assignment submissions and a gradebook — making this a full lightweight LMS (not just a file repository).

#### ✅ COMPLETE — commit `4c8513f`
- 3 tables — `study_materials`, `lms_assignments`, `lms_submissions` — with RLS. **Access model:** admins manage; the **teaching staff** of a subject (via `teaching_assignments`, matched by `staff.email`) manage its materials/assignments and grade its submissions; **students of the subject's department** read published materials/assignments and submit/read only their own work. Two public storage buckets (`study-materials`, `lms-submissions`) following the existing `receipts`/`research-docs` convention.
- `src/lib/lms.ts` — material typing, deadline status + late detection, **gradebook aggregation** (student × assignment matrix, per-student & per-assignment averages, missing/submitted/graded cell states) and YouTube-embed parsing — **28 Vitest tests**.
- `src/actions/studyMaterials.ts` + `src/actions/lmsAssignments.ts` — material CRUD + publish toggle, assignment CRUD, submission grading, gradebook builder, student submit (deadline-enforced, auto late-flag, resubmission via upsert), and the staff/student portal subject lists.
- Admin: LMS overview (subject grid + quick links), per-subject materials manager (upload by syllabus unit, file **or** external/YouTube link, draft/publish), institution-wide assignment manager, submissions grader (per-student marks + feedback, missing roster shown), and a colour-coded gradebook.
- Staff portal: own-subjects workspace (materials + assignments + grading). Student portal: subject materials browser (lazy-loaded accordion) + assignments submit/grade view.
- `ScormPlayer` embeds SCORM packages via iframe + `postMessage` completion. Nav added to admin/staff/student sidebars; dataRetention entry.

#### Database (design reference):
```sql
CREATE TABLE study_materials (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id     UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  subject_id         UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  curriculum_unit_id UUID REFERENCES curriculum_units(id),
  title              TEXT NOT NULL,
  material_type      TEXT NOT NULL CHECK (material_type IN (
                       'notes','slides','video_link','scorm_package',
                       'question_paper','reference')),
  file_url           TEXT,         -- Supabase Storage path
  external_url       TEXT,         -- YouTube, Google Drive link
  uploaded_by        UUID REFERENCES staff(id),
  is_published       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assignments (staff creates → students submit)
CREATE TABLE lms_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  title            TEXT NOT NULL,
  description      TEXT,
  due_date         TIMESTAMPTZ NOT NULL,
  max_marks        INTEGER NOT NULL DEFAULT 10,
  allow_late       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by       UUID REFERENCES staff(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE lms_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lms_assignments: institution members can manage"
  ON public.lms_assignments
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

-- Student submissions
CREATE TABLE lms_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES lms_assignments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_url        TEXT,
  notes           TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_late         BOOLEAN NOT NULL DEFAULT FALSE,
  marks_awarded   NUMERIC(5,2),
  feedback        TEXT,
  graded_by       UUID REFERENCES staff(id),
  graded_at       TIMESTAMPTZ,
  UNIQUE(assignment_id, student_id)
);
ALTER TABLE lms_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lms_submissions: institution members can manage"
  ON public.lms_submissions
  USING (assignment_id IN (
    SELECT id FROM lms_assignments WHERE institution_id IN (
      SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
    )
  ));
```

---

### Step 6H — Industry Connect & MOU Management

**Route:** `/institutions/[id]/industry-connect`

> **Status:** ✅ **Complete** (migration `20260627000000_phase6h_industry_connect`, commit `5018171`).

> Track Memoranda of Understanding with industry and academic partners. NAAC Criterion 7.1 (Institutional Values). MOU expiry alerts prevent lapsed partnerships from hurting NAAC scores.

#### ✅ COMPLETE — commit `5018171`
- `mou_partners` + `industry_interactions` with admin-managed institution-scoped RLS, plus a public `mou-documents` storage bucket (per the existing convention) for the signed MOU PDF.
- `src/lib/industryConnect.ts` — partner/interaction typing, **expiry bands** (60-day warning, 30-day critical, expired), `computeExpiry` (UTC-safe `mou_date + validity_years`), fleet stats, per-partner activity/students rollup and the **NAAC Criterion 7.1 CSV** — **9 Vitest tests**.
- `src/actions/industryConnect.ts` — MOU CRUD (+document upload, activate/deactivate), activity logging (optionally linked to an MOU), and the NAAC 7.1 export.
- Admin: MOU registry with a stats strip, an **expiry-alert banner** (≤60/≤30 days + expired), status filters, and `MOUCard`s with an urgency badge + activity/students counts; a separate activity-log page (internships, workshops, guest lectures, drives, students benefited); one-click NAAC 7.1 CSV download. Sidebar link; dataRetention entry; `ssrRegistry` 7.1 (MOUs) flipped to live.
- **Cross-module note:** the Guest Lecture (2H) and Placement (5F) modules already capture their own records; activities here are logged where an MOU context is wanted, avoiding forced duplication.

#### Database (design reference):
```sql
CREATE TABLE mou_partners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  partner_name     TEXT NOT NULL,
  partner_type     TEXT NOT NULL CHECK (partner_type IN (
                     'industry','university','government','ngo','research_institute')),
  mou_date         DATE NOT NULL,
  validity_years   INTEGER NOT NULL DEFAULT 3,
  expiry_date      DATE NOT NULL,
  purpose          TEXT NOT NULL,
  activities       JSONB,        -- Planned activities under the MOU
  contact_person   TEXT,
  mou_document_url TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE industry_interactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id     UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  mou_partner_id     UUID REFERENCES mou_partners(id),
  interaction_type   TEXT NOT NULL CHECK (interaction_type IN (
                       'internship','guest_lecture','workshop','project',
                       'training','placement_drive','other')),
  title              TEXT NOT NULL,
  date               DATE NOT NULL,
  students_benefited INTEGER,
  description        TEXT
);
```

---

### Phase 6 Completion Checklist ✅ COMPLETE (8/8)
- [x] Parent portal logins working (`aura-role=parent` cookie) — `a85f205`
- [x] Parent portal: multiple children via `parent_student_links` + child-switcher
- [x] Transport routes + vehicle registry + fee ledger linked — `eb1756c`
- [x] Certificate generator: printable docs (student + staff types) — `048e0cc`
- [x] Online MCQ exams: anti-cheating + auto-grade — `6153c1a`
- [x] Student feedback: anonymity-preserving + analytics — `e937daf`
- [x] Grievance redressal: anonymous submission, SLA tracking, NAAC report — `51a8422`
- [x] LMS: study materials + Storage RLS + student access — `4c8513f`
- [x] Industry connect: MOU registry + expiry alerts + NAAC 7.1 export — `5018171`
- [x] Committed + pushed across 6A–6H

---

