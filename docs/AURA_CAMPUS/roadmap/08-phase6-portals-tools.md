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

#### What was built:
- [x] `supabase/migrations/20260620000000_phase6a_parents.sql`
- [x] `src/app/parent-portal/layout.tsx` → `ParentPortalShell` (amber, child-switcher)
- [x] `src/app/parent-portal/page.tsx` (dashboard) · `attendance/` · `results/` · `fees/`
- [x] `src/actions/parentPortal.ts` — getLinkedStudents, getSelectedChild, getChild{Attendance,Results,Fees,UpcomingExams}, admin getParents/createParent/linkStudent/unlinkStudent
- [x] Login + middleware parent-role routing
- [x] Admin: `src/app/institutions/[id]/parents/page.tsx` → `ParentsManager`; Sidebar link (People group)
- [~] Razorpay payment on behalf — deferred (see note above)

#### Database:
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

#### What was built:
- [x] `supabase/migrations/20260621000000_phase6b_transport.sql` — vehicles, bus_routes, transport_allocations
- [x] `src/app/institutions/[id]/transport/vehicles/page.tsx` — Vehicle & driver registry (insurance/fitness expiry alerts)
- [x] `src/app/institutions/[id]/transport/page.tsx` — Route list with vehicle + student count per route
- [x] `src/app/institutions/[id]/transport/[routeId]/page.tsx` — Route detail: stops, timing, vehicle, allocated students
- [x] `src/actions/transport.ts` — getVehicles, getRoutes, assignStudent, getStudentRoute, getExpiryAlerts (+ CRUD)
- [x] Student portal: `src/app/student-portal/transport/page.tsx` — My bus route, boarding stop, pickup time
- [x] Transport fee linked to `fee_structures` (added `transport` fee type)
- [x] Vehicle compliance alerts: insurance/fitness certificates expiring within 30 days
- [~] Python VRP route-optimization solver — deferred (stretch; `stops` store optional lat/lng for it)

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

#### What was built:
- [x] `supabase/migrations/20260622000000_phase6c_certificates.sql` — `certificate_requests` (holder, type, status, cert no, issued_at)
- [x] **Student certificate types:** Bonafide, Transfer Certificate, Character Certificate, NOC, Course Completion
- [x] **Staff certificate types:** Offer Letter, Experience Certificate, Relieving Letter, Salary Certificate, Service Certificate
- [x] `src/app/institutions/[id]/certificates/page.tsx` — Admin: requests queue + issue/reject + print
- [x] `src/actions/certificates.ts` — requestCertificate, approve/reject/issueCertificate, issueStaffCertificate, getCertificateForPrint
- [x] `src/components/certificates/` — printable `CertificateDocument` + admin/student managers (auto-filled holder data)
- [x] Student portal: `src/app/student-portal/certificates/page.tsx` — request, track status, download when issued

---

### Step 6D — Online Examination System

**Route:** `/institutions/[id]/online-exams`

> Internal assessments and unit tests conducted digitally. Auto-graded MCQ. Results feed directly into the marks module (Step 2C).

#### What to build:
- [ ] `supabase/migrations/..._online_exams.sql` — `question_banks`, `online_exam_sessions`, `exam_submissions`
- [ ] `src/app/institutions/[id]/online-exams/page.tsx` — Exam session manager
- [ ] `src/app/institutions/[id]/online-exams/[examId]/questions/page.tsx` — Question bank editor (MCQ + short answer)
- [ ] `src/actions/onlineExams.ts` — createExam, startSession, submitAnswers, autoGrade
- [ ] `src/components/online-exams/ExamPlayer.tsx` — Timed exam interface (countdown, question navigation, auto-submit on timeout)
- [ ] Anti-cheating measures:
  * Tab-switch detection — log event and warn student; 3 violations = auto-submit with flag
  * Full-screen enforcement — exit full-screen triggers warning modal requiring re-entry
  * Copy-paste disabled on question text areas
  * Unique session token per student per exam (prevents URL sharing / duplicate sessions)
  * `exam_violations` log table: stores tab-switch events per student for admin review
- [ ] Student portal: `src/app/student-portal/exams/online/page.tsx` — Upcoming exams, take exam, view results
- [ ] Results auto-pushed to `exam_results` table (Step 2C integration)

---

### Step 6E — Student Feedback & Faculty Ratings

**Route:** `/institutions/[id]/feedback`

> Anonymous end-of-semester feedback forms. Staff see their own aggregated ratings. Aggregated reviews help institutions improve instruction.

#### What to build:
- [ ] `supabase/migrations/..._feedback.sql` — `feedback_forms`, `feedback_responses` (anonymous, no student_id stored)
- [ ] `src/app/institutions/[id]/feedback/page.tsx` — Admin: create feedback forms, view aggregate reports
- [ ] `src/app/institutions/[id]/feedback/[formId]/report/page.tsx` — Analytics: average ratings, word cloud, response rate
- [ ] `src/actions/feedback.ts` — createFeedbackForm, submitFeedback, getFeedbackReport
- [ ] `src/components/feedback/FeedbackForm.tsx` — Star ratings + open-text questions
- [ ] Student portal: `src/app/student-portal/feedback/page.tsx` — Active feedback forms to fill
- [ ] Staff portal: `src/app/staff-portal/feedback/page.tsx` — View own anonymised ratings + feedback comments

### Step 6F — Grievance Redressal System

**Routes:** `/institutions/[id]/grievances` (admin) · `/student-portal/grievance` (student) · `/staff-portal/grievance` (staff)

> NAAC Criterion 6.2 mandates a formal, documented grievance mechanism. Without this, NAAC auditors will flag it as a critical gap. Includes anonymous submission option for harassment/ragging cases.

#### Database:
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

#### What to build:
- [ ] `supabase/migrations/..._grievances.sql`
- [ ] `src/app/institutions/[id]/grievances/page.tsx` — Admin dashboard: open cases, SLA tracking, overdue alerts
- [ ] `src/app/institutions/[id]/grievances/[grievanceId]/page.tsx` — Case detail + resolution workflow
- [ ] `src/actions/grievances.ts` — submitGrievance, updateStatus, assignGrievance, resolveGrievance
- [ ] `src/components/grievances/GrievancePipeline.tsx` — Kanban: Submitted → Acknowledged → Under Review → Resolved
- [ ] Student portal: `src/app/student-portal/grievance/page.tsx` — Submit grievance, anonymous option, track status
- [ ] Staff portal: `src/app/staff-portal/grievance/page.tsx` — Submit grievance, track status
- [ ] Auto-notify complainant on every status change (Phase 3B trigger)
- [ ] NAAC Criterion 6.2 report: cases filed, resolution rate, avg days to resolve

#### Key features:
- Anonymous submission: no complainant identity stored
- SLA tracking: resolution deadline with overdue alerts to admin
- Auto-notification on every status change
- NAAC compliance report: % resolved within 30 days (Criterion 6.2)
- Escalation workflow: unresolved cases auto-escalated after deadline

---

### Step 6G — E-Learning & Study Materials (LMS)

**Route:** `/institutions/[id]/lms`

> Post-COVID necessity. Every college needs teachers to upload notes, slides, and lecture recordings. Students access materials any time. Linked to syllabus units (Step 2F) for organized delivery. **Scope expanded** to include assignment submissions and a gradebook — making this a full lightweight LMS (not just a file repository).

#### Database:
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

#### What to build:
- [ ] `supabase/migrations/..._study_materials.sql`
- [ ] `supabase/migrations/..._lms_assignments.sql` — assignments + submissions tables + RLS
- [ ] Supabase Storage bucket: `study-materials` (authenticated read for enrolled students, staff write)
- [ ] Supabase Storage bucket: `lms-submissions` (student write own files, staff/admin read)
- [ ] `src/app/institutions/[id]/lms/page.tsx` — LMS overview: subjects with material count, recent uploads
- [ ] `src/app/institutions/[id]/lms/[subjectId]/page.tsx` — Subject materials management by unit
- [ ] `src/app/institutions/[id]/lms/assignments/page.tsx` — Assignment manager: create, set deadline, view submissions
- [ ] `src/app/institutions/[id]/lms/assignments/[assignmentId]/submissions/page.tsx` — Grade submissions: marks + feedback per student
- [ ] `src/app/institutions/[id]/lms/gradebook/page.tsx` — **Gradebook**: student × assignment matrix with marks, average per student, average per assignment
- [ ] `src/actions/studyMaterials.ts` — uploadMaterial, getMaterials, deleteMaterial, publishMaterial
- [ ] `src/actions/lmsAssignments.ts` — createAssignment, getAssignments, submitAssignment, gradeSubmission, getGradebook
- [ ] `src/components/lms/MaterialCard.tsx` — Card: type icon (PDF/video/slides), unit tag, download/view link
- [ ] `src/components/lms/AssignmentCard.tsx` — Card: deadline countdown, submission count, graded/pending badges
- [ ] `src/components/lms/GradebookTable.tsx` — Student × assignment grid with marks, colour-coded (pass/fail/missing)
- [ ] Student portal: `src/app/student-portal/lms/page.tsx` — My subjects → materials + assignments organized per syllabus unit
- [ ] Student portal: `src/app/student-portal/lms/assignments/page.tsx` — View assignments, upload submission, view grade + feedback
- [ ] Staff portal: `src/app/staff-portal/lms/page.tsx` — Upload materials and manage assignments for own subjects
- [ ] SCORM: `src/components/lms/ScormPlayer.tsx` — Embed SCORM 1.2/2004 packages via iframe + `postMessage` completion tracking

#### Key features:
- Materials organized by curriculum units (Step 2F) — students know which unit each material covers
- Supports PDF upload, PPT, video links (YouTube embed), external URLs, SCORM packages
- **Assignment workflow:** staff creates → students submit file before deadline → staff grades + adds feedback → student sees mark
- **Late submission flag:** auto-set if submitted after `due_date`; staff configures `allow_late` per assignment
- **Gradebook:** subject-wise marks matrix per academic year; average scores; identifies students with missing submissions
- Supabase Storage RLS: only students of the relevant department can access materials
- Staff draft/publish control per material
- Student portal: type-filtered tabs (notes, videos, assignments, question papers)

---

### Step 6H — Industry Connect & MOU Management

**Route:** `/institutions/[id]/industry-connect`

> Track Memoranda of Understanding with industry and academic partners. NAAC Criterion 7.1 (Institutional Values). MOU expiry alerts prevent lapsed partnerships from hurting NAAC scores.

#### Database:
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

#### What to build:
- [ ] `supabase/migrations/..._industry_connect.sql`
- [ ] `src/app/institutions/[id]/industry-connect/page.tsx` — MOU registry with expiry status badges + upcoming expiry alerts
- [ ] `src/app/institutions/[id]/industry-connect/interactions/page.tsx` — Log activities under each MOU
- [ ] `src/actions/industryConnect.ts` — getMOUs, addMOU, logInteraction, getExpiryAlerts, getNAACReport
- [ ] `src/components/industry-connect/MOUCard.tsx` — Card: partner name, type, expiry date badge, activities count
- [ ] NAAC Criterion 7.1 export: list of MOUs with activity log and students benefited

#### Key features:
- MOU expiry alerts: 30 and 60 days before expiry (notification + dashboard badge)
- Activity log per MOU (internships, workshops, guest lectures, placement drives)
- Links to Guest Lecture module (2H) and Placement module (5F) to avoid duplicate entry
- NAAC Criterion 7.1 export

---

### Phase 6 Completion Checklist
- [ ] Parent portal logins working (new `aura-role=parent` cookie)
- [ ] Parent portal: multiple children per parent supported via `parent_student_links` junction table; child-switcher UI working
- [ ] Transport routes configured, vehicle registry complete, fee ledger linked
- [ ] Certificate generation engine produces printable PDFs (student + staff types)
- [ ] Online MCQ exam sessions complete with anti-cheating and auto-grade to results
- [ ] Student feedback forms protect anonymity and compile analytics correctly
- [ ] Grievance redressal: anonymous submission, SLA tracking, NAAC report working
- [ ] LMS: study materials uploaded, Supabase Storage RLS working, student access confirmed
- [ ] Industry connect: MOU registry with expiry alerts and NAAC export working
- [ ] `git commit -m "feat: Phase 6 — Extended Portal Features complete"`
- [ ] `git push origin main`

---

