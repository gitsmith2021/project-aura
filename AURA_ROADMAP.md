# 🚀 AURA 1.0 — Master Development Roadmap

> **Instructions for Claude:** This is the official development roadmap for Aura 1.0.
> Work through each phase and step **in order**. Do not skip steps.
> Mark each step as ✅ when complete. Never start the next phase until all steps
> in the current phase are marked complete and committed to GitHub.
> Always follow the tech stack, naming conventions, and patterns defined in the
> System Context below.

---

## 📌 System Context (Always Apply) 

```
Project:      Aura 1.0 — Premium Multi-Tenant EdTech SaaS
Client:       Academic institutions (e.g. Bishop Heber College)
Repo:         https://github.com/gitsmith2021/project-aura.git
Branch:       main
```

### Tech Stack
- **Frontend:** Next.js 15 (App Router, Server Actions, Server Components)
- **Language:** TypeScript (strict mode, discriminated unions for all Server Actions)
- **Styling:** Tailwind CSS — glassmorphism (bg-white/70, backdrop-blur-xl, border-white/20)
- **Palette:** Violet/Purple primary · Emerald for success · Rose for errors/expenses
- **Database:** Supabase (PostgreSQL) with @supabase/ssr cookie-based auth
- **Icons:** Lucide React only
- **Charts:** Recharts
- **Hosting:** Vercel (frontend) · Local/Cloud (Python microservice)
- **Scheduler:** Python FastAPI + Google OR-Tools on port 8000

### Naming Conventions (CRITICAL — never use old names)
| ❌ Old | ✅ New |
|--------|--------|
| `tenants` | `institutions` |
| `tenant_users` | `institution_members` |
| `profiles` (STAFF rows) | `staff` |
| `profiles` (STUDENT rows) | `students` |
| `tenant_id` | `institution_id` |

### Code Patterns (Always Follow)
- Supabase server: `import { createClient } from "@/utils/supabase/server"`
- Supabase client: `import { createClient } from "@/utils/supabase/client"`
- Auth: always use `supabase.auth.getUser()` — never trust `getSession()` alone
- Server Actions: always return `{ success: true, data: ... } | { success: false, error: string }`
- Always call `revalidatePath()` after every mutation
- Never expose secrets to the client

### 🔗 Institution URL Pattern (CRITICAL — always use slugs)

All `/institutions/[id]/...` routes display the institution **slug** in the browser URL, not the UUID.

```
Browser sees:  /institutions/bishop-heber-college/curriculum
Page receives: /institutions/22f26ef2-d7e9-4a41-a267-97d7eaa7c1d8/curriculum  (after middleware rewrite)
```

**How it works:**
1. `src/utils/supabase/middleware.ts` — detects non-UUID segment after `/institutions/`, looks up `institutions.slug → id`, rewrites to UUID path via `NextResponse.rewrite()` before the page handler runs
2. `src/components/layout/Sidebar.tsx` — all nav hrefs built from `activeInstSlug` (stored in `localStorage` + `aura-inst-slug` cookie set at login)
3. Pages receive UUID in `params.id` — **no page code ever changes** — the slug is only visible in the browser URL bar

**Rules for Claude:**
- When writing page files under `src/app/institutions/[id]/...`: always use `params.id` as-is — it will be a UUID at runtime
- When writing sidebar or nav links: always use `instSlug` / `activeInstSlug`, never hardcode UUIDs
- When writing `Link` hrefs or `router.push()` calls in client components: use the slug variable, not the UUID
- `revalidatePath()` calls in Server Actions should use the UUID form: `revalidatePath(\`/institutions/${institutionId}/...\`)` — this is fine because Next.js matches by internal path

### ✅ Completed Modules (Do Not Rebuild)
- [x] Core platform — auth, middleware, multi-tenant routing
- [x] Institutions CRUD — AddInstitutionModal, EditInstitutionModal
- [x] Departments CRUD — with color, funding type, icons
- [x] Staff directory — staff table, AddPersonModal, EditPersonModal, BulkUploadModal
- [x] Students directory — students table, roll numbers, program/year
- [x] AI Timetable Scheduler — FastAPI + OR-Tools + DraftPreviewPanel + Publish flow
- [x] Attendance System — NFC webhook + manual marking + SessionSummaryModal
- [x] Finance Module — Fee Structures, Fee Payments (Razorpay), Salary, Expenses, Reports
- [x] Dark mode — ThemeContext with localStorage persistence
- [x] UI overhaul — glassmorphism, InstitutionTabBar, StudentDeptBreakdown

---

## 🗓️ Phase 1 — Portals (Staff & Student Self-Service)

> **Goal:** Give staff and students their own dedicated views so they can
> self-serve without admin involvement.

### Step 1A — Staff Portal ✅

**Route:** `/staff-portal` (auth-gated, role=STAFF only)

#### What to build:
- [x] `src/app/staff-portal/layout.tsx` — Portal layout with staff-specific nav
- [x] `src/app/staff-portal/page.tsx` — Staff dashboard home
- [x] `src/app/staff-portal/schedule/page.tsx` — Personal timetable view
- [x] `src/app/staff-portal/attendance/page.tsx` — View attendance records they've marked
- [x] `src/app/staff-portal/leave/page.tsx` — Apply for leave, view leave history
- [x] `src/app/staff-portal/salary/page.tsx` — View salary structure + payslips per month
- [x] `src/components/staff-portal/StaffSidebar.tsx` — Staff portal sidebar (mobile-responsive)
- [x] `src/components/staff-portal/LeaveApplicationDrawer.tsx` — Apply for leave drawer
- [x] `src/components/staff-portal/PayslipCard.tsx` — Monthly payslip with breakdown + print
- [x] `src/actions/staffPortal.ts` — Server actions for all staff portal data
- [x] `src/app/institutions/[id]/leave/page.tsx` — Admin view to approve/reject leave requests
- [x] `supabase/migrations/20260604000001_create_leave_requests.sql` — Leave requests table

#### Extra (built beyond roadmap):
- [x] `src/components/staff-portal/StaffViewShell.tsx` — Standalone admin-preview shell (indigo sidebar, "Admin Preview" badge, no DashboardLayout wrapper)
- [x] `src/app/staff-portal/view/[staffId]/layout.tsx` — Admin preview layout loading staff data by ID
- [x] `src/app/staff-portal/view/[staffId]/page.tsx` — Admin preview dashboard
- [x] `src/app/staff-portal/view/[staffId]/schedule/page.tsx` — Admin preview schedule
- [x] `src/app/staff-portal/view/[staffId]/attendance/page.tsx` — Admin preview attendance
- [x] `src/app/staff-portal/view/[staffId]/leave/page.tsx` — Admin preview leave
- [x] `src/app/staff-portal/view/[staffId]/salary/page.tsx` — Admin preview salary
- [x] `src/utils/supabase/admin.ts` — `createAdminClient()` using service role key
- [x] `src/actions/staffCredentials.ts` — `batchGetStaffAuthStatuses`, `setStaffPassword`, `toggleStaffPortalAccess`
- [x] `src/components/users/StaffCredentialsModal.tsx` — Set/update password, copy to clipboard, generate secure password
- [x] Staff cards in admin Users page: login icon (opens view route), key icon (credentials modal), pill toggle (block/unblock), gradient card palettes
- [x] Middleware x-pathname header injection so staff portal layout can skip DashboardLayout for view routes

#### Key features:
- Show only data belonging to the logged-in staff member
- Weekly timetable grid (Mon–Sat, period-wise)
- Attendance summary: classes taken, total students, avg attendance %
- Leave application with reason, date range, type (sick/casual/earned)
- Salary slip: gross, deductions, net — downloadable as PDF via print
- Read-only — staff cannot edit institutional data

#### Middleware rule:
- If logged-in user role !== 'STAFF' → redirect to `/staff-portal`
- Admins can access `/staff-portal/view/*` for preview; blocked from `/staff-portal` self-service area

---

### Step 1B — Student Portal ✅

**Route:** `/student-portal` (auth-gated, role=STUDENT only)

#### What to build:
- [x] `src/app/student-portal/layout.tsx` — Portal layout with student nav
- [x] `src/app/student-portal/page.tsx` — Student dashboard home
- [x] `src/app/student-portal/timetable/page.tsx` — Department timetable view
- [x] `src/app/student-portal/attendance/page.tsx` — Personal attendance % per subject
- [x] `src/app/student-portal/fees/page.tsx` — Fee dues + payment history
- [x] `src/app/student-portal/fees/pay/page.tsx` — Online payment via Razorpay
- [x] `src/components/student-portal/AttendanceRing.tsx` — SVG ring chart (built inline in attendance page)
- [x] `src/components/student-portal/FeeCard.tsx` — Fee schedule + payment history (built inline in fees page)
- [x] `src/components/student-portal/TimetableGrid.tsx` — Weekly timetable grid (built inline in timetable page)
- [x] `src/actions/studentPortal.ts` — Server actions: getStudentProfile, getStudentTimetable, getStudentAttendanceSummary, getStudentFeeHistory, getStudentFeeStructures, getStudentDashboardStats
- [x] `src/types/studentPortal.ts` — StudentProfile, StudentScheduleSlot, StudentAttendanceRow, StudentFeePayment, StudentFeeStructure, StudentDashboardStats
- [x] `src/app/login/actions.ts` — Updated to detect student role (checks students table) and redirect to `/student-portal`

#### Extra (built beyond roadmap):
- [x] `src/components/student-portal/StudentPortalShell.tsx` — Standalone shell (indigo theme, collapsible sidebar, no DashboardLayout)
- [x] `src/components/student-portal/StudentViewShell.tsx` — Admin-preview shell ("Admin Preview" badge, "Back to Students" link)
- [x] `src/app/student-portal/view/[studentId]/layout.tsx` — Admin preview layout loading student data by ID
- [x] `src/app/student-portal/view/[studentId]/page.tsx` — Admin preview dashboard
- [x] `src/app/student-portal/view/[studentId]/timetable/page.tsx` — Admin preview timetable
- [x] `src/app/student-portal/view/[studentId]/attendance/page.tsx` — Admin preview attendance
- [x] `src/app/student-portal/view/[studentId]/fees/page.tsx` — Admin preview fees
- [x] Student table in admin Users page: login icon (opens view route), key icon (credentials modal), pill toggle (block/unblock) — in both main table and cohort drawer table

#### Key features:
- Show only data for the logged-in student's department and year
- Attendance ring chart per subject (present/total classes) with colour-coded thresholds
- Warning banner if overall attendance < 75%
- Fee schedule + payment history with status badges (Paid/Pending/Failed/Refunded)
- Timetable: department schedule for current semester (read-only)
- Admin can preview any student's portal at `/student-portal/view/[studentId]`

#### Middleware rule:
- If logged-in user role !== 'STUDENT' → redirect to `/student-portal`
- Admins can access `/student-portal/view/*` for preview; blocked from student self-service area
- Staff cannot access student portal or admin view routes

---

### Phase 1 Completion Checklist
- [x] Both portals fully built and tested
- [x] Middleware correctly redirects based on role (staff → /staff-portal, student → /student-portal, admin → /)
- [x] `npm run build` passes with zero TypeScript errors
- [x] `src/app/student-portal/fees/pay/page.tsx` — Razorpay online payment
- [x] No admin data leaks to portal users (RLS policy audit complete)
- [x] `git commit -m "feat: Phase 1 — Staff & Student Portals complete"`
- [x] `git push origin main`

---

## 🧱 Foundation Migrations (Prerequisites for Phase 2+)

> **Critical — build these before starting Step 2A.**
> These four steps resolve structural gaps — missing master tables, un-migrated FK columns,
> and the absent HOD role — that every Phase 2+ module depends on.
> Skipping them will create unresolvable FK inconsistencies across Academic, CIA,
> Curriculum, Appraisal, and Finance modules.

### Step 2-Pre-A — Subjects Master Table & Teaching Assignments ✅

> Every Phase 2+ module references `subjects(id)` as a FK — CIA marks, curriculum units,
> lesson plans, guest lectures, study materials — yet no such table exists. The timetable
> currently stores subject names as free text. This step formalises subjects as a first-class
> entity and establishes which staff member teaches which subject each semester.

#### Database:
```sql
CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,                    -- e.g. "CS301", "PH201"
  subject_type    TEXT NOT NULL DEFAULT 'theory'
                  CHECK (subject_type IN ('theory','lab','elective','project')),
  semester        INTEGER NOT NULL,
  credits         INTEGER NOT NULL DEFAULT 3,
  hours_per_week  INTEGER NOT NULL DEFAULT 5,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, department_id, code, semester)
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects: institution members can manage"
  ON public.subjects
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

-- Who teaches which subject this academic year
CREATE TABLE teaching_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  semester         INTEGER NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT TRUE,   -- primary vs co-teacher
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, subject_id, academic_year_id)
);
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teaching_assignments: institution members can manage"
  ON public.teaching_assignments
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### What to build:
- [x] `supabase/migrations/..._subjects.sql` — subjects + teaching_assignments + RLS policies
- [x] `src/app/institutions/[id]/subjects/page.tsx` — Subject registry per department and semester (add/edit/deactivate)
- [x] `src/actions/subjects.ts` — getSubjects, addSubject, updateSubject, assignTeacher, getTeachingAssignments, getMySubjects (for staff portal)
- [x] `src/components/subjects/SubjectForm.tsx` — Add/edit form: name, code, type, credits, hours/week, semester
- [x] `src/components/subjects/TeachingAssignmentDrawer.tsx` — Assign staff to subject for a given semester
- [ ] Backfill migration: parse existing subject name text from `class_schedules` (timetable) and seed the subjects table
- [x] Update `class_schedules`: `subject_id UUID REFERENCES subjects(id)` column already present; `subject_name TEXT` kept as fallback

#### Why this unblocks:
- CIA marks entry (2E): `subject_id` authorises the correct staff to enter marks — without it, any staff can enter marks for any subject
- Lesson plan diary (2G): auto-pre-fills subject from the teacher's active assignment
- Appraisal workload report (5E): counts hours taught per subject per staff member
- Study materials (6G): Supabase Storage RLS gates files to students enrolled in the relevant department

---

### Step 2-Pre-B — `academic_years` FK Migration for Existing Tables ✅

> Step 2A creates the `academic_years` master table. Once it exists and at least one year is
> seeded, run this migration to convert all existing `academic_year TEXT` columns platform-wide
> to typed FK references. Without this, Phase 2 modules will have two incompatible ways to
> reference the same academic year, breaking join queries and reports.

#### Tables to audit for `academic_year TEXT` columns before running:
- `fee_payments`
- `salary_disbursements`
- `fee_structures`
- `class_schedules`
- `attendance_sessions`

#### Migration pattern (repeat for each affected table):
```sql
-- Step 1: Add FK column alongside the old text column
ALTER TABLE fee_payments
  ADD COLUMN academic_year_id UUID REFERENCES academic_years(id);

-- Step 2: Backfill FK from matching label in academic_years
UPDATE fee_payments fp
  SET academic_year_id = ay.id
  FROM academic_years ay
  WHERE ay.label = fp.academic_year
    AND ay.institution_id = fp.institution_id;

-- Step 3: Drop old text column only after verifying all rows have been backfilled
ALTER TABLE fee_payments DROP COLUMN academic_year;
```

#### What to build:
- [x] `supabase/migrations/..._academic_year_fk_migration.sql` — Migrated `fee_structures`, `budgets`, `draft_schedules`; views recreated; `class_schedules.tenant_id` renamed to `institution_id`
- [x] Update all Server Actions that accept `academic_year: string` to query by `academic_year_id` (UUID) instead
- [x] Update all UI selectors that show a free-text year input to a dropdown bound to the `academic_years` table

---

### Step 2-Pre-C — HOD Role & Department Head Designation ✅

> Multiple workflows name the HOD explicitly — leave approvals, appraisals, disciplinary
> actions, year promotion sign-off — but the auth system only has `ADMIN`, `STAFF`, `STUDENT`.
> This step adds HOD as a first-class role so those workflows can be properly gated.

#### Database:
```sql
-- Designate a staff member as HOD per department
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS hod_id UUID REFERENCES staff(id);

-- Extend role enum to include HOD
ALTER TABLE public.institution_members
  DROP CONSTRAINT IF EXISTS institution_members_role_check;
ALTER TABLE public.institution_members
  ADD CONSTRAINT institution_members_role_check
  CHECK (role IN ('ADMIN', 'HOD', 'STAFF', 'STUDENT'));
```

#### What to build:
- [x] `supabase/migrations/..._hod_role.sql` — Add `hod_id` to departments; extend `institution_members.role` CHECK to include `'HOD'`
- [x] `src/app/institutions/[id]/departments/page.tsx` — "Set as HOD" / "Remove HOD" buttons in StaffDirectory; updates both `departments.hod_id` and `institution_members.role`
- [x] `src/actions/departments.ts` — `setHOD(departmentId, staffId)`, `removeHOD(departmentId)`
- [x] Middleware: HOD role routes to the admin panel (`/`) with department-scoped data, NOT to `/staff-portal` — update route guards
- [x] Sidebar: HOD sees a limited admin panel (HOD Panel label, dept-scoped nav)
- [ ] Leave approval (staffPortal.ts): forward unapproved leave requests to the HOD — deferred to Phase 5
- [ ] Appraisal review (Step 5E): HOD reviews and scores appraisals for their department's staff
- [ ] Disciplinary actions (Step 5H): HOD sign-off required before incident status is `resolved`
- [ ] Year promotion (Step 2D): HOD confirms department eligibility list before admin commits the promotion run

---

### Step 2-Pre-D — Fee Concession & Waiver Management ✅

**Route:** `/institutions/[id]/finance/concessions`

> Separate from formal scholarship schemes (Step 5G). This covers admin-discretion waivers —
> staff ward discounts, management quota reductions, hardship waivers. Without this, finance
> reports are inaccurate: gross fees vs net receivables will not reconcile.

#### Database:
```sql
CREATE TABLE fee_concessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  concession_type  TEXT NOT NULL CHECK (concession_type IN (
                     'staff_ward','management_quota','merit',
                     'hardship','sports_quota','other')),
  amount           NUMERIC(10,2),          -- Fixed INR amount discount
  percentage       NUMERIC(5,2),           -- OR percentage discount (use one, not both)
  applicable_to    TEXT,                   -- NULL = all fees; or specific fee_structure type
  reason           TEXT NOT NULL,
  approved_by      UUID REFERENCES auth.users(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE fee_concessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_concessions: institution members can manage"
  ON public.fee_concessions
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### What to build:
- [x] `supabase/migrations/..._fee_concessions.sql`
- [x] `src/app/institutions/[id]/finance/concessions/page.tsx` — Grant and manage concessions per student; filter by type and status
- [x] `src/actions/concessions.ts` — grantConcession, approveConcession, rejectConcession, getConcessionsByStudent
- [x] `src/components/finance/ConcessionDrawer.tsx` — Apply concession: student search, type, fixed amount or %, reason
- [ ] Fee ledger integration: approved concession auto-reduces student's outstanding balance
- [ ] Student portal: concession appears as a credit entry in fee payment history
- [ ] Finance reports: add "Total Concessions Granted" column

#### Key features:
- Amount-based or percentage-based concession (mutually exclusive — validate at form level)
- Scoped to all fees or a specific fee structure type
- Approval workflow: admin submits → HOD or senior admin approves
- Revenue reconciliation: concessions appear as a deduction line in the Finance Reports page

### Foundation Migrations Checklist
- [x] `subjects` table live with at least one subject per active department
- [x] `teaching_assignments` table live; at least one staff assigned per subject
- [x] `academic_years` table live with at least one year marked `is_current = true`
- [x] `academic_years` FK migration complete for all affected tables (fee_structures, budgets, draft_schedules migrated; fee_payments, salary_disbursements, class_schedules never had the column)
- [x] HOD role added to `institution_members` CHECK constraint
- [ ] At least one HOD designated per department (user data — requires admin action)
- [x] `fee_concessions` table live with RLS enabled
- [x] `npm run build` passes with zero TypeScript errors
- [x] `git commit -m "feat: Foundation Migrations — subjects, academic_years FK, HOD role, fee concessions"`
- [ ] `git push origin main`

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

## 🚨 Phase 2.5 — Immediate Critical Fixes (Do Before Phase 3)

> **Why this phase exists:** Three high-risk gaps were identified after Phase 2 completion that must be patched before any new feature work. These are not new features — they are security and reliability fixes to modules already live. Do not skip this phase.

### Step 2.5A — Razorpay Webhook Signature Verification 🔒

> **Risk:** The live fee payment module accepts Razorpay webhook events without verifying the `X-Razorpay-Signature` header. A malicious actor can POST a fake `payment.captured` event and mark a fee as paid without actual payment.

#### What to fix:
- [ ] `src/app/api/razorpay-webhook/route.ts` — Add HMAC-SHA256 signature verification using `RAZORPAY_WEBHOOK_SECRET`
- [ ] Verify: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex') === X-Razorpay-Signature`
- [ ] Use `req.text()` to get the raw body **before** JSON parsing — parsed body breaks HMAC
- [ ] Return `400` immediately on signature mismatch; log the attempt for audit
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` to `.env.local` and Vercel env vars
- [ ] Test with Razorpay webhook simulator in test mode

#### Code pattern:
```typescript
// src/app/api/razorpay-webhook/route.ts
import crypto from 'crypto';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return new Response('Invalid signature', { status: 400 });
  }
  const event = JSON.parse(rawBody);
  // ... process event
}
```

#### Env var to add:
```env
RAZORPAY_WEBHOOK_SECRET=   # From Razorpay Dashboard → Webhooks → Secret
```

---

### Step 2.5B — Data Privacy & DPDP Act 2023 Compliance Framework 🔐

> **Risk:** India's Digital Personal Data Protection Act 2023 is enforceable. Aura stores student PII (name, DOB, medical records, financial data, biometric NFC). Operating without consent capture and data subject rights exposes every institution client to regulatory liability.

#### Database:
```sql
CREATE TABLE data_consent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  consent_type    TEXT NOT NULL CHECK (consent_type IN (
                    'platform_terms','data_processing','marketing_comms',
                    'biometric_nfc','medical_records','photo_usage')),
  consented       BOOLEAN NOT NULL,
  ip_address      TEXT,
  user_agent      TEXT,
  consented_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at    TIMESTAMPTZ
);
ALTER TABLE data_consent_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE data_erasure_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES auth.users(id),
  subject_type    TEXT NOT NULL CHECK (subject_type IN ('student','staff','parent')),
  subject_id      UUID NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','in_review','completed','rejected')),
  admin_notes     TEXT,
  requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ
);
ALTER TABLE data_erasure_requests ENABLE ROW LEVEL SECURITY;
```

#### What to build:
- [ ] `supabase/migrations/..._dpdp_compliance.sql` — consent_logs + erasure_requests tables
- [ ] `src/app/privacy-policy/page.tsx` — Public privacy policy page (required by DPDP)
- [ ] `src/components/auth/ConsentBanner.tsx` — Consent capture on first login (checkboxes for data processing, marketing, biometric if applicable)
- [ ] `src/actions/privacy.ts` — recordConsent, withdrawConsent, requestErasure, getConsentStatus
- [ ] `src/app/institutions/[id]/compliance/page.tsx` — Admin view: erasure requests queue, consent audit log
- [ ] Student/Staff portal: `src/app/[portal]/privacy/page.tsx` — View consents given, withdraw specific consent, submit erasure request
- [ ] Data retention policy: define retention periods per data type in `src/lib/dataRetention.ts` (e.g. financial records: 7 years; medical: 5 years; attendance: 3 years)
- [ ] Add privacy policy link to all portal footers and login pages

#### Key rules (DPDP 2023):
- Consent must be free, specific, informed, and unambiguous
- Users have the right to withdraw consent at any time
- Data erasure requests must be fulfilled within 72 hours (or documented reason for refusal)
- Children under 18 require verifiable parental consent for data processing

---

### Step 2.5C — Backup, Disaster Recovery & Scheduler Resilience ☁️

> **Risk:** No documented backup strategy for a live SaaS holding marks, financial, and attendance data. The Python scheduler on port 8000 has no health check or fallback — if it goes down, timetable generation is completely broken with no user-facing error.

#### Supabase Backup Configuration:
- [ ] Enable **Point-in-Time Recovery (PITR)** on the Supabase project dashboard (requires Pro plan)
- [ ] Set backup retention to minimum 7 days (30 days recommended for production)
- [ ] Document RTO (Recovery Time Objective): target < 4 hours
- [ ] Document RPO (Recovery Point Objective): target < 1 hour with PITR
- [ ] Set up weekly manual export via `supabase db dump` in a GitHub Actions cron workflow → store encrypted in a private S3 bucket or Supabase Storage private bucket

#### Scheduler Health & Fallback:
- [ ] `src/lib/scheduler.ts` — Wrap all `SCHEDULER_API_URL` calls in a `callScheduler()` helper that:
  - Sets a 30s timeout
  - Catches network errors and returns `{ success: false, error: 'Scheduler unavailable' }`
  - Logs the failure to a `scheduler_error_logs` table for admin visibility
- [ ] `src/app/api/scheduler-health/route.ts` — Health check endpoint that pings `SCHEDULER_API_URL/health` and returns status
- [ ] `src/app/institutions/[id]/timetable/page.tsx` — Show a visible banner when scheduler is unreachable: "AI Scheduler is offline — you can still publish a manually built draft"
- [ ] Add uptime monitoring for scheduler (use UptimeRobot free tier or similar) and alert admin via email if down > 5 minutes
- [ ] Document manual timetable fallback procedure in the admin guide

#### GitHub Actions backup workflow:
```yaml
# .github/workflows/db-backup.yml
name: Weekly DB Backup
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: supabase/setup-cli@v1
      - run: supabase db dump --db-url ${{ secrets.SUPABASE_DB_URL }} > backup.sql
      - run: gzip backup.sql
      # Upload to storage of your choice
```

#### Env var to add:
```env
SUPABASE_DB_URL=   # postgres://... direct connection string (from Supabase dashboard)
```

---

### Phase 2.5 Completion Checklist
- [ ] Razorpay webhook signature verified and tested with simulator
- [ ] `RAZORPAY_WEBHOOK_SECRET` added to all environments
- [ ] Consent capture shown on first login for all new users
- [ ] Privacy policy page live at `/privacy-policy`
- [ ] Erasure request flow working end-to-end
- [ ] Supabase PITR enabled on production project
- [ ] Scheduler health check endpoint live
- [ ] Scheduler unavailability banner showing in timetable page
- [ ] `git commit -m "fix: Phase 2.5 — Security & Compliance patches"`
- [ ] `git push origin main`

---

## 🔔 Phase 3 — Notification Engine & Alert Infrastructure

> **Goal:** Connect all modules with intelligent alerts so nothing falls through
> the cracks. Staff get notified about leave approvals. Students get fee reminders.
> Admins get attendance alerts.

### Step 3A — Notification Infrastructure

#### Database (run migration):
```sql
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- ✅ Fixed: was profiles(id) which is legacy
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_id, is_read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
```

#### What to build:
- [ ] Migration SQL file in `supabase/migrations/`
- [ ] `src/actions/notifications.ts` — createNotification, getNotifications, markAsRead, markAllRead
- [ ] `src/components/layout/NotificationBell.tsx` — Bell icon with unread badge in nav
- [ ] `src/components/layout/NotificationPanel.tsx` — Slide-out panel listing notifications
- [ ] `src/hooks/useNotifications.ts` — Supabase realtime subscription for live updates

---

### Step 3B — Notification Triggers

Wire notifications into existing modules:

#### What to build:
- [ ] Fee due reminder — trigger when fee_payment is 7 days overdue → notify student
- [ ] Payment received — trigger on fee_payment status=completed → notify student
- [ ] Leave request — trigger on new leave application → notify institution admin
- [ ] Leave approved/rejected — trigger on leave status update → notify staff
- [ ] Low attendance alert — trigger when student attendance < 75% → notify student
- [ ] Salary disbursed — trigger on disbursement status=processed → notify staff
- [ ] Schedule published — trigger on draft published → notify all dept staff & students
- [ ] `src/actions/notificationTriggers.ts` — all trigger functions

---

### Step 3C — Email, SMS & WhatsApp Notifications

#### Email — Resend Integration
- [ ] Integrate Resend (resend.com) for transactional emails
- [ ] Email template: Fee Due Reminder
- [ ] Email template: Payment Receipt
- [ ] Email template: Leave Approved/Rejected
- [ ] Email template: Salary Slip
- [ ] Email template: Exam Schedule Released
- [ ] `src/lib/email.ts` — sendEmail() wrapper around Resend API
- [ ] Add `RESEND_API_KEY` to .env.local

#### SMS — MSG91 / Fast2SMS Integration
> Indian institutions rely heavily on SMS for parents and non-tech-savvy staff who may not regularly check email.
- [ ] Integrate MSG91 or Fast2SMS SMS gateway
- [ ] SMS trigger: Fee due reminder to parent/student phone
- [ ] SMS trigger: Exam schedule notification
- [ ] SMS trigger: Attendance alert (< 75%)
- [ ] SMS trigger: OTP for parent portal registration
- [ ] `src/lib/sms.ts` — sendSMS() wrapper
- [ ] Add `SMS_API_KEY` and `SMS_SENDER_ID` to .env.local

#### WhatsApp — Meta Cloud API
> WhatsApp Business API enables rich notifications with PDF attachments (payslips, fee receipts) — the preferred communication channel for Indian parents.
- [ ] Integrate WhatsApp Business Cloud API (or Twilio WhatsApp sandbox for dev)
- [ ] WhatsApp template: Fee receipt with PDF attachment
- [ ] WhatsApp template: Salary slip with PDF attachment
- [ ] WhatsApp template: Leave status update (approved/rejected)
- [ ] WhatsApp template: Exam hall ticket download link
- [ ] `src/lib/whatsapp.ts` — sendWhatsApp() wrapper
- [ ] Add `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to .env.local

---

### Step 3D — Digital Notice Board & Announcements

**Route:** `/institutions/[id]/notices`

> Centralized announcement system replacing physical notice boards. Visible across all portals with audience targeting. Day-to-day campus communication backbone.

#### Database:
```sql
CREATE TABLE notices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  notice_type      TEXT NOT NULL CHECK (notice_type IN (
                     'academic','exam','holiday','event','emergency',
                     'placement','hostel','transport','general')),
  target_audience  TEXT NOT NULL CHECK (target_audience IN (
                     'all','students','staff','parents','hostel')),
  department_id    UUID REFERENCES departments(id),   -- NULL = institution-wide
  attachment_url   TEXT,           -- PDF circular via Supabase Storage
  is_pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at       DATE,
  posted_by        UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [ ] `supabase/migrations/..._notices.sql`
- [ ] `src/app/institutions/[id]/notices/page.tsx` — Admin: create notices, pin/unpin, manage target audience
- [ ] `src/actions/notices.ts` — createNotice, updateNotice, deleteNotice, getActiveNotices
- [ ] `src/components/notices/NoticeBoard.tsx` — Notice board widget embeddable in any portal dashboard
- [ ] `src/components/notices/NoticeBadge.tsx` — Type badge (Emergency — red, Academic — violet, Event — amber)
- [ ] Student portal: `src/app/student-portal/notices/page.tsx` — Active notices filtered for students
- [ ] Staff portal: `src/app/staff-portal/notices/page.tsx` — Active notices filtered for staff
- [ ] Integration: creating an Emergency or Exam notice optionally triggers a push notification (Phase 3B)

#### Key features:
- Audience targeting: all / students only / staff only / specific dept / hostel residents
- Pinned notices always appear at top of board
- Auto-expire: notices disappear after `expires_at` date
- PDF attachment support for official circulars
- Optional push notification + WhatsApp trigger for urgent/emergency notices

---

### Phase 3 Completion Checklist
- [ ] Notifications table created and RLS locked down
- [ ] Bell icon shows live unread count in all nav bars
- [ ] All 7 trigger events fire correctly
- [ ] Email sending works for at least fee and payment events
- [ ] SMS sending works for at least attendance alert
- [ ] WhatsApp template sending works for fee receipt
- [ ] Digital Notice Board live on all portals with audience targeting and auto-expiry
- [ ] `npx tsc --noEmit` passes
- [ ] `git commit -m "feat: Phase 3 — Notifications System complete"`
- [ ] `git push origin main`

---

## 🏛️ Phase 4 — Campus Infrastructure & Laboratories

> **Goal:** Digitise the physical campus operations that run parallel to academics —
> library, spaces, hostels, scientific laboratories, and asset inventory. Each is a self-contained module with its own
> admin panel, and student/staff-facing views in the respective portals.

### Step 4A — Library Management System

**Route:** `/institutions/[id]/library`

#### Database:
```sql
CREATE TABLE library_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  isbn            TEXT,
  category        TEXT NOT NULL,
  total_copies    INTEGER NOT NULL DEFAULT 1,
  available_copies INTEGER NOT NULL DEFAULT 1,
  published_year  INTEGER,
  publisher       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE library_lendings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  book_id         UUID NOT NULL REFERENCES library_books(id),
  borrower_id     UUID NOT NULL REFERENCES auth.users(id),  -- ✅ Fixed: handles both staff and student borrowers
  borrower_type   TEXT NOT NULL DEFAULT 'student' CHECK (borrower_type IN ('student','staff')),
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  returned_date   DATE,
  fine_amount     NUMERIC(6,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'issued'
                  CHECK (status IN ('issued','returned','overdue','lost'))
);
```

#### What to build:
- [ ] `supabase/migrations/..._library.sql`
- [ ] `src/app/institutions/[id]/library/page.tsx` — Book catalog with search/filter by category, dept, availability
- [ ] `src/app/institutions/[id]/library/lend/page.tsx` — Issue/return books, scan by ISBN or search
- [ ] `src/app/institutions/[id]/library/overdue/page.tsx` — Overdue tracker with fine calculation
- [ ] `src/actions/library.ts` — getBooks, issueBook, returnBook, getOverdueList, calculateFine
- [ ] `src/components/library/BookCard.tsx` — Book listing card with availability badge
- [ ] `src/components/library/LendingDrawer.tsx` — Issue/return slide-out panel
- [ ] Student portal: `src/app/student-portal/library/page.tsx` — My borrowed books, due dates, fines
- [ ] Staff portal: `src/app/staff-portal/library/page.tsx` — Staff borrowed books

#### Key features:
- Fine auto-calculation (configurable rate per day overdue)
- Availability badge (copies available / total)
- Department-filtered catalog for students
- Fine integration with fee payments (overdue fines added to student dues)

---

### Step 4B — Auditorium & Space Booking

**Route:** `/institutions/[id]/bookings`

#### Database:
```sql
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  venue_type      TEXT NOT NULL CHECK (venue_type IN ('auditorium','seminar_hall','lab','conference_room','ground','other')),
  capacity        INTEGER,
  amenities       JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE venue_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  venue_id        UUID NOT NULL REFERENCES venues(id),
  booked_by       UUID NOT NULL REFERENCES auth.users(id),
  event_title     TEXT NOT NULL,
  purpose         TEXT,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ NOT NULL,
  attendees_count INTEGER,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','cancelled')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [ ] `supabase/migrations/..._venues.sql`
- [ ] `src/app/institutions/[id]/bookings/page.tsx` — Admin: venue list + booking calendar (week/month view)
- [ ] `src/app/institutions/[id]/bookings/venues/page.tsx` — Manage venue registry (add/edit/deactivate)
- [ ] `src/app/institutions/[id]/bookings/requests/page.tsx` — Approve/reject pending bookings
- [ ] `src/actions/venueBookings.ts` — getVenues, createBooking, approveBooking, rejectBooking, getBookingCalendar
- [ ] `src/components/bookings/BookingCalendar.tsx` — Recharts/custom calendar showing booked slots per venue
- [ ] `src/components/bookings/BookingRequestDrawer.tsx` — Staff submit booking request
- [ ] Staff portal: `src/app/staff-portal/bookings/page.tsx` — Submit request + view status of own bookings

#### Key features:
- Conflict detection: cannot double-book a venue for the same time slot
- Calendar view: colour-coded by venue, click slot to see booking detail
- Approval workflow with admin notes
- Bookings auto-appear on the academic calendar as events

---

### Step 4C — Hostel Management

**Route:** `/institutions/[id]/hostels`

> Most complex module in Phase 4. Plan the DB schema carefully before building.
> Multiple hostels, multiple floors, multiple rooms per floor.
> 
> *Note on Optimization:* Integrate with the **Python Engine** to automate roommate matching and stable room assignments based on student preferences and compatibility constraints.

#### Database:
```sql
CREATE TABLE hostels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  hostel_type     TEXT NOT NULL CHECK (hostel_type IN ('boys','girls','co-ed')),
  warden_id       UUID REFERENCES staff(id),
  total_rooms     INTEGER,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE hostel_rooms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number     TEXT NOT NULL,
  floor           INTEGER NOT NULL DEFAULT 1,
  room_type       TEXT NOT NULL CHECK (room_type IN ('single','double','triple','dormitory')),
  capacity        INTEGER NOT NULL DEFAULT 2,
  occupied        INTEGER NOT NULL DEFAULT 0,
  amenities       JSONB
);

CREATE TABLE hostel_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id),
  room_id         UUID NOT NULL REFERENCES hostel_rooms(id),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  allocated_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  allocated_to    DATE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','vacated','transferred')),
  UNIQUE(student_id, status) DEFERRABLE
);

CREATE TABLE hostel_announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id),
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  posted_by       UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mess_menu (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id       UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  day_of_week     TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_type       TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','snacks','dinner')),
  menu_items      JSONB NOT NULL,   -- Array of dish names
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, day_of_week, meal_type)
);

CREATE TABLE mess_billing (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id       UUID NOT NULL REFERENCES hostels(id),
  month           TEXT NOT NULL,       -- e.g. "2025-07"
  plan_type       TEXT NOT NULL CHECK (plan_type IN ('full','veg_only','non_veg','custom')),
  amount          NUMERIC(8,2) NOT NULL,
  is_paid         BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at         TIMESTAMPTZ,
  UNIQUE(student_id, month)
);

CREATE TABLE hostel_maintenance_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id        UUID NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_id          UUID REFERENCES hostel_rooms(id),
  raised_by        UUID NOT NULL REFERENCES auth.users(id),
  category         TEXT NOT NULL CHECK (category IN (
                     'electrical','plumbing','furniture','cleaning',
                     'ac_fan','pest_control','other')),
  description      TEXT NOT NULL,
  photo_url        TEXT,
  priority         TEXT NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('urgent','normal','low')),
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to      TEXT,           -- Maintenance staff name
  resolution_notes TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [ ] `supabase/migrations/..._hostels.sql`
- [ ] `src/app/institutions/[id]/hostels/page.tsx` — Hostel overview: list of hostels, occupancy stats
- [ ] `src/app/institutions/[id]/hostels/[hostelId]/page.tsx` — Floor plan view, room occupancy grid
- [ ] `src/app/institutions/[id]/hostels/[hostelId]/allocations/page.tsx` — Allocate/transfer/vacate students
- [ ] `src/app/institutions/[id]/hostels/[hostelId]/announcements/page.tsx` — Hostel-specific announcements
- [ ] `src/app/institutions/[id]/hostels/cafeteria/page.tsx` — Cafeteria weekly menu board editor (day × meal grid)
- [ ] `src/app/institutions/[id]/hostels/cafeteria/billing/page.tsx` — Monthly mess billing: generate bills per student, mark paid
- [ ] `src/actions/mess.ts` — getMessMenu, updateMessMenu, generateMessBills, markMessPaid
- [ ] `src/actions/hostels.ts` — getHostels, getRooms, allocateStudent, vacateStudent, getOccupancyStats
- [ ] `src/actions/hostelMaintenance.ts` — raiseMaintenanceRequest, updateRequestStatus, getOpenRequests, resolveRequest
- [ ] `src/components/hostels/RoomGrid.tsx` — Visual floor-wise room grid with colour: empty/partial/full
- [ ] `src/components/hostels/AllocationDrawer.tsx` — Search student → assign to room
- [ ] `src/app/institutions/[id]/hostels/[hostelId]/maintenance/page.tsx` — Warden dashboard: open requests by priority, assign maintenance staff, mark resolved with notes
- [ ] Student portal: `src/app/student-portal/hostel/page.tsx` — Room number, hostel name, roommates, announcements, cafeteria menu, mess bill status, raise maintenance request
- [ ] Hostel fee auto-linked to existing `fee_structures` (hostel fee type already exists)

#### Key features:
- Floor-wise room grid with colour-coded occupancy
- Conflict check: student cannot be in two rooms simultaneously
- Warden can post announcements visible in student portal
- Cafeteria: weekly menu board editable by admin
- Hostel fees auto-appear in student fee ledger
- Maintenance requests: student raises → warden assigns → resolved with notes; urgent priority highlighted in warden dashboard

---

### Step 4D — Laboratory Management

**Route:** `/institutions/[id]/laboratories`

> Manage scientific laboratories (Physics, Chemistry, Botany, Zoology, Bio-tech, Computer Science, etc.), lab student batches, experiment syllabus, sessions, and grading.

#### Database:
```sql
CREATE TABLE laboratories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  name            TEXT NOT NULL,
  lab_type        TEXT NOT NULL CHECK (lab_type IN ('physics','chemistry','botany','zoology','biotech','computer_science','other')),
  capacity        INTEGER,
  lab_assistant_id UUID REFERENCES staff(id),
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE laboratory_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  year_semester   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE laboratory_experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_id   UUID NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  requirements    JSONB -- Chemicals, apparatuses, or instruments needed
);

CREATE TABLE laboratory_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratory_batch_id UUID NOT NULL REFERENCES laboratory_batches(id) ON DELETE CASCADE,
  experiment_id   UUID NOT NULL REFERENCES laboratory_experiments(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  remarks         TEXT
);

CREATE TABLE laboratory_attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES laboratory_sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  is_present      BOOLEAN NOT NULL DEFAULT TRUE,
  marks_secured   NUMERIC(4,2), -- Lab assessment grades
  remarks         TEXT,
  UNIQUE(session_id, student_id)
);
```

#### What to build:
- [ ] `supabase/migrations/..._laboratories.sql`
- [ ] `src/app/institutions/[id]/laboratories/page.tsx` — Labs landing page: list of labs, department filters, and active batches
- [ ] `src/app/institutions/[id]/laboratories/[labId]/page.tsx` — Lab detail: experiment syllabus, schedule, and assistant details
- [ ] `src/app/institutions/[id]/laboratories/[labId]/sessions/page.tsx` — Log a new session, record student attendance, and assign lab session marks
- [ ] `src/actions/laboratories.ts` — getLaboratories, getLabExperiments, logLabSession, submitLabAttendance
- [ ] `src/components/laboratories/ExperimentCard.tsx` — Card showing experiment steps and inventory/chemical requirements
- [ ] Student portal: `src/app/student-portal/laboratories/page.tsx` — View assigned lab batches, experiment logs, attendance, and internal session grades
- [ ] Staff portal: `src/app/staff-portal/laboratories/page.tsx` — Log lab sessions, mark attendance, and record grades

#### Key features:
- Lab assistant assignment and custom lab batch roster scheduling
- Log session-wise experiment completion
- Record attendance and session grades, linking to internal academic profiles
- Quick-reference checklists for required glassware/chemicals per experiment

---

### Step 4E — Asset & Inventory Management

**Route:** `/institutions/[id]/assets`

> Track physical assets, machinery, laboratory equipment, chemicals, glassware, and computer peripherals. Supports consumable stock replenishment, reorder warnings, and asset allocations to labs and departments.

#### Database:
```sql
CREATE TABLE asset_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_consumable   BOOLEAN NOT NULL DEFAULT FALSE -- Consumables like chemicals/glassware vs fixed assets
);

CREATE TABLE assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES asset_categories(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  brand_model     TEXT,
  serial_number   TEXT,
  purchase_date   DATE,
  purchase_cost   NUMERIC(10,2),
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','maintenance','disposed','low_stock')),
  location_details TEXT,
  current_stock   INTEGER NOT NULL DEFAULT 1, -- For stock count
  unit            TEXT NOT NULL DEFAULT 'pcs', -- pcs, ml, grams, boxes etc.
  reorder_level   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE asset_allocations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  allocated_to_type TEXT NOT NULL CHECK (allocated_to_type IN ('department','laboratory','staff')),
  department_id   UUID REFERENCES departments(id),
  laboratory_id   UUID REFERENCES laboratories(id),
  staff_id        UUID REFERENCES staff(id),
  allocated_qty   INTEGER NOT NULL DEFAULT 1,
  allocated_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_qty    INTEGER DEFAULT 0,
  returned_date   DATE,
  status          TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated','returned','consumed'))
);

CREATE TABLE asset_maintenance_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT NOT NULL,
  cost            NUMERIC(8,2) DEFAULT 0,
  logged_by       UUID REFERENCES staff(id)
);
```

#### What to build:
- [ ] `supabase/migrations/..._assets.sql`
- [ ] `src/app/institutions/[id]/assets/page.tsx` — Assets Inventory Dashboard: categorized asset list, stock levels, and replenishment status
- [ ] `src/app/institutions/[id]/assets/allocations/page.tsx` — Track allocations (e.g. allocating microscopes/chemicals to the Physics/Chemistry Lab)
- [ ] `src/app/institutions/[id]/assets/maintenance/page.tsx` — Manage equipment maintenance schedules and track repair costs
- [ ] `src/actions/assets.ts` — getAssets, addAsset, allocateAsset, recordMaintenance, getLowStockItems
- [ ] `src/components/assets/AssetStockAlert.tsx` — Alert banner highlighting assets below reorder levels
- [ ] `src/components/assets/AllocationModal.tsx` — Form allocating asset quantities to a department, lab, or staff member

#### Key features:
- Consumable inventory tracking (e.g., tracking chemical quantities in ml/grams)
- Stock alerts: auto-flag items falling below configured reorder levels
- Allocations mapping: easily see which department, room, or lab possesses specific assets
- Maintenance tracker: logs servicing schedules and keeps running cost calculations for equipment

---

### Step 4E-sub — Vendor & Purchase Order Management

**Route:** `/institutions/[id]/vendors`

> Colleges purchase lab equipment, stationery, furniture, and IT hardware from external vendors. Without a formal PO process, procurement is undocumented, GST invoices are lost, and budget actuals cannot be reconciled. This module provides a vendor registry, PO approval workflow, and asset receipt integration with Step 4E.

#### Database:
```sql
CREATE TABLE vendors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  gst_number      TEXT,
  category        TEXT NOT NULL CHECK (category IN (
                    'lab_equipment','stationery','furniture',
                    'it_hardware','software','maintenance','other')),
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors: institution members can manage"
  ON public.vendors
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE TABLE purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID REFERENCES departments(id),
  vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  po_number       TEXT NOT NULL,   -- auto-generated: PO-YYYY-NNNN
  items           JSONB NOT NULL,  -- Array of { name, qty, unit, unit_price, total }
  total_amount    NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved','received','paid','cancelled')),
  raised_by       UUID REFERENCES staff(id),
  approved_by     UUID REFERENCES auth.users(id),
  invoice_url     TEXT,   -- GST invoice PDF via Supabase Storage
  received_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, po_number)
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_orders: institution members can manage"
  ON public.purchase_orders
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### What to build:
- [ ] `supabase/migrations/..._vendors_purchase_orders.sql`
- [ ] Supabase Storage bucket: `purchase-invoices` (authenticated read, staff write by institution)
- [ ] `src/app/institutions/[id]/vendors/page.tsx` — Vendor registry: list, add, edit, deactivate; filter by category
- [ ] `src/app/institutions/[id]/vendors/purchase-orders/page.tsx` — PO list: filter by status, department, vendor, date range
- [ ] `src/app/institutions/[id]/vendors/purchase-orders/[poId]/page.tsx` — PO detail: line items, status timeline, invoice upload, approve/reject actions
- [ ] `src/actions/vendors.ts` — getVendors, addVendor, updateVendor
- [ ] `src/actions/purchaseOrders.ts` — createPO, submitPO, approvePO, markReceived, markPaid, getPOStats
- [ ] `src/components/vendors/VendorCard.tsx` — Card: vendor name, category badge, GST number, active PO count
- [ ] `src/components/vendors/PurchaseOrderForm.tsx` — Line-item editor: vendor selector, item rows (name, qty, unit price), auto-total
- [ ] Budget integration: approved PO amount auto-updates `budget_line_items.actual_amt` for the relevant department and category (Step 5L)
- [ ] Asset receipt: when PO status → `received`, non-consumable items auto-populate the `assets` table (Step 4E)

#### Key features:
- PO approval workflow: department HOD raises PO → admin approves → vendor supplies → goods received → payment recorded
- Auto-generated PO numbers per institution (PO-YYYY-NNNN sequence)
- Line-item breakdown with quantity, unit price, and total — GST-ready
- GST invoice PDF upload and storage (required for financial audit)
- Asset receipt integration: received assets auto-appear in inventory registry (Step 4E)
- Budget actuals integration: approved POs update department budget line items in real time (Step 5L)

---

### Step 4F — Smart ID Card & NFC Card Registry

**Route:** `/institutions/[id]/id-cards`

> NFC-based attendance (already built) requires every student and staff member to have an assigned NFC card. This module manages card issuance, linking, replacement, and deactivation. Deactivated/lost cards are rejected at the attendance webhook.

#### Database:
```sql
CREATE TABLE smart_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  card_uid        TEXT NOT NULL UNIQUE,   -- NFC chip UID (hex string)
  holder_type     TEXT NOT NULL CHECK (holder_type IN ('student','staff')),
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  staff_id        UUID REFERENCES staff(id) ON DELETE SET NULL,
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','lost','deactivated','replaced')),
  replaced_by     UUID REFERENCES smart_cards(id),  -- points to new card if replaced
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smart_cards_uid ON smart_cards(card_uid);
CREATE INDEX idx_smart_cards_student ON smart_cards(student_id);
CREATE INDEX idx_smart_cards_staff ON smart_cards(staff_id);
```

#### What to build:
- [ ] `supabase/migrations/..._smart_cards.sql`
- [ ] `src/app/institutions/[id]/id-cards/page.tsx` — Card registry: list all issued cards, filter by status / holder type
- [ ] `src/app/institutions/[id]/id-cards/issue/page.tsx` — Issue new card: scan or enter NFC UID → link to student/staff record
- [ ] `src/actions/smartCards.ts` — issueCard, deactivateCard, replaceCard, lookupCardHolder, reportLost
- [ ] `src/components/id-cards/CardIssuanceDrawer.tsx` — Scan / manually enter NFC UID → assign to person
- [ ] Update NFC attendance webhook (`/api/attendance/nfc`) to validate card status — reject deactivated/lost cards with 403

#### Key features:
- NFC UID uniqueness enforced at DB level
- Card replacement flow: old card deactivated → new card links back via `replaced_by`
- Deactivated/lost cards rejected at attendance webhook (security layer)
- Lost card reporting with instant deactivation
- Dashboard: cards issued vs active vs lost count

---

### Step 4G — Gate Pass & Visitor Management

**Route:** `/institutions/[id]/gate`

> Campus security and student movement tracking. Essential for residential colleges. Students leaving campus need warden/HOD approval. All external visitors must be logged.

#### Database:
```sql
CREATE TABLE visitor_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  visitor_name     TEXT NOT NULL,
  visitor_phone    TEXT,
  id_proof_type    TEXT,           -- Aadhaar, PAN, Driving License
  id_proof_number  TEXT,
  purpose          TEXT NOT NULL,
  meeting_with     UUID REFERENCES auth.users(id),
  vehicle_number   TEXT,
  check_in_time    TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_time   TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'checked_in'
                   CHECK (status IN ('checked_in','checked_out'))
);

CREATE TABLE student_outpasses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  hostel_id        UUID REFERENCES hostels(id),
  reason           TEXT NOT NULL,
  destination      TEXT NOT NULL,
  out_time         TIMESTAMPTZ NOT NULL,
  expected_return  TIMESTAMPTZ NOT NULL,
  actual_return    TIMESTAMPTZ,
  approved_by      UUID REFERENCES staff(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected','returned','overdue'))
);
```

#### What to build:
- [ ] `supabase/migrations/..._gate_management.sql`
- [ ] `src/app/institutions/[id]/gate/page.tsx` — Security dashboard: active visitors, pending outpasses, real-time log
- [ ] `src/app/institutions/[id]/gate/visitors/page.tsx` — Log new visitor + check-out
- [ ] `src/app/institutions/[id]/gate/outpasses/page.tsx` — Approve/reject student outpass requests
- [ ] `src/actions/gateManagement.ts` — logVisitor, checkOutVisitor, requestOutpass, approveOutpass
- [ ] Student portal: `src/app/student-portal/outpass/page.tsx` — Apply for outpass, track approval status
- [ ] Staff portal: `src/app/staff-portal/outpass/page.tsx` — Wardens approve pending outpasses for their hostel

#### Key features:
- Visitor log with ID proof type, vehicle entry, and check-in/out timestamps
- Student outpass: apply → warden/HOD approval → security check-out → check-in on return
- Overdue alerts: student not returned by expected time → notification to warden
- Daily/weekly visitor and outpass report

---

### Step 4H — Student Clubs & Organizations (NSS / NCC / Cultural)

**Route:** `/institutions/[id]/clubs`

> Every Indian college has NSS, NCC, cultural committees, sports associations. Tracking these is required for NAAC Criterion 5.3 (Student Participation).

#### Database:
```sql
CREATE TABLE clubs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  club_type            TEXT NOT NULL CHECK (club_type IN (
                         'nss','ncc','cultural','sports','literary',
                         'technical','environmental','other')),
  faculty_coordinator  UUID REFERENCES staff(id),
  student_secretary_id UUID REFERENCES students(id),
  description          TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE club_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
             CHECK (role IN ('member','secretary','joint_secretary','treasurer','president')),
  joined_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(club_id, student_id)
);

CREATE TABLE club_activities (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id            UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  activity_type      TEXT NOT NULL CHECK (activity_type IN (
                       'event','camp','competition','workshop',
                       'community_service','seminar','other')),
  activity_date      DATE NOT NULL,
  venue              TEXT,
  participants_count INTEGER,
  description        TEXT,
  photo_urls         JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [ ] `supabase/migrations/..._clubs.sql`
- [ ] `src/app/institutions/[id]/clubs/page.tsx` — Clubs directory: list, manage, view activity stats
- [ ] `src/app/institutions/[id]/clubs/[clubId]/page.tsx` — Club detail: members roster, activities log
- [ ] `src/actions/clubs.ts` — getClubs, addClub, addMember, logActivity, getNAACReport
- [ ] `src/components/clubs/ClubCard.tsx` — Card: club type badge, coordinator, member count, recent activity
- [ ] Student portal: `src/app/student-portal/clubs/page.tsx` — My clubs, upcoming activities, membership badge
- [ ] NAAC export: student participation in extracurricular activities (Criterion 5.3)

#### Key features:
- NSS and NCC flagged separately for government reporting
- Activity log: community service hours, competition results
- NAAC Criterion 5.3 report: number of students in clubs, activities count
- Student portal shows membership certificates per club

---

### Step 4I — Health & Medical Records (Infirmary)

**Route:** `/institutions/[id]/infirmary`

> College infirmary/sick bay management. Patient visit logs, medicines dispensed, referrals. Essential for residential colleges. Students with chronic conditions need pre-registered medical profiles.

#### Database:
```sql
CREATE TABLE medical_records (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id          UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id              UUID REFERENCES students(id) ON DELETE CASCADE,
  blood_group             TEXT,
  known_allergies         TEXT,
  chronic_conditions      TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  insurance_policy        TEXT
);

CREATE TABLE medical_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES auth.users(id),
  patient_type        TEXT NOT NULL CHECK (patient_type IN ('student','staff')),
  visit_date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  symptoms            TEXT NOT NULL,
  diagnosis           TEXT,
  treatment_given     TEXT,
  medicines_dispensed JSONB,     -- Array of { name, dosage, quantity }
  referred_to         TEXT,      -- External hospital/doctor if referred
  follow_up_date      DATE,
  attended_by         TEXT       -- Doctor/nurse name
);
```

#### What to build:
- [ ] `supabase/migrations/..._infirmary.sql`
- [ ] `src/app/institutions/[id]/infirmary/page.tsx` — Infirmary dashboard: today's visits, medicine log
- [ ] `src/app/institutions/[id]/infirmary/visit/page.tsx` — Log new patient visit with diagnosis and medicines
- [ ] `src/app/institutions/[id]/infirmary/records/page.tsx` — Search student medical profiles
- [ ] `src/actions/infirmary.ts` — logVisit, getMedicalRecord, getVisitHistory, updateMedicalProfile
- [ ] Student portal: `src/app/student-portal/health/page.tsx` — Personal medical record, visit history, upcoming follow-ups
- [ ] Admin: pre-populate medical record from admissions module (blood group, allergies)

#### Key features:
- Student medical profile pre-populated at admission (blood group, allergies, emergency contact)
- Visit log with medicines dispensed per visit
- Referral tracking: student referred to external hospital with reason
- Follow-up date reminder via notification system (Phase 3)

---

### Step 4J — Sports & Physical Education

**Route:** `/institutions/[id]/sports`

> Sports teams, facilities, tournaments, and achievements. NAAC Criterion 4.4 (Maintenance of Infrastructure) and Criterion 5.3 (Student Support). Essential for NIRF rankings.

#### Database:
```sql
CREATE TABLE sports_facilities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  sport_type     TEXT NOT NULL,
  capacity       INTEGER,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sports_teams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  sport_name       TEXT NOT NULL,
  team_category    TEXT NOT NULL CHECK (team_category IN ('men','women','mixed')),
  coach_id         UUID REFERENCES staff(id),
  academic_year_id UUID REFERENCES academic_years(id)
);

CREATE TABLE sports_team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES sports_teams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  position   TEXT,
  UNIQUE(team_id, student_id)
);

CREATE TABLE sports_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  team_id        UUID REFERENCES sports_teams(id),
  student_id     UUID REFERENCES students(id),
  event_name     TEXT NOT NULL,
  level          TEXT NOT NULL CHECK (level IN (
                   'inter_class','inter_college','district',
                   'state','national','international')),
  position       TEXT NOT NULL,   -- Gold, Silver, Bronze, Participant
  event_date     DATE NOT NULL,
  certificate_url TEXT
);
```

#### What to build:
- [ ] `supabase/migrations/..._sports.sql`
- [ ] `src/app/institutions/[id]/sports/page.tsx` — Sports overview: teams, achievements trophy wall, facilities
- [ ] `src/app/institutions/[id]/sports/achievements/page.tsx` — Log achievements: student, level, position, event
- [ ] `src/actions/sports.ts` — getTeams, addTeam, logAchievement, getSportsReport
- [ ] `src/components/sports/AchievementCard.tsx` — Card: sport, level badge, position medal icon
- [ ] Student portal: `src/app/student-portal/sports/page.tsx` — My sports teams, personal achievements
- [ ] NAAC/NIRF export: sports achievements per academic year, level-wise breakdown

#### Key features:
- Achievement levels colour-coded: International (gold) → State (silver) → District (bronze)
- Sports scholarship eligibility auto-link (Step 5G)
- NIRF Criterion: sports achievements and facilities count
- Student portal shows achievements as profile badges

---

### Step 4K — Annual Day & Large Campus Event Management

**Route:** `/institutions/[id]/events`

> The academic calendar (Step 2A) records events as date entries. This module manages the
> operational side of large institutional events — Annual Day, Sports Day, Cultural Fests,
> Convocation — with committee assignment, participant rosters, budget tracking, and photo
> documentation. Separate from Clubs (4H), which are year-round recurring organisations.

#### Database:
```sql
CREATE TABLE campus_events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id       UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  academic_year_id     UUID REFERENCES academic_years(id),
  title                TEXT NOT NULL,
  event_type           TEXT NOT NULL CHECK (event_type IN (
                         'annual_day','sports_day','cultural_fest','tech_fest',
                         'convocation','orientation','open_day','seminar_day','other')),
  event_date           DATE NOT NULL,
  venue                TEXT,
  organizing_committee JSONB,    -- Array of { staff_id, role }
  budget_allocated     NUMERIC(10,2),
  actual_spend         NUMERIC(10,2) NOT NULL DEFAULT 0,
  attendees_count      INTEGER,
  photo_urls           JSONB,
  description          TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campus_events: institution members can manage"
  ON public.campus_events
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

CREATE TABLE event_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  student_id   UUID REFERENCES students(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'participant'
               CHECK (role IN ('participant','organizer','performer','volunteer')),
  UNIQUE(event_id, student_id)
);
```

#### What to build:
- [ ] `supabase/migrations/..._campus_events.sql`
- [ ] `src/app/institutions/[id]/events/page.tsx` — Event registry: upcoming and past events, budget vs spend overview
- [ ] `src/app/institutions/[id]/events/[eventId]/page.tsx` — Event detail: committee roster, participant list, budget line items, photo gallery
- [ ] `src/actions/campusEvents.ts` — createEvent, addParticipant, bulkAddParticipants, updateBudget, uploadEventPhotos
- [ ] `src/components/events/EventCard.tsx` — Card: event type badge, date, venue, participant count, budget status (over/under)
- [ ] Student portal: `src/app/student-portal/events/page.tsx` — Upcoming events in their institution, registered events, volunteer sign-up
- [ ] Academic calendar integration: creating a campus event auto-adds it to the academic calendar (Step 2A) as an `annual_day` / `sports_day` etc. event entry
- [ ] NAAC Criterion 5.3 export: number of institutional events per year, student participation counts

#### Key features:
- Committee assignment: designate organizing staff and their roles (Coordinator, Stage Manager, MC, etc.)
- Budget tracker: allocated vs actual spend with line-item breakdown
- Participant roster: students register or volunteer; admin can bulk-import via CSV
- Photo gallery per event for NAAC/NIRF evidence documentation
- Auto-synced to academic calendar on creation (no duplicate entry)

---

### Phase 4 Completion Checklist
- [ ] Library: book catalog, lending, overdue fine calculation all working
- [ ] Auditorium: venue booking with conflict detection and approval flow
- [ ] Hostel: room allocation, occupancy grid, mess billing, maintenance requests, student portal hostel view
- [ ] Laboratories: labs registry, student batches, experiment sessions, and portal views
- [ ] Assets: stock registry, low stock alerts, allocations to labs, and maintenance logs
- [ ] Smart cards: NFC card registry with issuance and deactivation working
- [ ] Gate pass: visitor log and student outpass working with warden approval
- [ ] Clubs: NSS/NCC and all clubs registered with activity logs and NAAC export
- [ ] Infirmary: visit log and student medical profiles working
- [ ] Sports: teams, facilities, and achievements logged with NIRF export
- [ ] Campus Events: event registry with committee assignment, participant rosters, and budget tracking
- [ ] All campus infrastructure modules integrated with student and staff portals
- [ ] `git commit -m "feat: Phase 4 — Campus Infrastructure & Laboratories complete"`
- [ ] `git push origin main`

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

## 🚀 Phase 6 — Parent Portals & Extended Digital Tools

> **Goal:** Elevate AURA with specialized portals and digital toolsets: Parent portals, bus route tracking, document generators, and online MCQ examinations.

### Step 6A — Parent Portal

**Route:** `/parent-portal`

> Read-only view of a child's academic activity. Parents can also pay fees. One parent account
> can be linked to multiple children (e.g. siblings in the same institution) via a junction table.

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

#### What to build:
- [ ] `supabase/migrations/..._parents.sql`
- [ ] `src/app/parent-portal/layout.tsx` — Parent portal shell (amber/orange theme) with child-switcher in topbar (dropdown listing all linked children by name; persists selected child in session)
- [ ] `src/app/parent-portal/page.tsx` — Dashboard: selected child's attendance %, upcoming exams, fees due; if multiple children are linked, show a child-selector card grid on first visit
- [ ] `src/app/parent-portal/attendance/page.tsx` — Selected child's subject-wise attendance
- [ ] `src/app/parent-portal/results/page.tsx` — Selected child's marks and arrear status (Step 2C)
- [ ] `src/app/parent-portal/fees/page.tsx` — Selected child's fees ledger + Razorpay payment on behalf
- [ ] `src/actions/parentPortal.ts` — getLinkedStudents (returns all children via parent_student_links), getChildAttendance, getChildResults, getChildFees
- [ ] Login flow: detect parent role (check `parents` table) → redirect to `/parent-portal`
- [ ] Admin: `src/app/institutions/[id]/parents/page.tsx` — Link parent accounts to students via `parent_student_links`; one parent can be linked to multiple students

---

### Step 6B — Transport Management

**Route:** `/institutions/[id]/transport`

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

#### What to build:
- [ ] `supabase/migrations/..._transport.sql` — vehicles, bus_routes, transport_allocations
- [ ] `src/app/institutions/[id]/transport/vehicles/page.tsx` — Vehicle & driver registry (RC number, insurance/fitness expiry alerts)
- [ ] `src/app/institutions/[id]/transport/page.tsx` — Route list with vehicle + student count per route
- [ ] `src/app/institutions/[id]/transport/[routeId]/page.tsx` — Route detail: stops, timing, vehicle assigned, allocated students
- [ ] `src/actions/transport.ts` — getVehicles, getRoutes, assignStudent, getStudentRoute, getExpiryAlerts
- [ ] Student portal: `src/app/student-portal/transport/page.tsx` — My bus route, boarding stop, pickup time
- [ ] Transport fee auto-linked to `fee_structures` (bus fee type)
- [ ] Vehicle compliance alerts: flag vehicles with insurance/fitness certificates expiring within 30 days

---

### Step 6C — Certificate & Document Generator

**Route:** `/institutions/[id]/certificates`

> High-demand feature. Students request documents; admin approves + generates.

#### What to build:
- [ ] `supabase/migrations/..._certificate_requests.sql` — `certificate_requests` (student, type, status, issued_at)
- [ ] **Student certificate types:** Bonafide, Transfer Certificate, Character Certificate, NOC, Course Completion
- [ ] **Staff certificate types:** Offer Letter, Experience Certificate, Relieving Letter, Salary Certificate, Service Certificate
- [ ] `src/app/institutions/[id]/certificates/page.tsx` — Admin: pending requests + issue action
- [ ] `src/actions/certificates.ts` — requestCertificate, approveCertificate, generatePDF
- [ ] `src/components/certificates/` — Printable template components per certificate type (auto-filled with student data)
- [ ] Student portal: `src/app/student-portal/certificates/page.tsx` — Request certificate, track status, download when issued

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

## 📊 Phase 7 — Super Admin Panel (SaaS Multi-Tenancy)

> **Goal:** A bird's-eye view across ALL institutions for the Aura platform owner. This is the SaaS operator dashboard — not for college admins. Perfect for platform health monitoring.

### Step 7A — Super Admin Layout & Auth

**Route:** `/admin` (role=SUPER_ADMIN only)

#### What to build:
- [ ] Migration: add `SUPER_ADMIN` role to institution_members
- [ ] `src/app/admin/layout.tsx` — Super admin layout, separate from institution nav
- [ ] `src/middleware.ts` update — protect `/admin` route for SUPER_ADMIN only
- [ ] `src/actions/superAdmin.ts` — cross-institution data fetching

---

### Step 7B — Platform Overview Dashboard

**Route:** `/admin/page.tsx`

#### What to build:
- [ ] Platform KPI cards:
  * Total Institutions registered
  * Total Students across all institutions
  * Total Staff across all institutions
  * Total Revenue collected (all fee payments)
  * Active sessions today (live classes)
  * Monthly Recurring Revenue trend
- [ ] Institutions table: name, students count, staff count, revenue, last active
- [ ] Platform growth chart: new institutions per month (recharts AreaChart)
- [ ] Revenue chart: total fee collections per month across all institutions
- [ ] Top performing institutions by fee collection rate

---

### Step 7C — Per-Institution Drill Down

**Route:** `/admin/institutions/[id]/page.tsx`

#### What to build:
- [ ] Full institution analytics:
  * Enrollment trends (students per semester)
  * Attendance rate trends
  * Fee collection rate
  * Payroll vs revenue ratio
  * Department-wise breakdown
- [ ] Quick actions: View institution, Impersonate admin (with audit log)

---

### Step 7D — Platform Health, Audit & Security

**Route:** `/admin/health/page.tsx`

#### What to build:
- [ ] Audit log table (all admin actions with timestamp + user)
- [ ] Failed payments tracker across all institutions
- [ ] Scheduler engine health check (ping FastAPI /health endpoint)
- [ ] Database size and row counts per table
- [ ] Error rate monitoring (failed logins, failed payments)

#### ISO 27001 Security Audit Checklist (resolve during this step):
- [ ] `docs/rls-policy-map.md` — document every table, its RLS policy, and which roles can read/write/delete
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

### Step 7E — SaaS Subscription & Billing Management

**Route:** `/admin/billing`

> Manage institution subscription plans, billing cycles, and invoice generation for the Aura SaaS business. This is the revenue backbone of the platform. Without this, Aura has no monetization layer.

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

## 📱 Phase 8 — React Native Mobile Apps & CCTV Integration

> **Goal:** A native mobile app for staff and students. Primary use cases: NFC-based attendance marking, live CCTV feed access, push notifications, and a mobile-optimized portal experience.

### Step 8A — React Native Project Setup

#### What to build:
- [ ] Initialize new React Native project: `npx create-expo-app aura-mobile`
- [ ] Folder: `/aura-mobile` at monorepo root (alongside `/aura-scheduler-engine`)
- [ ] Install dependencies:
  * `@supabase/supabase-js`
  * `expo-secure-store` (for auth token storage)
  * `react-native-nfc-manager` (NFC scanning)
  * `expo-camera` (QR code fallback)
  * `expo-notifications` (push notifications)
  * `react-native-vlc-media-player` (CCTV RTSP streams)
- [ ] Supabase auth with Expo SecureStore session persistence
- [ ] Shared type definitions from `/src/types/` (symlink or copy)

---

### Step 8B — Staff Mobile App

#### Screens to build:
- [ ] `screens/auth/LoginScreen.tsx` — Email + password login
- [ ] `screens/home/StaffHomeScreen.tsx` — Dashboard with today's classes
- [ ] `screens/schedule/ScheduleScreen.tsx` — Weekly timetable
- [ ] `screens/attendance/NFCAttendanceScreen.tsx`:
  * NFC scan mode — tap student card to mark present
  * Shows active class info (subject, time, room)
  * Live counter: marked / total students
  * Manual fallback: searchable student list
  * Calls `/api/attendance/nfc` webhook
- [ ] `screens/attendance/ManualAttendanceScreen.tsx` — Checklist of students
- [ ] `screens/leave/LeaveScreen.tsx` — Apply and track leave
- [ ] `screens/salary/SalaryScreen.tsx` — View payslip

---

### Step 8C — Student Mobile App

#### Screens to build:
- [ ] `screens/home/StudentHomeScreen.tsx` — Dashboard with attendance summary
- [ ] `screens/timetable/TimetableScreen.tsx` — Department timetable
- [ ] `screens/attendance/AttendanceScreen.tsx` — Per-subject attendance rings
- [ ] `screens/fees/FeesScreen.tsx` — Dues + payment history
- [ ] `screens/fees/PayScreen.tsx` — Razorpay payment
- [ ] `screens/notifications/NotificationsScreen.tsx` — Push notification inbox

---

### Step 8D — Push Notifications

- [ ] Integrate Expo Push Notifications
- [ ] Register device token in Supabase on login
- [ ] Add `device_tokens` table to Supabase
- [ ] Server-side: send push via Expo Push API when notifications are triggered
- [ ] Update `src/lib/notifications.ts` to also send push alongside in-app

---

### Step 8E — CCTV Integration Strategy

> Browser-based RTSP is not supported. Use native approach only.

#### Strategy:
- **Primary:** `react-native-vlc-media-player` for direct RTSP stream in app
- **Fallback:** `Linking.openURL()` to open official NVR apps:
  * Hikvision: `hik-connect://`
  * CP Plus: `cpplusremotenet://`
  * CCTV integration is managed under the mobile security dashboard layout.

#### What to build:
- [ ] `screens/cctv/CCTVListScreen.tsx` — Grid of camera thumbnails
- [ ] `screens/cctv/CCTVPlayerScreen.tsx` — Full screen RTSP player
- [ ] `src/app/api/cctv/cameras/route.ts` — API to list registered cameras
- [ ] Camera registration UI in web admin (add camera name, RTSP URL, location)

---

### Step 8F — Parent Mobile App

> Parent portal exists on web (Phase 6A). A mobile companion delivers real-time push notifications — the primary reason parents will install the app. Attendance drops, fee reminders, and exam results reach parents instantly.

#### Screens to build:
- [ ] `screens/home/ParentHomeScreen.tsx` — Dashboard: child's attendance %, upcoming exams, fees due summary
- [ ] `screens/attendance/ChildAttendanceScreen.tsx` — Subject-wise attendance with ring charts
- [ ] `screens/results/ChildResultsScreen.tsx` — Marks, grades, arrear status per semester
- [ ] `screens/fees/ChildFeesScreen.tsx` — Fee ledger + Razorpay payment on behalf of child
- [ ] `screens/notifications/ParentNotificationsScreen.tsx` — Push notification inbox
- [ ] `screens/profile/LinkChildScreen.tsx` — Link parent account to child via roll number + OTP verification

#### Parent-specific push notifications:
- [ ] Attendance drops below 75% → instant push to linked parent
- [ ] Fee payment due → 7-day and 1-day advance reminder push
- [ ] Exam results published → push with grade summary
- [ ] Leave application status updates → push to parent

---

### Phase 8 Completion Checklist
- [ ] Expo app runs on both iOS and Android
- [ ] NFC attendance marking works end-to-end
- [ ] Push notifications received on device for staff, student, and parent apps
- [ ] CCTV streams play correctly inside mobile dashboard (or fallback deep-links trigger)
- [ ] Supabase auth persists across app restarts
- [ ] Parent app correctly links to child record and shows live data
- [ ] `git commit -m "feat: Phase 8 — Mobile Companion App & CCTV complete"`
- [ ] `git push origin main`

---

## 📋 Overall Progress Tracker

> **Last updated:** 2026-06-10  
> **30 of 87 modules complete — 34% of full platform built**

```
Overall  ███████████░░░░░░░░░░░░░░░░░░░░░░  34%  (30/87)
Phase 1  ████████████████████████████████  100% (7/7   — Staff & Student Portals ✅)
Phase 2    ████████████████████████████████  100% (13/13 — All foundations + Academic Ops ✅)
Phase 2.5  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/3  — Critical Security & Compliance Fixes ← NEXT)
Phase 3    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/4  — Notifications)
Phase 4    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/12 — Campus Infrastructure + Vendor POs)
Phase 5    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/14 — Admissions, HR, Payroll, Budget & Lifecycle)
Phase 6    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/8  — Extended Portals & Tools + Full LMS)
Phase 7    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/8  — Super Admin + SSR Builder + IQAC Tracker)
Phase 8    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/6  — Mobile Apps & CCTV)
Arch       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/8  — RLS, Testing, Indexes, CI/CD, Billing, Audit Log)
```

> **Next up:** Phase 2.5A — Razorpay Webhook Security Fix

---

### 🔗 Slug URL Convention (applies to all institution routes)

All `/institutions/[id]/...` routes display the institution **slug** in the browser (e.g. `/institutions/bishop-heber-college/curriculum`), not the UUID. Middleware rewrites slug → UUID before pages handle the request. See the **Institution URL Pattern** section in System Context above for full rules.

---

| Phase | Feature | Status | Commit |
|-------|---------|--------|--------|
| ✅ Core | Auth, Multi-tenant, Middleware + Slug URL rewrite | Complete | — |
| ✅ Core | Institutions & Departments CRUD | Complete | — |
| ✅ Core | Staff & Students Directory | Complete | — |
| ✅ Core | AI Timetable Scheduler (FastAPI + OR-Tools) | Complete | — |
| ✅ Core | Attendance System (NFC + Manual) | Complete | — |
| ✅ Finance | Fee Structures | Complete | — |
| ✅ Finance | Fee Payments + Razorpay | Complete | — |
| ✅ Finance | Salary Management | Complete | — |
| ✅ Finance | Expense Logger | Complete | — |
| ✅ Finance | Reports Page | Complete | — |
| ✅ Phase 1A | Staff Portal (self-service) | Complete | — |
| ✅ Phase 1A | Staff Admin Preview (`/staff-portal/view/[staffId]`) | Complete | — |
| ✅ Phase 1A | Staff Portal Credentials (login/password/block per card) | Complete | — |
| ✅ Phase 1B | Student Portal (self-service) | Complete | — |
| ✅ Phase 1B | Student Admin Preview (`/student-portal/view/[studentId]`) | Complete | — |
| ✅ Phase 1B | Student Portal Credentials (login/password/block per row) | Complete | — |
| ✅ Phase 1B | Student Portal — Razorpay Pay Page | Complete | — |
| ✅ 2-Pre-A | Subjects Master Table + Teaching Assignments | Complete | — |
| ✅ 2-Pre-B | `academic_years` FK Migration for Existing Tables | Complete | — |
| ✅ 2-Pre-C | HOD Role + Department Head Designation | Complete | — |
| ✅ 2-Pre-D | Fee Concession & Waiver Management | Complete | — |
| ✅ Phase 2A | Academic Year Calendar + `academic_years` Master Table | Complete | — |
| ✅ Phase 2B | Semester Exam Planner + Hall Tickets | Complete | — |
| ✅ Phase 2C | Marks & Arrears Management | Complete | — |
| ✅ Phase 2D | Year Promotion & Graduation Workflow | Complete | — |
| ✅ Phase 2E | CIA / Internal Assessment Ledger (NAAC) | Complete | `1df3ab8` |
| ✅ Phase 2F | Syllabus & Curriculum Management | Complete | `f938ff0` |
| ✅ Phase 2G | Teacher Lesson Plan / Daily Diary | Complete | `986bfd2` |
| ✅ Phase 2H | Guest Lecture & Expert Talk Management | Complete | `76ac333` |
| ✅ Phase 2I | Internship & Industrial Training (NAAC 1.2 / NIRF 5.2) | Complete | — |
| 🔲 Phase 2.5A | Razorpay Webhook Signature Verification 🔒 | **Next** | — |
| 🔲 Phase 2.5B | DPDP 2023 Compliance — Consent & Erasure Framework 🔐 | Pending | — |
| 🔲 Phase 2.5C | Backup Strategy + Scheduler Resilience ☁️ | Pending | — |
| 🔲 Phase 3A | Notification Infrastructure | Pending | — |
| 🔲 Phase 3B | Notification Triggers | Pending | — |
| 🔲 Phase 3C | Email + SMS + WhatsApp Notifications | Pending | — |
| 🔲 Phase 3D | Digital Notice Board & Announcements | Pending | — |
| 🔲 Phase 4A | Library Management System | Pending | — |
| 🔲 Phase 4B | Auditorium & Space Booking | Pending | — |
| 🔲 Phase 4C | Hostel Management + Mess Billing | Pending | — |
| 🔲 Phase 4D | Laboratory Management | Pending | — |
| 🔲 Phase 4E | Asset & Inventory Management | Pending | — |
| 🔲 Phase 4E-sub | Vendor & Purchase Order Management | Pending | — |
| 🔲 Phase 4F | Smart ID Card & NFC Card Registry | Pending | — |
| 🔲 Phase 4G | Gate Pass & Visitor Management | Pending | — |
| 🔲 Phase 4H | Student Clubs & Organizations (NSS/NCC/Cultural) | Pending | — |
| 🔲 Phase 4I | Health & Medical Records (Infirmary) | Pending | — |
| 🔲 Phase 4J | Sports & Physical Education | Pending | — |
| 🔲 Phase 4K | Annual Day & Large Campus Event Management | Pending | — |
| 🔲 Phase 5A | Student Admissions System (public-facing) | Pending | — |
| 🔲 Phase 5A-sub | Admissions CRM + Enquiry Management + Merit List | Pending | — |
| 🔲 Phase 5B | Staff Recruitment Module | Pending | — |
| 🔲 Phase 5C | Non-Teaching Staff & Payroll | Pending | — |
| 🔲 Phase 5C-sub | Indian Statutory Payroll (TDS / PF / ESI / Form 16) | Pending | — |
| 🔲 Phase 5D | Alumni System & Panel | Pending | — |
| 🔲 Phase 5E | Staff Appraisal & NAAC Workload Reports | Pending | — |
| 🔲 Phase 5F | Placement Cell & Career Services | Pending | — |
| 🔲 Phase 5G | Scholarship Management | Pending | — |
| 🔲 Phase 5H | Disciplinary Records & Anti-Ragging (UGC) | Pending | — |
| 🔲 Phase 5I | Research & Publications Management (NAAC Criterion 3) | Pending | — |
| 🔲 Phase 5J | Staff Daily Attendance + LOP-Payroll Integration | Pending | — |
| 🔲 Phase 5K | Staff Career Lifecycle (Increments, Transfers, Resignation) | Pending | — |
| 🔲 Phase 5L | Department Budget Management (NAAC 6.4) | Pending | — |
| 🔲 Phase 6A | Parent Portal (multi-child via junction table) | Pending | — |
| 🔲 Phase 6B | Transport Management + Vehicle Registry | Pending | — |
| 🔲 Phase 6C | Certificate & Document Generator (Student + Staff) | Pending | — |
| 🔲 Phase 6D | Online Examination System + Anti-Cheating | Pending | — |
| 🔲 Phase 6E | Student Feedback & Faculty Ratings | Pending | — |
| 🔲 Phase 6F | Grievance Redressal System (NAAC Criterion 6.2) | Pending | — |
| 🔲 Phase 6G | E-Learning & Study Materials LMS | Pending | — |
| 🔲 Phase 6H | Industry Connect & MOU Management (NAAC Criterion 7.1) | Pending | — |
| 🔲 Phase 7A | Super Admin Auth & Layout | Pending | — |
| 🔲 Phase 7B | Platform Overview Dashboard | Pending | — |
| 🔲 Phase 7C | Per-Institution Drill Down | Pending | — |
| 🔲 Phase 7D | Platform Health & Audit | Pending | — |
| 🔲 Phase 7E | SaaS Subscription & Billing Management | Pending | — |
| 🔲 Phase 7F | IQAC & Govt Compliance Reports (NAAC/NIRF/AISHE) | Pending | — |
| 🔲 Phase 7F-sub | NAAC SSR Builder + AISHE Return + NIRF Extract | Pending | — |
| 🔲 Phase 7F-sub2 | IQAC Meeting & Action Tracker (NAAC 6.1) | Pending | — |
| 🔲 Arch A1 | Fine-grained RLS Policies (HOD/STAFF/ADMIN) | Pending | — |
| 🔲 Arch A2 | Testing Strategy (Vitest + Playwright) | Pending | — |
| 🔲 Arch A3 | Database Index Strategy | Pending | — |
| 🔲 Arch A4 | Institution Onboarding Wizard | Pending | — |
| 🔲 Arch A5 | CI/CD Pipeline (GitHub Actions) | Pending | — |
| 🔲 Arch A6 | Multi-currency & Multi-timezone Support | Pending | — |
| 🔲 Arch A7 | SaaS Billing — Minimal Viable (Trial + Expiry) | Pending | — |
| 🔲 Arch A8 | Platform-Wide Audit Log — `audit_logs` table + `logAudit()` helper | Pending | — |
| 🔲 Phase 8A | React Native Setup | Pending | — |
| 🔲 Phase 8B | Staff Mobile App + NFC | Pending | — |
| 🔲 Phase 8C | Student Mobile App | Pending | — |
| 🔲 Phase 8D | Push Notifications (Staff + Student + Parent) | Pending | — |
| 🔲 Phase 8E | CCTV Integration | Pending | — |
| 🔲 Phase 8F | Parent Mobile App | Pending | — |

---

## 🛠️ Development Rules (Claude Must Always Follow)

1. **One step at a time** — complete and commit before moving to the next
2. **TypeScript strict** — run `npx tsc --noEmit` before every commit
3. **No old table names** — always use `institutions`, `staff`, `students`, `institution_members`
4. **RLS always on** — every new Supabase table must have RLS enabled
5. **Discriminated unions** — every Server Action returns `{ success: true } | { success: false, error }`
6. **revalidatePath** — call after every data mutation
7. **Glassmorphism UI** — maintain `bg-white/70 backdrop-blur-xl border-white/20` aesthetic
8. **Indian locale** — all currency formatted as INR with `en-IN` locale
9. **Git discipline** — commit message format: `feat: Phase X — Description`
10. **Never expose secrets** — `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` server-only
11. **Webhook security** — all incoming webhooks (Razorpay, NFC) must verify HMAC signatures before processing any payload
12. **Consent before PII** — any new page or action collecting personal data must check `data_consent_logs` for valid consent
13. **Audit trail** — every Server Action mutating `marks`, `cia_marks`, `fee_payments`, `salary_disbursements`, `student_promotions`, `fee_concessions`, `leave_requests`, `institution_members`, `lms_submissions`, or `department_budgets` **must** call `logAudit()` from `src/lib/auditLog.ts` — no exceptions
14. **Scheduler resilience** — all calls to the Python scheduler must go through the `callScheduler()` wrapper with timeout and fallback error handling
15. **Privacy by default** — new tables storing PII must document their data retention period in `src/lib/dataRetention.ts`
16. **No RLS bypass without justification** — `createAdminClient()` (service role) may only be used in server-only files; add a comment above each use explaining why RLS bypass is necessary
17. **Audit logs are immutable** — never add an UPDATE or DELETE RLS policy to `audit_logs`; never call `.delete()` or `.update()` on that table from any Server Action
---

## 🔐 Environment Variables Reference

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Scheduler
SCHEDULER_API_URL=http://127.0.0.1:8000

# Notifications
RESEND_API_KEY=

# SMS Gateway (MSG91 / Fast2SMS)
SMS_API_KEY=
SMS_SENDER_ID=

# WhatsApp Business API (Meta Cloud)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# NFC Webhook
AURA_NFC_WEBHOOK_SECRET=
AURA_INSTITUTION_TIMEZONE=Asia/Kolkata

# Razorpay Webhook (Phase 2.5A — REQUIRED)
RAZORPAY_WEBHOOK_SECRET=

# Database (for GitHub Actions backup workflow)
SUPABASE_DB_URL=

# Per-institution locale (future multi-region support)
# Override at institution level in institutions table:
# institutions.locale (default: 'en-IN')
# institutions.currency (default: 'INR')
# institutions.timezone (default: 'Asia/Kolkata')
```

---

## 🌐 Global Academic ERP Standards — Alignment & Gap Register

> This section tracks Aura's compliance against global academic ERP standards. Review at the start of each major phase and update the status column as modules are completed.

| Status     | Standard / Framework              | Coverage in Aura                                                              | Phase         |
|:----------:|:----------------------------------|:------------------------------------------------------------------------------|:--------------|
| ✅ Strong  | NAAC Criteria 1–7 (India)         | CIA, lesson plans, syllabus, guest lectures, internships, grievances — mapped | Ongoing       |
| ✅ Strong  | NIRF (India rankings)             | Internships (5.2), sports achievements, placement cell (5F)                   | Phase 5F      |
| ✅ Strong  | Student Information System (SIS)  | Enrollment, marks, attendance, promotion pipeline — complete                  | Done          |
| ✅ Strong  | Financial Management              | Fee structures, payments, salary, expenses, reports. TDS/Form 16 via 5C-sub  | Phase 5C-sub  |
| ✅ Strong  | Parent engagement                 | Phase 6A — parent portal with multi-child sibling support                     | Phase 6A      |
| 🔲 Planned | AISHE reporting                   | Field-level schema in Phase 7F; `students.category` + `is_pwd` migration      | Phase 7F      |
| 🔲 Planned | Learning Management (LMS)         | Phase 6G expanded — SCORM, assignment submissions, gradebook                  | Phase 6G      |
| 🔲 Planned | HR / Payroll (Indian statutory)   | 5C-sub: TDS computation, PF/ESI deductions, Form 16 generator                 | Phase 5C-sub  |
| 🔲 Planned | DPDP Act 2023 (India privacy)     | Phase 2.5B — consent logs, erasure requests, privacy policy page              | Phase 2.5B    |
| 🔲 Planned | ISO 27001 (Data security)         | Phase 7D — CSP headers, RLS policy map, data retention doc, pen test plan     | Phase 7D      |
| 🔲 Planned | Audit trail / data integrity      | Arch A8 — central `audit_logs` table + `logAudit()` helper, append-only      | Arch A8       |
| 🔲 Planned | Accreditation export formats      | Phase 7F-sub — central NAAC SSR Builder + AISHE return + NIRF extract         | Phase 7F-sub  |
| 🔲 Planned | Alumni management                 | Phase 5D — alumni portal auto-populated from year promotion workflow           | Phase 5D      |
| 🔲 Planned | Admissions / CRM funnel           | 5A-sub — enquiry management, merit list, offer letter generator               | Phase 5A-sub  |
| 🔲 Planned | Budget & financial planning       | Step 5L — department budgets, line items, actuals vs planned, NAAC 6.4 export | Phase 5L      |
| 🔲 Planned | IQAC management                   | Phase 7F — IQAC Meeting & Action Tracker, agendas, minutes, action items      | Phase 7F      |
| 🔲 Planned | Vendor & procurement              | 4E-sub — vendor registry, purchase orders, PO approval workflow               | Phase 4E-sub  |
| 🔲 Planned | Central NAAC SSR builder          | 7F-sub — criterion-wise aggregation + Excel export in NAAC format             | Phase 7F-sub  |

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

## 🏃 How to Run Full Stack Locally

```bash
# Terminal 1 — Next.js Frontend
npm run dev

# Terminal 2 — Python Scheduler Engine
cd aura-scheduler-engine
.\venv\Scripts\activate      # Windows
source venv/bin/activate     # Mac/Linux
uvicorn main:app --reload

# Terminal 3 — Mobile App (Phase 8 — directory created in Step 8A)
# Note: Run 'npx create-expo-app aura-mobile' in Step 8A first
cd aura-mobile
npx expo start
```

---

*Last updated: 2026-06-10 — ERP Standards gap audit completed. Added Phase 2.5 (Razorpay webhook security, DPDP 2023 privacy, backup & scheduler resilience). Added Global ERP Standards register + Architecture & Quality register (8 items). Added 5A-sub (Admissions CRM), 5C-sub (Statutory Payroll — TDS/PF/ESI/Form 16), 4E-sub (Vendor & Purchase Orders), 7F-sub (NAAC SSR Builder + AISHE + NIRF). Closed all ERP gaps: Step 5L (Department Budget Management — NAAC 6.4), Phase 6G expanded to full LMS (SCORM + assignments + gradebook), Phase 7D expanded with ISO 27001 security audit checklist, Phase 7F expanded with AISHE field-level schema + IQAC Meeting & Action Tracker (NAAC 6.1). Added Arch A8 — Platform-Wide Audit Log (`audit_logs` table, `logAudit()` helper, append-only, NAAC/UGC/ISO 27001 compliant — resolves audit trail gap). Extended Dev Rules 10 → 17. Total: **87 tracked modules** across Foundation Migrations + 9 phases + Architecture track. Every NAAC criterion mapped. Next: Phase 2.5A — Razorpay Webhook Security Fix.*
