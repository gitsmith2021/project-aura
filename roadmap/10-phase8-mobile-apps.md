[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [01 — Phase 1 Portals](01-phase1-portals.md) (Staff/Student Portal APIs), [05 — Phase 3 Notifications](05-phase3-notifications.md) (push notification infrastructure), [08 — Phase 6 Portals & Tools](08-phase6-portals-tools.md) (Parent Portal), Phase 4F (Smart ID/NFC cards for attendance & CCTV).
> **Feeds into:** Final phase — no downstream dependents.

---

## 📱 Phase 8 — React Native Mobile Apps & CCTV Integration

> **Goal:** A native mobile app for staff and students. Primary use cases: NFC-based attendance marking, live CCTV feed access, push notifications, and a mobile-optimized portal experience.

### Step 8A — React Native Project Setup  🟡 Foundation (commit `301be79`)

> **Decision:** ONE unified, role-adaptive app (not separate per-role apps) serving
> all six roles — login detects the `institution_members` role and renders the
> matching experience, mirroring the web. Built with **Expo SDK 52 + Expo Router**.
> NFC/push/CCTV/online-pay deferred (need Phase 4F / Phase 3 / native EAS builds).
> Scaffolded without a device — first on-device `expo start` is the real test.
> See `aura-mobile/README.md`.

#### What to build:
- [x] Initialize Expo project (manual scaffold equivalent to `create-expo-app`, SDK 52 + Expo Router)
- [x] Folder: `/aura-mobile` at monorepo root (alongside `/aura-scheduler-engine`)
- [x] Install dependencies (declared in `package.json`):
  * [x] `@supabase/supabase-js`
  * [x] `expo-secure-store` (auth token storage — via SecureStore-encrypted AsyncStorage, 2KB-limit-safe)
  * [ ] `react-native-nfc-manager` (NFC scanning — deferred to 8B; needs Phase 4F + EAS dev client)
  * [ ] `expo-camera` (QR fallback — deferred to 8B)
  * [ ] `expo-notifications` (push — deferred to 8D; needs Phase 3)
  * [ ] `react-native-vlc-media-player` (CCTV RTSP — deferred to 8E; needs EAS)
- [x] Supabase auth with Expo SecureStore session persistence
- [x] Role-adaptive shell (all 6 roles) + read-only portal screens (student attendance/fees, staff schedule, HOD/admin snapshots)
- [ ] Shared type definitions from `/src/types/` — *currently the mobile app defines its own lean row shapes; a shared-types extraction is a follow-up*

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

