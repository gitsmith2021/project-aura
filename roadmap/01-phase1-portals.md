[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** Core auth, institutions, staff & student tables (pre-roadmap foundation).
> **Feeds into:** [02 — Foundation Migrations](02-foundation-migrations.md) (subjects/teaching assignments surface in Staff Portal schedules), [05 — Phase 3 Notifications](05-phase3-notifications.md) (leave approvals trigger alerts), [10 — Phase 8 Mobile Apps](10-phase8-mobile-apps.md) (Staff/Student Portal APIs reused by mobile apps).

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

