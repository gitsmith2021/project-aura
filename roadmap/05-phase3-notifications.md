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

