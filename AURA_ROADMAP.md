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

### Step 1B — Student Portal ✅ (Razorpay pay page pending)

**Route:** `/student-portal` (auth-gated, role=STUDENT only)

#### What to build:
- [x] `src/app/student-portal/layout.tsx` — Portal layout with student nav
- [x] `src/app/student-portal/page.tsx` — Student dashboard home
- [x] `src/app/student-portal/timetable/page.tsx` — Department timetable view
- [x] `src/app/student-portal/attendance/page.tsx` — Personal attendance % per subject
- [x] `src/app/student-portal/fees/page.tsx` — Fee dues + payment history
- [ ] `src/app/student-portal/fees/pay/page.tsx` — Online payment via Razorpay *(pending)*
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

## 🔔 Phase 2 — Notifications System

> **Goal:** Connect all modules with intelligent alerts so nothing falls through
> the cracks. Staff get notified about leave approvals. Students get fee reminders.
> Admins get attendance alerts.

### Step 2A — Notification Infrastructure

#### Database (run migration):
```sql
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

### Step 2B — Notification Triggers

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

### Step 2C — Email Notifications (Optional but Recommended)

- [ ] Integrate Resend (resend.com) for transactional emails
- [ ] Email template: Fee Due Reminder
- [ ] Email template: Payment Receipt
- [ ] Email template: Leave Approved/Rejected
- [ ] Email template: Salary Slip
- [ ] `src/lib/email.ts` — sendEmail() wrapper around Resend API
- [ ] Add `RESEND_API_KEY` to .env.local

---

### Phase 2 Completion Checklist
- [ ] Notifications table created and RLS locked down
- [ ] Bell icon shows live unread count in all nav bars
- [ ] All 7 trigger events fire correctly
- [ ] Email sending works for at least fee and payment events
- [ ] `npx tsc --noEmit` passes
- [ ] `git commit -m "feat: Phase 2 — Notifications System complete"`
- [ ] `git push origin main`

---

## 📊 Phase 3 — Super Admin Analytics Dashboard

> **Goal:** A bird's-eye view across ALL institutions for the Aura platform owner.
> This is the SaaS operator dashboard — not for college admins.
> Perfect for investor demos and platform health monitoring.

### Step 3A — Super Admin Layout & Auth

**Route:** `/admin` (role=SUPER_ADMIN only)

#### What to build:
- [ ] Migration: add `SUPER_ADMIN` role to institution_members
- [ ] `src/app/admin/layout.tsx` — Super admin layout, separate from institution nav
- [ ] `src/middleware.ts` update — protect `/admin` route for SUPER_ADMIN only
- [ ] `src/actions/superAdmin.ts` — cross-institution data fetching

---

### Step 3B — Platform Overview Dashboard

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

### Step 3C — Per-Institution Drill Down

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

### Step 3D — Platform Health & Audit

**Route:** `/admin/health/page.tsx`

#### What to build:
- [ ] Audit log table (all admin actions with timestamp + user)
- [ ] Failed payments tracker across all institutions
- [ ] Scheduler engine health check (ping FastAPI /health endpoint)
- [ ] Database size and row counts per table
- [ ] Error rate monitoring (failed logins, failed payments)

---

### Phase 3 Completion Checklist
- [ ] Super admin route fully protected
- [ ] No cross-institution data leaks to regular admins
- [ ] All charts rendering with real data
- [ ] Audit log capturing key actions
- [ ] `npx tsc --noEmit` passes
- [ ] `git commit -m "feat: Phase 3 — Super Admin Analytics Dashboard complete"`
- [ ] `git push origin main`

---

## 📱 Phase 4 — React Native Mobile App

> **Goal:** A native mobile app for staff and students. Primary use cases:
> NFC-based attendance marking, live CCTV feed access, push notifications,
> and a mobile-optimized portal experience.

### Step 4A — React Native Project Setup

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

### Step 4B — Staff Mobile App

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
- [ ] `screens/cctv/CCTVScreen.tsx`:
  * List of registered CCTV cameras
  * Live RTSP stream via react-native-vlc-media-player
  * Fallback: deep-link to Hikvision/CP Plus NVR app via `Linking.openURL()`

---

### Step 4C — Student Mobile App

#### Screens to build:
- [ ] `screens/home/StudentHomeScreen.tsx` — Dashboard with attendance summary
- [ ] `screens/timetable/TimetableScreen.tsx` — Department timetable
- [ ] `screens/attendance/AttendanceScreen.tsx` — Per-subject attendance rings
- [ ] `screens/fees/FeesScreen.tsx` — Dues + payment history
- [ ] `screens/fees/PayScreen.tsx` — Razorpay payment
- [ ] `screens/notifications/NotificationsScreen.tsx` — Push notification inbox

---

### Step 4D — Push Notifications

- [ ] Integrate Expo Push Notifications
- [ ] Register device token in Supabase on login
- [ ] Add `device_tokens` table to Supabase
- [ ] Server-side: send push via Expo Push API when notifications are triggered
- [ ] Update `src/lib/notifications.ts` to also send push alongside in-app

---

### Step 4E — CCTV Integration Strategy

> Browser-based RTSP is not supported. Use native approach only.

#### Strategy:
- **Primary:** `react-native-vlc-media-player` for direct RTSP stream in app
- **Fallback:** `Linking.openURL()` to open official NVR apps:
  * Hikvision: `hik-connect://`
  * CP Plus: `cpplusremotenet://`
- **Future:** RTSP → HLS transcoding via FFmpeg server (Phase 5 consideration)

#### What to build:
- [ ] `screens/cctv/CCTVListScreen.tsx` — Grid of camera thumbnails
- [ ] `screens/cctv/CCTVPlayerScreen.tsx` — Full screen RTSP player
- [ ] `src/app/api/cctv/cameras/route.ts` — API to list registered cameras
- [ ] Camera registration UI in web admin (add camera name, RTSP URL, location)

---

### Phase 4 Completion Checklist
- [ ] Expo app runs on both iOS and Android
- [ ] NFC attendance marking works end-to-end
- [ ] Push notifications received on device
- [ ] CCTV stream plays (or fallback deep-link works)
- [ ] Supabase auth persists across app restarts
- [ ] `git commit -m "feat: Phase 4 — React Native Mobile App complete"`
- [ ] `git push origin main`

---

## 🎓 Phase 5 — Academic Operations

> **Goal:** Complete the formal academic lifecycle — calendar, exams, results, arrears,
> and year promotion. Every other phase depends on this data existing.
> Build in order: calendar first, then exams, then marks, then promotion.

### Step 5A — Academic Year Calendar

**Route:** `/institutions/[id]/calendar`

> The master calendar for an institution. Every other module (exams, leave, events)
> references this. Build it first.

#### Database:
```sql
CREATE TABLE academic_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN (
                    'semester_start','semester_end','exam_window','holiday',
                    'annual_day','sports_day','expo','cultural','other')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  description     TEXT,
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### What to build:
- [ ] `supabase/migrations/..._academic_events.sql`
- [ ] `src/app/institutions/[id]/calendar/page.tsx` — Admin calendar manager (monthly/yearly view, add/edit events)
- [ ] `src/actions/academicCalendar.ts` — getCalendarEvents, createEvent, updateEvent, deleteEvent
- [ ] `src/components/calendar/AcademicCalendar.tsx` — Recharts-based monthly calendar grid with event badges
- [ ] `src/components/calendar/EventDrawer.tsx` — Add/edit event slide-out panel
- [ ] Student portal: `src/app/student-portal/calendar/page.tsx` — Read-only calendar view
- [ ] Staff portal: `src/app/staff-portal/calendar/page.tsx` — Read-only calendar view

#### Key features:
- Colour-coded event types (exams = rose, holidays = emerald, events = violet, etc.)
- Month/year navigation
- Public events visible to staff and student portals
- Admin can mark holidays which auto-block leave requests on those dates

---

### Step 5B — Semester Exam Planner

**Route:** `/institutions/[id]/exams`

> Exam scheduling builds on the academic calendar. An exam is a special schedule
> slot with a hall, duration, and seating assignment.

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
- [ ] `supabase/migrations/..._exam_schedules.sql`
- [ ] `src/app/institutions/[id]/exams/page.tsx` — Exam schedule list + add/edit
- [ ] `src/app/institutions/[id]/exams/[examId]/hall-ticket/page.tsx` — Printable hall ticket generator
- [ ] `src/actions/examSchedules.ts` — CRUD + getExamsByDepartment
- [ ] `src/components/exams/ExamScheduleTable.tsx` — Filterable by department, type, semester
- [ ] `src/components/exams/HallTicketCard.tsx` — Printable hall ticket with student photo placeholder
- [ ] Student portal: `src/app/student-portal/exams/page.tsx` — Upcoming exams + download hall ticket

#### Key features:
- Exam schedule auto-syncs to academic calendar as `exam_window` events
- Filter by department, semester, exam type
- Hall ticket: student roll no, name, subject list, dates, seating

---

### Step 5C — Marks & Arrears Management

**Route:** `/institutions/[id]/results`

> The most data-heavy academic module. Results feed directly into year promotion
> and alumni eligibility. Build this before year promotion (#5D).

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
- [ ] `supabase/migrations/..._exam_results.sql`
- [ ] `src/app/institutions/[id]/results/page.tsx` — Results entry dashboard (filter by dept/semester/exam)
- [ ] `src/app/institutions/[id]/results/[studentId]/page.tsx` — Full marksheet per student
- [ ] `src/app/institutions/[id]/results/arrears/page.tsx` — Arrear students list + re-exam management
- [ ] `src/actions/examResults.ts` — bulkEnterResults, getStudentMarksheet, getArrearStudents, calculateGPA
- [ ] `src/components/results/MarksheetCard.tsx` — Printable marksheet with grades, CGPA, arrear flags
- [ ] `src/components/results/BulkMarksEntry.tsx` — Spreadsheet-style bulk entry by subject
- [ ] Student portal: `src/app/student-portal/results/page.tsx` — Personal marksheet + arrear subjects
- [ ] Admin preview: `src/app/student-portal/view/[studentId]/results/page.tsx`

#### Key features:
- Grade auto-calculation (O/A+/A/B+/B/C/F based on marks)
- CGPA running total per student
- Arrear flag auto-set when marks < pass_marks
- Bulk entry mode: paste from Excel/CSV
- Marksheet printable as PDF

---

### Step 5D — Year Promotion & Graduation

**Route:** `/institutions/[id]/promotion`

> Depends on Steps 5B and 5C being complete. This closes the academic year
> and transitions students to the next stage.

#### What to build:
- [ ] `src/app/institutions/[id]/promotion/page.tsx` — Promotion dashboard with preview before commit
- [ ] `src/actions/yearPromotion.ts` — previewPromotion, runPromotion, rollbackPromotion
- [ ] `src/components/promotion/PromotionPreviewTable.tsx` — Shows: student, current year, action (promote/hold/graduate), arrear count
- [ ] Logic rules:
  * Arrear students: hold in current year, flag arrear subjects
  * Eligible students: increment `student_year` by 1
  * Graduates (UG year 3 → complete / PG year 2 → complete, no arrears): move to `alumni` table
- [ ] Audit log: who ran promotion, when, how many affected
- [ ] Rollback: undo promotion within 24h window

#### Key features:
- Admin reviews preview list before committing — no silent bulk changes
- Separate tabs: Promote / Hold (arrears) / Graduate
- One-click run with confirmation modal
- Email notification to students (hooks into Phase 2 notifications)

### Phase 5 Completion Checklist
- [ ] All four sub-steps built and tested
- [ ] Academic calendar visible in all three portals (admin, staff, student)
- [ ] Marks entry → arrear detection → year promotion pipeline working end-to-end
- [ ] Marksheet printable as PDF
- [ ] `git commit -m "feat: Phase 5 — Academic Operations complete"`
- [ ] `git push origin main`

---

## 🏫 Phase 6 — Admissions & Alumni

> **Goal:** Manage the full student lifecycle from first application through graduation
> and beyond. The admissions system is a new public-facing surface; alumni is the
> natural exit point from year promotion.

### Step 6A — Student Admissions System

**Routes:** `/admissions/[institution-slug]` (public) · `/institutions/[id]/admissions` (admin)

> A separate panel from the main admin. Prospective students apply online;
> admins shortlist, interview, and enroll — converting applications to student records
> in one click.

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

### Step 6B — Alumni System & Panel

**Routes:** `/alumni-portal` (alumni self-service) · `/institutions/[id]/alumni` (admin)

> Graduates from year promotion (Step 5D) land here automatically.
> Alumni can update their profile; admins can broadcast to batches.

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
- Auto-populated from year promotion (Step 5D)
- Alumni can update professional info from their portal
- Admin can filter + export alumni list (batch-wise CSV)
- Batch-targeted announcements (e.g., "2022 UG CS batch reunion")
- Alumni directory browsable within same institution

### Phase 6 Completion Checklist
- [ ] Admissions public form live and accepting applications
- [ ] Enroll action correctly creates student record + auth account
- [ ] Alumni auto-populated from year promotion workflow
- [ ] Alumni portal accessible with `aura-role=alumni` cookie
- [ ] `git commit -m "feat: Phase 6 — Admissions & Alumni complete"`
- [ ] `git push origin main`

---

## 🏛️ Phase 7 — Campus Infrastructure

> **Goal:** Digitise the physical campus operations that run parallel to academics —
> library, spaces, and hostels. Each is a self-contained module with its own
> admin panel, and student/staff-facing views in the respective portals.

### Step 7A — Library Management System

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
  borrower_id     UUID NOT NULL REFERENCES profiles(id),  -- staff or student
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

### Step 7B — Auditorium & Space Booking

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

### Step 7C — Hostel Management

**Route:** `/institutions/[id]/hostels`

> Most complex module in Phase 7. Plan the DB schema carefully before building.
> Multiple hostels, multiple floors, multiple rooms per floor.

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
```

#### What to build:
- [ ] `supabase/migrations/..._hostels.sql`
- [ ] `src/app/institutions/[id]/hostels/page.tsx` — Hostel overview: list of hostels, occupancy stats
- [ ] `src/app/institutions/[id]/hostels/[hostelId]/page.tsx` — Floor plan view, room occupancy grid
- [ ] `src/app/institutions/[id]/hostels/[hostelId]/allocations/page.tsx` — Allocate/transfer/vacate students
- [ ] `src/app/institutions/[id]/hostels/[hostelId]/announcements/page.tsx` — Hostel-specific announcements
- [ ] `src/app/institutions/[id]/hostels/cafeteria/page.tsx` — Cafeteria meal plan management + menu board
- [ ] `src/actions/hostels.ts` — getHostels, getRooms, allocateStudent, vacateStudent, getOccupancyStats
- [ ] `src/components/hostels/RoomGrid.tsx` — Visual floor-wise room grid with colour: empty/partial/full
- [ ] `src/components/hostels/AllocationDrawer.tsx` — Search student → assign to room
- [ ] Student portal: `src/app/student-portal/hostel/page.tsx` — Room number, hostel name, roommates, announcements, cafeteria menu
- [ ] Hostel fee auto-linked to existing `fee_structures` (hostel fee type already exists)

#### Key features:
- Floor-wise room grid with colour-coded occupancy
- Conflict check: student cannot be in two rooms simultaneously
- Warden can post announcements visible in student portal
- Cafeteria: weekly menu board editable by admin
- Hostel fees auto-appear in student fee ledger

### Phase 7 Completion Checklist
- [ ] Library: book catalog, lending, overdue fine calculation all working
- [ ] Auditorium: venue booking with conflict detection and approval flow
- [ ] Hostel: room allocation, occupancy grid, student portal hostel view
- [ ] All three modules visible in student portal sidebar
- [ ] `git commit -m "feat: Phase 7 — Campus Infrastructure complete"`
- [ ] `git push origin main`

---

## 🚀 Phase 8 — Extended Platform Features

> **Goal:** Elevate AURA from an institution management tool to a full-featured
> campus operating system. These six features were identified beyond the original
> scope but each adds meaningful value for institutions and increases platform stickiness.

### Step 8A — Transport Management

**Route:** `/institutions/[id]/transport`

#### What to build:
- [ ] `supabase/migrations/..._transport.sql` — `bus_routes` (name, stops JSON, timing), `transport_allocations` (student → route)
- [ ] `src/app/institutions/[id]/transport/page.tsx` — Route list with student count per route
- [ ] `src/app/institutions/[id]/transport/[routeId]/page.tsx` — Route detail: stops, timing, allocated students
- [ ] `src/actions/transport.ts` — getRoutes, assignStudent, getStudentRoute
- [ ] Student portal: `src/app/student-portal/transport/page.tsx` — My bus route, stops, pickup time
- [ ] Transport fee auto-linked to `fee_structures` (bus fee type)

---

### Step 8B — Certificate & Document Generator

**Route:** `/institutions/[id]/certificates`

> High-demand feature. Students request documents; admin approves + generates.

#### What to build:
- [ ] `supabase/migrations/..._certificate_requests.sql` — `certificate_requests` (student, type, status, issued_at)
- [ ] Certificate types: Bonafide, Transfer Certificate, Character Certificate, NOC, Course Completion
- [ ] `src/app/institutions/[id]/certificates/page.tsx` — Admin: pending requests + issue action
- [ ] `src/actions/certificates.ts` — requestCertificate, approveCertificate, generatePDF
- [ ] `src/components/certificates/` — Printable template components per certificate type (auto-filled with student data)
- [ ] Student portal: `src/app/student-portal/certificates/page.tsx` — Request certificate, track status, download when issued

---

### Step 8C — Parent Portal

**Route:** `/parent-portal`

> Read-only view of a child's academic activity. Parents can also pay fees.
> Linked to existing student records by parent email.

#### What to build:
- [ ] `supabase/migrations/..._parents.sql` — `parents` table (name, email, phone, student_id)
- [ ] `src/app/parent-portal/layout.tsx` — Parent portal shell (amber/orange theme)
- [ ] `src/app/parent-portal/page.tsx` — Dashboard: child's attendance %, upcoming exams, fees due
- [ ] `src/app/parent-portal/attendance/page.tsx` — Child's subject-wise attendance
- [ ] `src/app/parent-portal/results/page.tsx` — Child's marks and arrear status
- [ ] `src/app/parent-portal/fees/page.tsx` — Fees ledger + Razorpay payment on behalf
- [ ] `src/actions/parentPortal.ts` — getLinkedStudent, getChildAttendance, getChildResults, getChildFees
- [ ] Login flow: detect parent role (check `parents` table) → redirect to `/parent-portal`
- [ ] Admin: `src/app/institutions/[id]/parents/page.tsx` — Link parent accounts to students

---

### Step 8D — Online Examination System

**Route:** `/institutions/[id]/online-exams`

> Internal assessments and unit tests conducted digitally. Auto-graded MCQ.
> Results feed directly into the marks module (Step 5C).

#### What to build:
- [ ] `supabase/migrations/..._online_exams.sql` — `question_banks`, `online_exam_sessions`, `exam_submissions`
- [ ] `src/app/institutions/[id]/online-exams/page.tsx` — Exam session manager
- [ ] `src/app/institutions/[id]/online-exams/[examId]/questions/page.tsx` — Question bank editor (MCQ + short answer)
- [ ] `src/actions/onlineExams.ts` — createExam, startSession, submitAnswers, autoGrade
- [ ] `src/components/online-exams/ExamPlayer.tsx` — Timed exam interface (countdown, question navigation, auto-submit on timeout)
- [ ] Student portal: `src/app/student-portal/exams/online/page.tsx` — Upcoming exams, take exam, view results
- [ ] Results auto-pushed to `exam_results` table (Step 5C integration)

---

### Step 8E — Student Feedback & Faculty Ratings

**Route:** `/institutions/[id]/feedback`

> Anonymous end-of-semester feedback forms. Staff see their own aggregated ratings.
> Admins see full reports. Helps institutions improve teaching quality.

#### What to build:
- [ ] `supabase/migrations/..._feedback.sql` — `feedback_forms`, `feedback_responses` (anonymous, no student_id stored)
- [ ] `src/app/institutions/[id]/feedback/page.tsx` — Admin: create feedback forms, view aggregate reports
- [ ] `src/app/institutions/[id]/feedback/[formId]/report/page.tsx` — Analytics: average ratings, word cloud, response rate
- [ ] `src/actions/feedback.ts` — createFeedbackForm, submitFeedback, getFeedbackReport
- [ ] `src/components/feedback/FeedbackForm.tsx` — Star ratings + open-text questions
- [ ] Student portal: `src/app/student-portal/feedback/page.tsx` — Active feedback forms to fill
- [ ] Staff portal: `src/app/staff-portal/feedback/page.tsx` — View own anonymised ratings + feedback comments

---

### Step 8F — Staff Recruitment Module

**Route:** `/institutions/[id]/recruitment`

> Manage the hiring pipeline for new faculty and staff.
> From job posting to offer letter.

#### What to build:
- [ ] `supabase/migrations/..._recruitment.sql` — `job_postings`, `job_applications` (applicant details, CV URL, status)
- [ ] `src/app/institutions/[id]/recruitment/page.tsx` — Active job postings + pipeline overview
- [ ] `src/app/institutions/[id]/recruitment/[jobId]/page.tsx` — Applications list with status kanban
- [ ] `src/app/institutions/[id]/recruitment/[jobId]/[applicationId]/page.tsx` — Application detail + interview scheduling
- [ ] `src/actions/recruitment.ts` — createJobPosting, updateApplicationStatus, scheduleInterview
- [ ] `src/components/recruitment/JobPostingCard.tsx` — Role, dept, type (full-time/contract), deadline
- [ ] `src/components/recruitment/ApplicationPipeline.tsx` — Kanban: Applied → Screened → Interview → Offer → Joined/Rejected
- [ ] Hired applicant → one-click convert to Staff record (mirrors admissions enroll flow)

### Phase 8 Completion Checklist
- [ ] All six modules built and integrated with existing staff/student portals
- [ ] Transport + hostel fees auto-linked to fee ledger
- [ ] Parent portal login working (new `aura-role=parent` cookie)
- [ ] Online exam results feeding into marks module
- [ ] `git commit -m "feat: Phase 8 — Extended Platform Features complete"`
- [ ] `git push origin main`

---

## 📋 Overall Progress Tracker

| Phase | Feature | Status |
|-------|---------|--------|
| ✅ Core | Auth, Multi-tenant, Middleware | Complete |
| ✅ Core | Institutions & Departments CRUD | Complete |
| ✅ Core | Staff & Students Directory | Complete |
| ✅ Core | AI Timetable Scheduler | Complete |
| ✅ Core | Attendance System (NFC + Manual) | Complete |
| ✅ Finance | Fee Structures | Complete |
| ✅ Finance | Fee Payments + Razorpay | Complete |
| ✅ Finance | Salary Management | Complete |
| ✅ Finance | Expense Logger | Complete |
| ✅ Finance | Reports Page | Complete |
| ✅ Phase 1A | Staff Portal (self-service) | Complete |
| ✅ Phase 1A | Staff Admin Preview (`/staff-portal/view/[staffId]`) | Complete |
| ✅ Phase 1A | Staff Portal Credentials (login/password/block per card) | Complete |
| ✅ Phase 1B | Student Portal (self-service) | Complete |
| ✅ Phase 1B | Student Admin Preview (`/student-portal/view/[studentId]`) | Complete |
| ✅ Phase 1B | Student Portal Credentials (login/password/block per row) | Complete |
| ✅ Phase 1B | Student Portal — Razorpay Pay Page | Complete |
| 🔲 Phase 2A | Notification Infrastructure | Pending |
| 🔲 Phase 2B | Notification Triggers | Pending |
| 🔲 Phase 2C | Email Notifications (Resend) | Pending |
| 🔲 Phase 3A | Super Admin Auth & Layout | Pending |
| 🔲 Phase 3B | Platform Overview Dashboard | Pending |
| 🔲 Phase 3C | Per-Institution Drill Down | Pending |
| 🔲 Phase 3D | Platform Health & Audit | Pending |
| 🔲 Phase 4A | React Native Setup | Pending |
| 🔲 Phase 4B | Staff Mobile App + NFC | Pending |
| 🔲 Phase 4C | Student Mobile App | Pending |
| 🔲 Phase 4D | Push Notifications | Pending |
| 🔲 Phase 4E | CCTV Integration | Pending |
| 🔲 Phase 5A | Academic Year Calendar | Pending |
| 🔲 Phase 5B | Semester Exam Planner + Hall Tickets | Pending |
| 🔲 Phase 5C | Marks & Arrears Management | Pending |
| 🔲 Phase 5D | Year Promotion & Graduation Workflow | Pending |
| 🔲 Phase 6A | Student Admissions System (public-facing) | Pending |
| 🔲 Phase 6B | Alumni System & Panel | Pending |
| 🔲 Phase 7A | Library Management System | Pending |
| 🔲 Phase 7B | Auditorium & Space Booking | Pending |
| 🔲 Phase 7C | Hostel Management | Pending |
| 🔲 Phase 8A | Transport Management | Pending |
| 🔲 Phase 8B | Certificate & Document Generator | Pending |
| 🔲 Phase 8C | Parent Portal | Pending |
| 🔲 Phase 8D | Online Examination System | Pending |
| 🔲 Phase 8E | Student Feedback & Faculty Ratings | Pending |
| 🔲 Phase 8F | Staff Recruitment Module | Pending |

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

# NFC Webhook
AURA_NFC_WEBHOOK_SECRET=
AURA_INSTITUTION_TIMEZONE=Asia/Kolkata
```

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

# Terminal 3 — Mobile App (Phase 4)
cd aura-mobile
npx expo start
```

---

*Last updated: 2026-06-08 — Phase 1 complete (Staff & Student Portals including online payment). Next: Phase 2.*
