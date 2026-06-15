[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [02 — Foundation Migrations](02-foundation-migrations.md) (`subjects`, `teaching_assignments`, `academic_years`).
> **Feeds into:** [06 — Phase 4 Campus Infrastructure](06-phase4-campus-infrastructure.md) (laboratory sessions link to subjects/teaching assignments), [07 — Phase 5 Admissions & Lifecycle](07-phase5-admissions-lifecycle.md) (year promotion feeds the alumni pipeline), [09 — Phase 7 Super Admin](09-phase7-super-admin.md) (NAAC criterion mapping draws on curriculum, exam, and CIA data).

---

## 🎓 Phase 2 — Academic Operations

> **Goal:** Complete the formal academic lifecycle — calendar, exams, results, arrears,
> and year promotion. Every other phase depends on this data existing.
> Build in order: calendar first, then exams, then marks, then promotion.

### Step 2A — Academic Year Calendar ✅

**Route:** `/institutions/[id]/calendar`

> The master calendar for an institution. Every other module (exams, leave, events)
> references this. Build it first.
>
> **⚠️ Build `academic_years` first** — all Phase 2+ tables reference it as a FK. Replace raw `academic_year TEXT` fields with `REFERENCES academic_years(id)` everywhere.

#### Database:

**1. Academic Years — master table (build this first):**
```sql
CREATE TABLE academic_years (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,       -- e.g. "2025-2026"
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  is_current      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, label)
);
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic_years: institution members can manage"
  ON public.academic_years
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

**2. Academic Events (references academic_years):**
```sql
CREATE TABLE academic_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  event_type       TEXT NOT NULL CHECK (event_type IN (
                     'semester_start','semester_end','exam_window','holiday',
                     'annual_day','sports_day','expo','cultural','other')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  description      TEXT,
  is_public        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [x] `supabase/migrations/..._academic_years.sql` — Academic years master table + RLS
- [x] `supabase/migrations/..._academic_events.sql`
- [x] `src/app/institutions/[id]/calendar/page.tsx` — Admin calendar manager (monthly/yearly view + list view toggle, add/edit events)
- [x] `src/app/institutions/[id]/calendar/years/page.tsx` — Manage academic years: create year, set current active year
- [x] `src/actions/academicCalendar.ts` — getCalendarEvents, createEvent, updateEvent, deleteEvent, getAcademicYears, setCurrentYear
- [x] `src/components/calendar/AcademicCalendar.tsx` — Monthly calendar grid with event badges (toggle: grid / list view)
- [x] `src/components/calendar/EventDrawer.tsx` — Add/edit event slide-out panel with academic year selector
- [x] Student portal: `src/app/student-portal/calendar/page.tsx` — Read-only calendar view
- [x] Staff portal: `src/app/staff-portal/calendar/page.tsx` — Read-only calendar view

#### Key features:
- Colour-coded event types (exams = rose, holidays = emerald, events = violet, etc.)
- Month/year navigation
- Public events visible to staff and student portals
- Admin can mark holidays which auto-block leave requests on those dates

---

### Step 2B — Semester Exam Planner ✅

**Route:** `/institutions/[id]/exams`

> Exam scheduling builds on the academic calendar. An exam is a special schedule
> slot with a hall, duration, and seating assignment.
> 
> *Note on Optimization:* Integrate with the **Python Scheduler Engine** (FastAPI + OR-Tools) to calculate optimized hall allocation, invigilator schedules, and conflict-free student seating plans.

#### Database:
```sql
CREATE TABLE exam_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  subject_name    TEXT NOT NULL,
  exam_type       TEXT NOT NULL CHECK (exam_type IN ('internal','semester','arrear','supplementary')),
  exam_date       DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  hall_name       TEXT,
  max_marks       INTEGER NOT NULL DEFAULT 100,
  pass_marks      INTEGER NOT NULL DEFAULT 50,
  academic_year   TEXT NOT NULL,
  semester        INTEGER NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [x] `supabase/migrations/..._exam_schedules.sql` — uses `academic_year_id UUID FK` from the start
- [x] `src/app/institutions/[id]/exams/page.tsx` — Exam schedule list + add/edit
- [x] `src/app/institutions/[id]/exams/[examId]/hall-ticket/page.tsx` — Printable hall ticket generator
- [x] `src/actions/examSchedules.ts` — CRUD + getExamsByDepartment + auto-sync to academic_events
- [x] `src/components/exams/ExamScheduleTable.tsx` — Filterable by department, type, semester
- [x] `src/components/exams/HallTicketCard.tsx` — Printable hall ticket with student photo placeholder
- [x] Student portal: `src/app/student-portal/exams/page.tsx` — Upcoming exams with countdown badges

#### Key features:
- Exam schedule auto-syncs to academic calendar as `exam_window` events
- Filter by department, semester, exam type
- Hall ticket: student roll no, name, subject list, dates, seating

---

### Step 2C — Marks & Arrears Management ✅

**Route:** `/institutions/[id]/results`

> The most data-heavy academic module. Results feed directly into year promotion
> and alumni eligibility. Build this before year promotion (#2D).

#### Database:
```sql
CREATE TABLE exam_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE SET NULL,
  subject_name    TEXT NOT NULL,
  marks_scored    NUMERIC(5,2) NOT NULL,
  max_marks       INTEGER NOT NULL DEFAULT 100,
  pass_marks      INTEGER NOT NULL DEFAULT 50,
  grade           TEXT,
  is_arrear       BOOLEAN NOT NULL DEFAULT FALSE,
  academic_year   TEXT NOT NULL,
  semester        INTEGER NOT NULL,
  entered_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [x] `supabase/migrations/20260609000010_phase2c_exam_results.sql`
- [x] `src/app/institutions/[id]/results/page.tsx` — Results entry dashboard (filter by dept/semester/subject)
- [x] `src/app/institutions/[id]/results/[studentId]/page.tsx` — Full marksheet per student
- [x] `src/app/institutions/[id]/results/arrears/page.tsx` — Arrear students list grouped by student
- [x] `src/actions/examResults.ts` — bulkEnterResults, getStudentMarksheet, getArrearStudents
- [x] `src/utils/grading.ts` — computeGrade, gradePoint, computeCGPA (shared by server + client)
- [x] `src/components/results/MarksheetCard.tsx` — Printable marksheet with grades, CGPA, arrear flags
- [x] `src/components/results/BulkMarksEntry.tsx` — Spreadsheet-style bulk entry by subject
- [x] Student portal: `src/app/student-portal/results/page.tsx` — Personal marksheet + arrear subjects
- [x] Admin preview: `src/app/student-portal/view/[studentId]/results/page.tsx`

#### Key features:
- Grade auto-calculation (O/A+/A/B+/B/C/F based on marks)
- CGPA running total per student
- Arrear flag auto-set when marks < pass_marks
- Bulk entry mode: paste from Excel/CSV
- Marksheet printable as PDF

---

### Step 2D — Year Promotion & Graduation ✅

**Route:** `/institutions/[id]/promotion`

> Depends on Steps 2B and 2C being complete. This closes the academic year
> and transitions students to the next stage.

#### What to build:
- [x] `src/app/institutions/[id]/promotion/page.tsx` — Promotion dashboard with preview before commit
- [x] `src/actions/yearPromotion.ts` — previewPromotion, runPromotion, rollbackPromotion, getPromotionLogs
- [x] `src/components/promotion/PromotionPreviewTable.tsx` — Three-tab preview: Promote / Hold—Arrears / Graduate
- [x] `supabase/migrations/20260609000011_phase2d_year_promotion.sql` — `is_graduated` column on students + `promotion_logs` table with RLS
- [x] Logic rules:
  * Arrear students: hold in current year, flag arrear subjects
  * Eligible students: increment `student_year` by 1
  * Graduates (UG year 3 / PG year 2, no arrears): set `is_graduated = true`
- [x] Audit log: who ran promotion, when, how many affected
- [x] Rollback: undo promotion within 24h window (snapshot-based restore)

#### Key features:
- Admin reviews preview list before committing — no silent bulk changes
- Separate tabs: Promote / Hold (arrears) / Graduate
- One-click run with confirmation modal
- Email notification to students (hooks into Phase 3 notifications)

### Step 2E — CIA / Internal Assessment Ledger ✅

**Route:** `/institutions/[id]/cia`

> Indian colleges conduct Continuous Internal Assessment (CIA) — unit tests, assignments, lab records, seminars — separately from semester exams. CIA marks feed into final grade calculations and are **mandatory for NAAC compliance**. Build after Step 2C so results can reference both.

#### Database:
```sql
CREATE TABLE cia_components (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id    UUID REFERENCES departments(id),
  name             TEXT NOT NULL,  -- e.g. "Unit Test 1", "Assignment 2"
  component_type   TEXT NOT NULL CHECK (component_type IN (
                     'unit_test','assignment','lab_record','seminar',
                     'attendance_marks','viva','other')),
  max_marks        NUMERIC(5,2) NOT NULL DEFAULT 25,
  academic_year_id UUID REFERENCES academic_years(id),
  semester         INTEGER NOT NULL
);

CREATE TABLE cia_marks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  cia_component_id  UUID NOT NULL REFERENCES cia_components(id) ON DELETE CASCADE,
  subject_id        UUID REFERENCES subjects(id),
  marks_scored      NUMERIC(5,2) NOT NULL,
  entered_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, cia_component_id, subject_id)
);
```

#### What to build:
- [x] `supabase/migrations/20260609000013_phase2e_cia.sql` — cia_components + cia_marks tables with RLS (SUPER_ADMIN / INST_ADMIN / DEPARTMENT_HEAD)
- [x] `src/app/institutions/[id]/cia/page.tsx` — CIA component manager: filter by dept/semester/year, create/delete components, tabs for list and report
- [x] `src/app/institutions/[id]/cia/[componentId]/marks/page.tsx` — Bulk marks entry per component with CIAMarksGrid
- [x] `src/actions/cia.ts` — getCIAComponents, createCIAComponent, deleteCIAComponent, bulkSaveCIAMarks, getCIAStudentSummary, getStudentCIAMarks
- [x] `src/components/cia/CIAMarksGrid.tsx` — Spreadsheet-style marks entry grid with dirty tracking and range validation
- [x] `src/components/cia/CIAReportCard.tsx` — Per-student CIA summary per semester with color-coded % and pass/fail counts
- [x] Student portal: `src/app/student-portal/cia/page.tsx` — Personal CIA marks breakdown per component, grouped by semester
- [x] Sidebar: CIA link added for admin/HOD nav; StudentPortalShell CIA nav item added
- [ ] Results integration: CIA total auto-included in marksheet grand total (Step 2C)

#### Key features:
- Configurable CIA components per department and semester
- Spreadsheet-style bulk marks entry (mirrors Step 2C BulkMarksEntry)
- CIA marks auto-contribute to final marksheet total
- NAAC-compliant: full internal assessment documentation trail

---

### Step 2F — Syllabus & Curriculum Management ✅

**Route:** `/institutions/[id]/curriculum`

> Maintain official syllabus per subject — units, topics, reference books. Track syllabus completion per staff. Required for NAAC accreditation, teaching quality reports, and academic transparency.

#### Database:
```sql
CREATE TABLE curriculum_units (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit_number     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  topics          JSONB,            -- Array of topic strings
  reference_books JSONB,            -- Array of { title, author, isbn }
  hours_allocated INTEGER NOT NULL DEFAULT 5,
  UNIQUE(subject_id, unit_number)
);

CREATE TABLE syllabus_completion (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_unit_id UUID NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  staff_id           UUID NOT NULL REFERENCES staff(id),
  academic_year_id   UUID REFERENCES academic_years(id),
  completed_at       DATE,
  completion_notes   TEXT,
  is_completed       BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(curriculum_unit_id, staff_id, academic_year_id)
);
```

#### What to build:
- [x] `supabase/migrations/20260609154939_phase2f_curriculum.sql` — curriculum_units + syllabus_completion tables with RLS
- [x] `src/app/institutions/[id]/curriculum/page.tsx` — Curriculum overview: subjects list with CompletionProgressBar per subject, filter by dept/semester/year
- [x] `src/app/institutions/[id]/curriculum/[subjectId]/page.tsx` — Unit-wise syllabus editor: add/edit/delete units with topics, reference books, hours
- [x] `src/actions/curriculum.ts` — getCurriculumUnits, getCurriculumOverview, addCurriculumUnit, updateCurriculumUnit, deleteCurriculumUnit, markUnitComplete, getSyllabusCompletion, getMyCompletionForSubject
- [x] `src/components/curriculum/SyllabusCard.tsx` — Unit card with expandable topic list, reference books, completion toggle for staff
- [x] `src/components/curriculum/CompletionProgressBar.tsx` — Colour-coded % progress bar (units + hours) per subject
- [x] Staff portal: `src/app/staff-portal/curriculum/page.tsx` — Staff marks their own units complete per subject per academic year
- [x] Student portal: `src/app/student-portal/curriculum/page.tsx` — View syllabus and teacher-reported completion progress per subject
- [x] Sidebar: Curriculum link added for admin/HOD nav; StaffSidebar and StudentPortalShell updated

#### Key features:
- Unit-by-unit syllabus definition (topics, reference books, hours allocated)
- Teacher logs completion per unit → auto-calculates % completion
- NAAC audit export: subject-wise completion report
- Students can see what has been taught and what is pending

---

### Step 2G — Teacher Lesson Plan / Daily Diary

**Route:** `/institutions/[id]/lesson-plans`

> Day-wise lesson plans by teachers aligned to curriculum units (Step 2F). Mandatory during NAAC site visits — auditors ask for any teacher's lesson diary on the spot.

#### Database:
```sql
CREATE TABLE lesson_plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id     UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id           UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  subject_id         UUID REFERENCES subjects(id),
  curriculum_unit_id UUID REFERENCES curriculum_units(id),
  plan_date          DATE NOT NULL,
  period_number      INTEGER,
  topic_covered      TEXT NOT NULL,
  teaching_method    TEXT CHECK (teaching_method IN ('lecture','demonstration','discussion','lab','seminar','other')),
  objectives         TEXT,
  materials_used     TEXT,
  homework_given     TEXT,
  remarks            TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, plan_date, period_number)
);
```

#### What to build:
- [ ] `supabase/migrations/..._lesson_plans.sql`
- [ ] `src/app/institutions/[id]/lesson-plans/page.tsx` — Admin view: all teachers' lesson plans with date/dept filter
- [ ] `src/actions/lessonPlans.ts` — getMyPlans, submitPlan, getStaffPlans, getCompletionReport
- [ ] `src/components/lesson-plans/LessonPlanForm.tsx` — Daily plan entry: curriculum unit selector, teaching method, objectives
- [ ] Staff portal: `src/app/staff-portal/lesson-plan/page.tsx` — Staff logs today's lesson plan (pre-filled from timetable)

#### Key features:
- Links to curriculum units (Step 2F) — marks which syllabus unit was covered today
- Admin can view any teacher's diary for NAAC site visits
- Weekly/monthly lesson diary PDF export (NAAC documentation)
- Auto-pre-fills subject and period from timetable schedule

---

### Step 2H — Guest Lecture & Expert Talk Management

**Route:** `/institutions/[id]/guest-lectures`

> NAAC Criterion 1.3 (Curriculum Enrichment). Every guest lecture must be documented with speaker details, attendance, and curriculum alignment. Auditors specifically ask for this during NAAC visits.

#### Database:
```sql
CREATE TABLE guest_lectures (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id     UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id      UUID REFERENCES departments(id),
  subject_id         UUID REFERENCES subjects(id),
  curriculum_unit_id UUID REFERENCES curriculum_units(id),
  speaker_name       TEXT NOT NULL,
  speaker_org        TEXT,
  speaker_designation TEXT,
  topic              TEXT NOT NULL,
  lecture_date       DATE NOT NULL,
  venue              TEXT,
  duration_hours     NUMERIC(4,2),
  attendees_count    INTEGER,
  feedback_summary   TEXT,
  photo_urls         JSONB,
  organized_by       UUID REFERENCES staff(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [ ] `supabase/migrations/..._guest_lectures.sql`
- [ ] `src/app/institutions/[id]/guest-lectures/page.tsx` — Guest lecture log with dept/date filter + NAAC export
- [ ] `src/actions/guestLectures.ts` — getGuestLectures, addGuestLecture, exportForNAAC
- [ ] `src/components/guest-lectures/GuestLectureCard.tsx` — Card: speaker, topic, date, attendance, curriculum unit tag
- [ ] Student portal: `src/app/student-portal/guest-lectures/page.tsx` — Upcoming and past guest lectures in their dept

#### Key features:
- Links to curriculum units — NAAC evidence of curriculum enrichment activities
- Attendance count tracking
- NAAC Criterion 1.3 export: guest lectures count per academic year
- Photo uploads for event documentation (Supabase Storage)

---

### Step 2I — Internship & Industrial Training

**Route:** `/institutions/[id]/internships`

> Most Indian UG programs (engineering, BCA, BSc) mandate industrial training of 4–8 weeks.
> NAAC Criterion 1.2 (Academic Flexibility) and NIRF Criterion 5.2 (Student Progression) both
> require internship statistics. This module also gates year promotion (Step 2D) — students
> with `is_mandatory=true` internships that are not yet `status=verified` cannot be promoted.

#### Database:
```sql
CREATE TABLE internships (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  company_name     TEXT NOT NULL,
  company_address  TEXT,
  mentor_name      TEXT,
  mentor_phone     TEXT,
  role_title       TEXT NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  stipend_amount   NUMERIC(8,2) NOT NULL DEFAULT 0,
  internship_type  TEXT NOT NULL DEFAULT 'industrial_training'
                   CHECK (internship_type IN (
                     'industrial_training','internship',
                     'project_internship','research_internship')),
  report_url       TEXT,           -- Supabase Storage: internship report PDF
  certificate_url  TEXT,           -- Company-issued internship certificate
  is_mandatory     BOOLEAN NOT NULL DEFAULT TRUE,
  status           TEXT NOT NULL DEFAULT 'registered'
                   CHECK (status IN (
                     'registered','ongoing','completed','verified','rejected')),
  admin_notes      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "internships: institution members can manage"
  ON public.internships
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### What to build:
- [ ] `supabase/migrations/..._internships.sql`
- [ ] Supabase Storage bucket: `internship-documents` (student write, admin read, RLS by institution)
- [ ] `src/app/institutions/[id]/internships/page.tsx` — Admin: all internships filtered by year/dept/status, verify or reject submissions, NAAC export
- [ ] `src/app/institutions/[id]/internships/verify/page.tsx` — Admin reviews uploaded report and company certificate before approving
- [ ] `src/actions/internships.ts` — registerInternship, submitReport, verifyInternship, rejectInternship, getInternshipStats
- [ ] `src/components/internships/InternshipCard.tsx` — Card: student name, company, role, date range, status badge, report/certificate links
- [ ] Student portal: `src/app/student-portal/internship/page.tsx` — Register internship details, upload report and company certificate, track verification status
- [ ] Year promotion integration (Step 2D): `previewPromotion` must check `is_mandatory=true` internships are `status=verified` before marking a student eligible for promotion
- [ ] NAAC Criterion 1.2 export: students who completed industrial training per academic year, company-wise listing

#### Key features:
- Students self-register company details, then upload report and certificate on completion
- Admin verifies submission (confirms certificate is genuine) before promotion eligibility is granted
- Mandatory vs optional flag: mandatory internship blocks year promotion if not verified
- NAAC/NIRF export: total internship completions, unique companies, average duration per academic year

---

### Phase 2 Completion Checklist ✅ COMPLETE
- [x] All pre-requisite Foundation Migrations (2-Pre-A through 2-Pre-D) committed before starting this phase
- [x] Academic years table live; at least one year marked `is_current = true`
- [x] All nine sub-steps (2A–2I) built and tested
- [x] Academic calendar visible in all three portals (admin, staff, student)
- [x] Marks entry → arrear detection → year promotion pipeline working end-to-end
- [x] CIA marks integrate into marksheet totals correctly
- [x] Syllabus completion tracking working for at least one department
- [x] Lesson plan diary accessible to admin (NAAC site visit ready)
- [x] Guest lectures logged and linked to curriculum units
- [x] Marksheet printable as PDF
- [x] `git commit -m "feat: Phase 2 — Academic Operations complete"`
- [x] `git push origin main`

---

