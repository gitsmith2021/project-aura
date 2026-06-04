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

### Step 1A — Staff Portal

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

#### Key features:
- Show only data belonging to the logged-in staff member
- Weekly timetable grid (Mon–Sat, period-wise)
- Attendance summary: classes taken, total students, avg attendance %
- Leave application with reason, date range, type (sick/casual/earned)
- Salary slip: gross, deductions, net — downloadable as PDF via print
- Read-only — staff cannot edit institutional data

#### Middleware rule:
- If logged-in user role !== 'STAFF' → redirect to `/institutions`

---

### Step 1B — Student Portal

**Route:** `/student-portal` (auth-gated, role=STUDENT only)

#### What to build:
- [ ] `src/app/student-portal/layout.tsx` — Portal layout with student nav
- [ ] `src/app/student-portal/page.tsx` — Student dashboard home
- [ ] `src/app/student-portal/timetable/page.tsx` — Department timetable view
- [ ] `src/app/student-portal/attendance/page.tsx` — Personal attendance % per subject
- [ ] `src/app/student-portal/fees/page.tsx` — Fee dues + payment history
- [ ] `src/app/student-portal/fees/pay/page.tsx` — Online payment via Razorpay
- [ ] `src/components/student-portal/AttendanceRing.tsx` — Circular % per subject
- [ ] `src/components/student-portal/FeeCard.tsx` — Due amount card with Pay button
- [ ] `src/components/student-portal/TimetableGrid.tsx` — Read-only weekly timetable
- [ ] `src/actions/studentPortal.ts` — Server actions for all student portal data

#### Key features:
- Show only data for the logged-in student's department and year
- Attendance ring chart per subject (present/total classes)
- Warning banner if attendance < 75% in any subject
- Fee ledger: all dues, paid amounts, balance, receipt download
- Razorpay online payment directly from portal
- Timetable: department schedule for current semester (read-only)
- Profile view: roll number, program, year, department

#### Middleware rule:
- If logged-in user role !== 'STUDENT' → redirect to `/institutions`

---

### Phase 1 Completion Checklist
- [ ] Both portals fully built and tested
- [ ] Middleware correctly redirects based on role
- [ ] No admin data leaks to portal users (RLS verified)
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `git commit -m "feat: Phase 1 — Staff & Student Portals complete"`
- [ ] `git push origin main`

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
| 🔲 Phase 1A | Staff Portal | Pending |
| 🔲 Phase 1B | Student Portal | Pending |
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

*Last updated: Aura 1.0 — Finance Module complete. Starting Phase 1.*
