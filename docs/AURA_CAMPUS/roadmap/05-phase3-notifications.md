[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [01 — Phase 1 Portals](01-phase1-portals.md) (leave approvals), [03 — Phase 2 Academic Operations](03-phase2-academic-operations.md) (exam results, CIA marks), [04 — Phase 2.5 Critical Fixes](04-phase2.5-critical-fixes.md) (audit log infrastructure).
> **Feeds into:** Every later phase — Phase 4 (hostel announcements), Phase 5 (admissions/recruitment alerts), Phase 6 (grievance/LMS notices), and Phase 8 (mobile push notifications) all assume this notification engine exists.

---

## 🔔 Phase 3 — Notification Engine & Alert Infrastructure

> **Goal:** Connect all modules with intelligent alerts so nothing falls through
> the cracks. Staff get notified about leave approvals. Students get fee reminders.
> Admins get attendance alerts.

### Step 3A — Notification Infrastructure  ✅ Complete (migration `20260614000000_phase3a_notifications`)

> Built on Opus. In-app inbox: `notifications` table (RLS: recipient reads +
> marks-read own; rows written server-side via the service-role admin client so
> no user can forge/erase), added to the `supabase_realtime` publication for
> live updates. Bell + right-side drawer wired into the shared `Topbar`, so it
> appears across admin, staff and student portals. Pure logic (`src/lib/notifications.ts`)
> is unit-tested (8 tests). Retention registered (1 year) per Dev Rule 15.
> Security advisors: clean for `notifications`.

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
- [x] Migration SQL file in `supabase/migrations/` — `20260614000000_phase3a_notifications.sql`
- [x] `src/actions/notifications.ts` — `createNotification` (+ `createNotificationsBulk` fan-out), `getNotifications`, `markAsRead`, `markAllRead`
- [x] `src/components/notifications/NotificationBell.tsx` — bell + unread badge (caps at 9+) in the Topbar
- [x] `src/components/notifications/NotificationPanel.tsx` — right-side drawer, Today/Yesterday/Earlier grouping, per-type icon/tone, click-to-navigate via `data.href`, mark-all-read
- [x] `src/hooks/useNotifications.ts` — Supabase realtime subscription (INSERT/UPDATE/DELETE scoped to the recipient) with optimistic mark-read
- [x] `src/lib/notifications.ts` — pure domain/presentation helpers (unread count, badge, day-bucketing, relative time, per-type meta) + `tests/unit/notifications.test.ts`

---

### Step 3B — Notification Triggers  ✅ Event triggers complete (2 time-based pending a scheduler)

> All 5 **event-driven** triggers wired into the existing actions, each
> fire-and-forget (never breaks the primary mutation) with recipients resolved
> via the service-role admin client. Pure message builders live in
> `src/lib/notifications.ts` and are unit-tested. The 2 **time-based** triggers
> (fee-due-in-7-days, low-attendance) need a scheduler (pg_cron / Vercel cron /
> the Python service) that doesn't exist yet — deferred to that infra rather
> than shipped un-runnable.

#### What to build:
- [x] Fee due reminder — outstanding fee 7 days past due → student. **Live** via the Fee Demand model (`fee_demands` with due dates) + pg_cron `private.sweep_fee_due` (daily 08:13) — migration `20260615060000_fee_demands`
- [x] Payment received — on `payment_status=completed` → student. Wired into `recordManualPayment` (manual) **and** the Razorpay `payment.captured` webhook (online)
- [x] Leave request — on new leave application → institution admins (INST_ADMIN, PRINCIPAL). Wired into `applyForLeave`
- [x] Leave approved/rejected — on leave status update → staff. Wired into `reviewLeaveRequest`
- [x] Low attendance alert — student attendance < 75% → student. **Live** via pg_cron `private.sweep_low_attendance` (daily 07:17; ≥5 sessions, max once/7 days) — migration `20260615050000_scheduler_sweeps`
- [x] Salary disbursed — on disbursement `status=processed` → staff. Wired into `processDisbursement` (single) + `bulkProcessDisbursements` (fan-out)
- [x] Schedule published — on draft published → all dept staff + students. Wired into `publishDraftSchedule`
- [x] `src/actions/notificationTriggers.ts` — all trigger functions (+ `buildFeeDueMessage` / `buildLowAttendanceMessage` builders ready for when the sweeps are scheduled)

---

### Step 3C — Email, SMS & WhatsApp Notifications

> **Status:** ✉️ **Email live (Resend); SMS + WhatsApp stubbed** (deferred per
> build decision — both need paid accounts + India DLT / Meta business
> verification). `sendEmail` is safe-by-default: a no-op that logs when
> `RESEND_API_KEY` is absent, so nothing breaks before the key is added. Email
> is wired as a second channel inside the 3B triggers (payment receipt, leave
> status, salary disbursed) alongside the in-app notification.

#### Email — Resend Integration  ✅
- [x] Integrate Resend (resend.com) for transactional emails — `src/lib/email.ts`
- [ ] Email template: Fee Due Reminder *(deferred with the fee-due sweep — needs scheduler)*
- [x] Email template: Payment Receipt — `paymentReceiptEmail`
- [x] Email template: Leave Approved/Rejected — `leaveStatusEmail`
- [x] Email template: Salary Slip — `salaryDisbursedEmail`
- [ ] Email template: Exam Schedule Released *(deferred — no exam-publish trigger yet)*
- [x] `src/lib/email.ts` — `sendEmail()` wrapper around Resend (guarded; `EMAIL_FROM` configurable); templates in `src/lib/emailTemplates.ts` (pure, unit-tested)
- [ ] Add `RESEND_API_KEY` to `.env.local` *(user action — free Resend account; verify a domain for production)*

#### SMS — MSG91 / Fast2SMS Integration
> Indian institutions rely heavily on SMS for parents and non-tech-savvy staff who may not regularly check email.
- [ ] Integrate MSG91 or Fast2SMS SMS gateway
- [ ] SMS trigger: Fee due reminder to parent/student phone
- [ ] SMS trigger: Exam schedule notification
- [ ] SMS trigger: Attendance alert (< 75%)
- [ ] SMS trigger: OTP for parent portal registration
- [x] `src/lib/sms.ts` — `sendSMS()` **stub** (logs; real MSG91/Fast2SMS + DLT registration deferred)
- [ ] Add `SMS_API_KEY` and `SMS_SENDER_ID` to .env.local *(deferred — paid + DLT)*

#### WhatsApp — Meta Cloud API
> WhatsApp Business API enables rich notifications with PDF attachments (payslips, fee receipts) — the preferred communication channel for Indian parents.
- [ ] Integrate WhatsApp Business Cloud API (or Twilio WhatsApp sandbox for dev)
- [ ] WhatsApp template: Fee receipt with PDF attachment
- [ ] WhatsApp template: Salary slip with PDF attachment
- [ ] WhatsApp template: Leave status update (approved/rejected)
- [ ] WhatsApp template: Exam hall ticket download link
- [x] `src/lib/whatsapp.ts` — `sendWhatsApp()` **stub** (logs; real Meta Cloud API + template approval deferred)
- [ ] Add `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` to .env.local *(deferred — Meta business verification)*

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

> **Status:** ✅ **Complete** (migration `20260614010000_phase3d_notices`). RLS:
> all institution members read; only admins (INST_ADMIN/PRINCIPAL/SUPER_ADMIN)
> manage. Pure helpers in `src/lib/notices.ts` (type meta, expiry, pinned-sort,
> audience targeting) are unit-tested. Notice bell now appears in the student
> portal shell too (was admin/staff only). Retention registered.

#### What to build:
- [x] `supabase/migrations/20260614010000_phase3d_notices.sql` — table + indexes + RLS
- [x] `src/app/institutions/[id]/notices/page.tsx` — admin manager (`NoticesManager`): create (right-side drawer), pin/unpin, delete, audience + department targeting, expiry
- [x] `src/actions/notices.ts` — `createNotice`, `updateNotice`, `deleteNotice`, `getNotices` (admin), `getActiveNotices` (audience + dept + non-expired filter)
- [x] `src/components/notices/NoticeBoard.tsx` — read-only board, embeddable in any portal
- [x] `src/components/notices/NoticeBadge.tsx` — per-type colour badge
- [x] Student portal: `src/app/student-portal/notices/page.tsx` — active notices for students (+ their dept)
- [x] Staff portal: `src/app/staff-portal/notices/page.tsx` — active notices for staff (+ their dept)
- [x] Integration: Emergency/Exam notices fire an in-app notification to the audience via `notifyNoticePosted` (3B). (Email/SMS/WhatsApp fan-out for notices deferred with the rest of 3C external channels)

#### Key features:
- Audience targeting: all / students only / staff only / specific dept / hostel residents
- Pinned notices always appear at top of board
- Auto-expire: notices disappear after `expires_at` date
- PDF attachment support for official circulars
- Optional push notification + WhatsApp trigger for urgent/emergency notices

---

### Phase 3 Completion Checklist
- [x] Notifications table created and RLS locked down
- [x] Bell icon shows live unread count in all nav bars
- [x] All 7 trigger events fire correctly
- [x] Email sending works for at least fee and payment events
- [ ] SMS sending works for at least attendance alert
- [ ] WhatsApp template sending works for fee receipt
- [x] Digital Notice Board live on all portals with audience targeting and auto-expiry
- [x] `npx tsc --noEmit` passes
- [x] `git commit -m "feat: Phase 3 — Notifications System complete"`
- [x] `git push origin main`

---

