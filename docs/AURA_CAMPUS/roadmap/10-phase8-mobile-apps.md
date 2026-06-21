[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [01 — Phase 1 Portals](01-phase1-portals.md) (Staff/Student Portal APIs), [05 — Phase 3 Notifications](05-phase3-notifications.md) (push notification infrastructure), [08 — Phase 6 Portals & Tools](08-phase6-portals-tools.md) (Parent Portal), Phase 4F (Smart ID/NFC cards for attendance & CCTV).
> **Feeds into:** Final phase — no downstream dependents.

---

## 📱 Phase 8 — React Native Mobile Apps & CCTV Integration

> **Goal:** A native mobile app for staff and students. Primary use cases: NFC-based attendance marking, live CCTV feed access, push notifications, and a mobile-optimized portal experience.

### Step 8A — React Native Project Setup  ✅ Complete (commit `301be79` · role tabs `fd762bd` · SDK 54 `841bd2c` · screens `64246fd`)

> **Decision:** ONE unified, role-adaptive app (not separate per-role apps) serving
> all six roles — login detects the `institution_members` role and renders the
> matching experience, mirroring the web. Built with **Expo SDK 54 + Expo Router**.
> NFC/push/CCTV/online-pay deferred (need Phase 4F / Phase 3 / native EAS builds).
> Scaffolded without a device — first on-device `expo start` is the real test.
> See `aura-mobile/README.md`.

#### What to build:
- [x] Initialize Expo project (manual scaffold equivalent to `create-expo-app`, SDK 54 + Expo Router)
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

### Step 8B — Staff Mobile App  🟡 Screens built (commit `64246fd`) — NFC deferred

> Built under Expo Router as `aura-mobile/app/(app)/*` (not the literal paths
> below). Staff self-service is functional; NFC marking is deferred to Phase 4F
> + an EAS dev client.

#### Screens to build:
- [x] Login (`app/login.tsx`) — Email + password login
- [x] Staff Home (`app/(app)/home.tsx` → `StaffHome`) — today's classes + leave summary
- [x] Schedule (`app/(app)/schedule.tsx`) — weekly timetable
- [ ] `NFCAttendanceScreen` — NFC scan to mark present *(deferred — Phase 4F + EAS)*:
  * NFC scan mode — tap student card to mark present
  * Shows active class info (subject, time, room)
  * Live counter: marked / total students
  * Manual fallback: searchable student list
  * Calls `/api/attendance/nfc` webhook
- [x] Attendance view (`app/(app)/attendance.tsx`) — read-only attendance summary *(manual marking checklist still pending)*
- [x] Leave (`app/(app)/leave.tsx`) — apply and track leave
- [x] Payslip (`app/(app)/payslip.tsx`) — view salary structure + disbursements
- [x] **Approvals (`app/(app)/approvals.tsx`)** — admin/HOD review (approve/reject) leave requests *(added beyond original spec)*

---

### Step 8C — Student Mobile App  🟡 Screens built (commit `64246fd`) — in-app pay + inbox pending

#### Screens to build:
- [x] Student Home (`app/(app)/home.tsx` → `StudentHome`) — attendance % + fees-due summary
- [x] Timetable (`app/(app)/schedule.tsx`) — department timetable
- [x] Attendance (`app/(app)/attendance.tsx`) — per-subject attendance
- [x] Fees (`app/(app)/fees.tsx`) — dues + payment history
- [ ] `PayScreen` — in-app Razorpay payment *(pending — web Pay page already exists)*
- [ ] `NotificationsScreen` — push notification inbox *(pending — needs Phase 3 + 8D)*

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

### Step 8F — Parent Mobile App  🟡 Foundation built — read-only screens (Expo-Go-runnable); push + self-link deferred

> Built under Expo Router as `aura-mobile/app/(app)/*` (role-adaptive, not the
> literal paths below). The web parent portal reads child data with the service
> role (parents have no RLS path — Dev Rule 16), so the app calls a new
> **authenticated parent API** (`src/app/api/parent`, JWT-gated + link-verified)
> rather than supabase-js directly. Runs in **Expo Go** — no native module / no
> EAS build needed for these screens.

#### Screens to build:
- [x] **Parent Home** (`screens/parent/ParentHome.tsx`) — selected child's attendance % + fees-due summary, with a child switcher
- [x] **Child Attendance** (`screens/parent/ParentAttendance.tsx`) — subject-wise attendance %
- [x] **Child Results** (`screens/parent/ParentResults.tsx`) — published results + pass/arrear per semester
- [x] **Child Fees** (`screens/parent/ParentFees.tsx`) — fee demands + total due; **Pay** opens the web parent portal (`Linking.openURL`) — native in-app Razorpay deferred to an EAS build
- [ ] `ParentNotificationsScreen` — push inbox *(deferred — needs Phase 3 + 8D + EAS device token)*
- [ ] `LinkChildScreen` — parent self-links via roll number + OTP *(deferred — needs an OTP channel; SMS is Phase 3C-deferred. For now children come from admin-created links via the web Parents admin)*

#### Plumbing (done)
- [x] **Parent access tier** — resolved from the `parents` table in `aura-mobile` AuthContext (`tier: "parent"`); role-adaptive Home/Attendance/Fees + a parent-only Results tab.
- [x] **`ParentChildContext`** — shared selected-child state (persisted via AsyncStorage), child switcher when >1 child.
- [x] **`/api/parent`** (web) — JWT-authenticated, link-verified, service-role reads (children / attendance / results / fees); exempted from the cookie middleware.
- [x] `EXPO_PUBLIC_API_BASE_URL` documented in `aura-mobile/.env.example`.

#### Parent-specific push notifications:  *(all deferred to 8D — need Expo push + EAS device token)*
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

