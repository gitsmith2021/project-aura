[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [01 — Phase 1 Portals](01-phase1-portals.md) (Staff/Student Portal APIs), [05 — Phase 3 Notifications](05-phase3-notifications.md) (push notification infrastructure), [08 — Phase 6 Portals & Tools](08-phase6-portals-tools.md) (Parent Portal), Phase 4F (Smart ID / RFID / NFC tags for attendance), Aura Core **CF-1** (config), **CF-2** (Data Explorer), **CF-3** (Aura Intelligence — executive dashboards).
> **Feeds into:** Final phase before commercial launch — no downstream dependents.

---

# 📱 PHASE 8 — Mobile & Smart Campus Implementation

### Aura Campus v1.0 · Owner: Product Director · Status: **Approved for Development**

> **This is the single source of truth for Phase 8.** It merges the original
> roadmap/implementation-status doc with the Product Director's scope directive
> (`PHASE_8_MOBILE_SMART_CAMPUS_IMPLEMENTATION.md`, now folded in here). Where the
> directive and the earlier plan differed, **the directive is authoritative** — the
> reconciliations are called out inline (see ⚠️ notes).

---

## Objective

Phase 8 is the **final major engineering milestone before the commercial launch** of
Aura Campus. The objective is **not** another roadmap — it is to ship **production-ready
Android mobile applications** together with the **first Smart Campus capabilities**.

Everything in this phase must directly contribute to a **demo-ready and customer-ready**
product. Keep the implementation **practical, stable, and production-oriented**. Avoid
experimental AI features.

---

## Scope

This phase contains **ONLY** the deliverables below. Anything not listed is **out of
scope** for Aura Campus v1.0 (see [Out of Scope](#out-of-scope)).

| # | Deliverable | Status |
|---|-------------|--------|
| **P8.1** | Android Mobile Applications (role-adaptive) | 🟡 In progress — core screens built |
| **P8.2** | Student Card Attendance (RFID / NFC / MIFARE / DESFire) | 🔲 Not started (new directive) |
| **P8.3** | NFC Staff Attendance | 🔲 Not started (refines prior NFC plan) |
| **P8.4** | Intelligent Timetable Validation + Substitute Faculty | 🔲 Not started (new directive) |
| **P8.5** | Mobile Push Notifications (role-specific) | 🔲 Not started (needs Phase 3) |
| **P8.6** | Campus CCTV Integration (ONVIF / RTSP, no AI) | 🔲 Not started |

---

## Technical Expectations (non-negotiable)

- **Reuse, don't rebuild.** The mobile app is **another presentation layer / client** of
  Aura Campus — nothing more.
- **No duplicate business logic. No duplicate backend.** Continue using the existing
  **authentication, authorization, and APIs**.
- **Do not bypass existing APIs.** Continue respecting **Supabase RLS** end-to-end.
- **Build on Aura Core** — **CF-1** (configuration), **CF-2** (Data Explorer / Query Model),
  **CF-3** (Aura Intelligence executive dashboards). Mobile executive views should consume
  CF-3, not reinvent analytics.
- Shared type definitions should flow from `/src/types/` (currently the app defines its own
  lean row shapes — a shared-types extraction is a follow-up).

---

## Smart Campus Configuration (CF-1)

All Smart Campus hardware capabilities are **configurable through CF-1** — institutions
**enable or disable them without changing code**:

- **Enable RFID**
- **Enable NFC**
- **Enable CCTV**
- **Enable Push Notifications**
- **Enable Smart Attendance**

Configuration also governs vendor/reader selection (P8.2), notification rules (P8.5 Parent
Notification Policy), and the Missed-Lecture **grace period** (P8.4).

> ✅ **Sprint 1 — seeded:** all 5 toggles exist as `smart_campus.*` CF-1 settings (`rfid_enabled`,
> `nfc_enabled`, `cctv_enabled`, `push_notifications_enabled`, `smart_attendance_enabled`),
> default-on, editable from the Configuration Center. Marked **Deferred** (`src/lib/config.ts`
> `DEFERRED_KEYS`) — stored & audited, not yet enforced — until each gated capability ships in
> P8.2–P8.6.

---

## User Experience targets

The app should feel **Fast · Simple · Modern · Native · Minimal**, and **offline-friendly
where practical**. **Speed is the focus.**

- A staff member should be able to **mark attendance in under three seconds**.
- A student should reach **results or fee information within two taps**.

---

## Engineering Philosophy

Phase 8 is **not** about the maximum number of features — it is about a **stable, polished,
demo-ready Smart Campus experience**. When a choice arises between *more features* and
*higher reliability*, **always choose reliability**. Every feature shipped here must be
something we are comfortable **demonstrating live** to a prospective institution.

---

## Platform decision — one role-adaptive app

> **Decision:** ONE unified, **role-adaptive** app (not separate per-role apps) serving all
> seven audiences. Login detects the `institution_members.role` (and the `parents` link tier)
> and renders the matching experience, mirroring the web. Built with **Expo SDK 54 + Expo
> Router** (React Native).
>
> **v1.0 target platform is Android** (production / demo / customer-ready). The Expo stack
> keeps iOS available, but **iOS is not in the v1.0 scope** per the directive. See
> `aura-mobile/README.md`.

### Canonical role terminology

To keep wording consistent across all project documents, this doc uses the **canonical
`user_role` enum values** (source of truth: [`src/lib/roleLabel.ts`](../../../src/lib/roleLabel.ts)).
Executive **personas** (e.g. "Chairman") are display/persona names, **not** separate roles:

| Canonical role (`user_role`) | Friendly label | Persona / notes |
|------------------------------|----------------|-----------------|
| `SUPER_ADMIN` | Super Admin | Platform owner |
| `INST_ADMIN` | **Admin** | Institution administrator. *The "Chairman" executive persona maps to **INST_ADMIN**.* |
| `PRINCIPAL` | Principal | Shares the "admin" access tier but is a distinct role/badge from Admin |
| `DEPARTMENT_HEAD` (alias `HOD`) | HOD | Department-scoped |
| `STAFF` | Staff | — |
| `STUDENT` | Student | — |
| *(link tier)* `PARENT` | Parent | Not a `user_role`; resolved from the `parents` table |

> ⚠️ **Known code drift to reconcile (not a Phase 8 task):** `roleLabel.ts` labels `INST_ADMIN`
> as **"Admin"** (canonical), but [`AuraIntelligence.tsx`](../../../src/components/intelligence/AuraIntelligence.tsx)
> labels the same role **"Chairman"**. Canonical term is **"Admin"** — the Intelligence UI label
> should be reconciled separately.

---

# P8.1 — Android Mobile Applications

Role-adaptive app reusing Aura Campus auth, authorization, and APIs. Per-role feature sets
below; checkboxes reflect **current build status**.

### Project setup — ✅ Complete (commit `301be79` · role tabs `fd762bd` · SDK 54 `841bd2c` · screens `64246fd`)

- [x] Expo project (SDK 54 + Expo Router), folder `/aura-mobile` at monorepo root (alongside `/aura-scheduler-engine`)
- [x] `@supabase/supabase-js`
- [x] `expo-secure-store` (auth token storage — SecureStore-encrypted AsyncStorage, 2 KB-limit-safe)
- [x] Supabase auth with Expo SecureStore **session persistence** (survives app restarts)
- [x] Role-adaptive shell (all 7 roles) + read-only portal screens
- [x] EAS / Dev Client scaffolding — `eas.json` (development/preview/production profiles), `expo-dev-client` installed, `app.json` plugin + `extra.eas.projectId` placeholder; no native modules installed yet (Sprint 1)
- [ ] `react-native-nfc-manager` (NFC tag scanning — **P8.3**; needs Phase 4F + EAS dev client)
- [ ] `expo-notifications` (push — **P8.5**; needs Phase 3)
- [ ] `react-native-vlc-media-player` (CCTV RTSP — **P8.6**; needs EAS)
- [ ] Shared type definitions from `/src/types/` *(follow-up)*

### Student App

- [x] **Dashboard** (`app/(app)/home.tsx` → `StudentHome`) — attendance % + fees-due summary
- [x] **Timetable** (`app/(app)/schedule.tsx`) — department timetable
- [x] **Attendance** (`app/(app)/attendance.tsx`) — per-subject attendance
- [x] **Fee Dues** (`app/(app)/fees.tsx`) — dues + payment history
- [ ] **Examination Results** — student results screen *(pending — parent results screen exists; reuse for student)*
- [ ] **Online Fee Payment (Razorpay)** — in-app `PayScreen` *(pending — web Pay page already exists)*
- [ ] **Notifications** — push inbox *(pending — needs Phase 3 + P8.5)*
- [ ] **Profile** *(pending)*
- [ ] **Knowledge Hub** *(pending)*
- [ ] **Downloads** *(pending)*

### Staff App

- [x] **Login** (`app/login.tsx`) — email + password
- [x] **Dashboard / Today's Classes** (`app/(app)/home.tsx` → `StaffHome`) — today's classes + leave summary
- [x] **Timetable** (`app/(app)/schedule.tsx`) — weekly timetable
- [x] **Leave** (`app/(app)/leave.tsx`) — apply and track leave
- [x] **Payslip** (`app/(app)/payslip.tsx`) — salary structure + disbursements *(beyond directive list — keep)*
- [x] **Approvals** (`app/(app)/approvals.tsx`) — admin/HOD review (approve/reject) leave requests *(beyond original spec)*
- [x] **Attendance view** (`app/(app)/attendance.tsx`) — read-only summary
- [ ] **Attendance Entry** — faculty's **own** attendance is now via NFC room-tag tap (**P8.3 + P8.4**); class-level student attendance is via **RFID readers (P8.2)**. ⚠️ See reconciliation note below.
- [ ] **CIA Marks Entry** *(pending)*
- [ ] **Notifications** *(pending — P8.5)*
- [ ] **Knowledge Hub** *(pending)*
- [ ] **Profile** *(pending)*

> ⚠️ **Reconciliation (supersedes earlier plan):** the original spec had a staff
> `NFCAttendanceScreen` where **staff tapped each student's card** with their phone to mark
> the class present. The directive **replaces** that model: **student classroom attendance =
> fixed RFID/NFC readers (P8.2)** — students do not use phones in class — and the **staff
> phone is used for the faculty member's *own* attendance** by tapping the **room's NFC tag
> (P8.3)**, gated by **timetable validation (P8.4)**. Treat the old `NFCAttendanceScreen`
> (staff-taps-student-cards) as **withdrawn**.

### Parent App — 🟡 Foundation built (Expo-Go-runnable); push + self-link deferred

> The web parent portal reads child data with the service role (parents have no RLS path —
> Dev Rule 16), so the app calls a new **authenticated parent API**
> (`src/app/api/parent`, JWT-gated + link-verified) rather than supabase-js directly.

- [x] **Child Dashboard** (`screens/parent/ParentHome.tsx`) — selected child's attendance % + fees-due summary, with a child switcher
- [x] **Attendance** (`screens/parent/ParentAttendance.tsx`) — subject-wise attendance %
- [x] **Examination Results** (`screens/parent/ParentResults.tsx`) — published results + pass/arrear per semester
- [x] **Fee Dues** (`screens/parent/ParentFees.tsx`) — fee demands + total due
- [~] **Online Payment** — **Pay** opens the web parent portal (`Linking.openURL`); native in-app Razorpay deferred to an EAS build
- [ ] **Notifications** (`ParentNotificationsScreen`) — push inbox *(deferred — Phase 3 + P8.5 + EAS device token)*
- [ ] `LinkChildScreen` — parent self-links via roll number + OTP *(deferred — needs an OTP channel; SMS is Phase 3C-deferred. For now children come from admin-created links via the web Parents admin)*

#### Parent plumbing — ✅ done
- [x] **Parent access tier** resolved from the `parents` table in `aura-mobile` AuthContext (`tier: "parent"`)
- [x] **`ParentChildContext`** — shared selected-child state (AsyncStorage-persisted); child switcher when >1 child
- [x] **`/api/parent`** (web) — JWT-authenticated, link-verified, service-role reads (children / attendance / results / fees); exempted from cookie middleware
- [x] `EXPO_PUBLIC_API_BASE_URL` documented in `aura-mobile/.env.example`

### Chairman / Principal / HOD — Executive (mobile)

Mobile-suitable executive dashboards with quick access to **Institution KPIs · Attendance ·
Admissions · Fee Collection · Notifications · CCTV (P8.6)**.

- [x] Read-only HOD/admin snapshot screens (foundation)
- [ ] **Consume CF-3 (Aura Intelligence)** for ask-a-question executive dashboards on mobile *(pending)*
- [ ] Quick-access KPI / Admissions / Fee-collection cards *(pending)*
- [ ] CCTV entry point → **P8.6** *(pending)*

---

## Smart Campus Entity Model — Classroom (managed asset)

> **Clarification (no scope change):** instead of treating NFC tags, readers, and cameras as
> independent devices, the **Classroom is a managed Smart Campus asset** — the single entity
> the Smart Campus features reference.

Each classroom is a **configurable entity** containing:

- **Building**
- **Floor**
- **Room Number**
- **Department**
- **Capacity**
- **Assigned NFC Tag** (P8.3)
- **Assigned card Reader** (P8.2)
- **Assigned CCTV Cameras** *(optional — P8.6)*

**Future Smart Campus features reference the Classroom entity, not individual hardware
devices.** Classroom records are managed from Aura Campus Administration (configuration,
not code). Other room types in P8.3 (Lab, Library, Office, Seminar/Meeting Hall) are modelled
as the same managed-location asset.

> ✅ **Sprint 1 (foundation) — done:** `public.classrooms` (building/floor/room/department/
> capacity) + `public.nfc_tags` + `public.card_readers` (RLS mirrors `smart_cards`), admin
> **Classrooms** manager at `/institutions/[id]/classrooms` (create/edit rooms, assign NFC tag,
> assign card reader). CCTV camera assignment is added in **P8.6**. `card_readers` is
> deliberately separate from the existing Phase 4F `public.devices` table (staff-carried
> handheld scanner) — different deployment shape, not merged.

---

# P8.2 — Student Card Attendance (vendor-independent)

Student classroom attendance is based on a **physical campus card**, read by a fixed
in-room reader.

- **Students SHALL NOT use mobile phones inside classrooms.**
- **QR attendance is NOT part of classroom attendance.**

**Card-technology abstraction (clarification):** Aura Campus supports **multiple student
card technologies through a vendor-independent abstraction layer** — **RFID · NFC · MIFARE ·
DESFire**. The implementation must **not** be tightly coupled to any specific hardware
vendor; **reader integrations are abstracted** so institutions can choose different hardware
providers. (Product clarification only — no implementation change.)

**Workflow:** Student → Campus Card (RFID/NFC/MIFARE/DESFire) → **In-room Reader** →
Aura Campus → Attendance Recorded → Parent Notification *(per CF-1 policy — see P8.5)*.

**Requirements:**
- [ ] **Vendor-independent reader/card abstraction layer** (adapter per technology: RFID · NFC · MIFARE · DESFire)
- [ ] Card-attendance integration is **configurable** (enable/disable + reader provider — via CF-1, see [Smart Campus Configuration](#smart-campus-configuration-cf-1))
- [ ] **Pluggable reader vendors** — no vendor lock-in; institutions choose the hardware provider
- [ ] Ingest endpoint that records attendance against the live timetable/period (RLS-respecting)
- [ ] Parent notification on record follows the **CF-1 notification policy** (P8.5)
- [ ] Reader / card provisioning ties to **Phase 4F** Smart ID / campus cards

---

# P8.3 — NFC Staff Attendance

Every classroom, laboratory, and office room contains a **programmable NFC Tag**. **Each NFC
tag represents a physical location** and acts as the **classroom identity**.

**Example locations:** Classroom · Laboratory · Library · Principal Room · Office ·
Seminar Hall · Meeting Room.

**Workflow:** Faculty enters classroom → **Tap NFC Tag** using the Aura Campus mobile app →
**Aura validates** (see P8.4) → **records two business events** (below).

### Two distinct business events (clarification)

A tap is **not** a single record. It produces **two independently-recorded events**:

| Event | Meaning |
|-------|---------|
| **1 — Faculty Presence** | Faculty physically arrived at the assigned classroom. |
| **2 — Lecture Started** | The teaching session has officially begun. |

**Why separate:** a faculty member may arrive and still cancel the lecture. Keeping
**Faculty Presence** and **Lecture Started** as separate events improves reporting and
future analytics (and underpins [Missed Lecture detection](#p84--intelligent-timetable-validation)).

**Requirements:**
- [ ] NFC tag **location registry** (tag ID ↔ Classroom entity), managed in web admin
- [ ] `react-native-nfc-manager` integration (needs EAS dev client + Phase 4F)
- [ ] Tap reads the tag → resolves the **Classroom** → hands off to **P8.4** validation before recording
- [ ] Record **Faculty Presence** and **Lecture Started** as **separate** events
- [ ] Tag programming / provisioning workflow

### NFC Tag lifecycle management

All NFC tags are managed from **Aura Campus Administration — without code changes**:

- [x] **Tag Registration** (bind a tag to a Classroom/location) — `assignNfcTag` (Sprint 1)
- [x] **Tag Replacement** — `replaceTag` (old → `replaced`, new tag bound to same classroom, `replaced_by` linked) (Sprint 1)
- [x] **Tag Deactivation** — `deactivateTag` (Sprint 1)
- [x] **Tag Reassignment** — re-running `assignNfcTag` for an existing UID moves it to a new classroom (Sprint 1)
- [x] **Tag Health Status** — `isStale()` 48h `last_seen_at` staleness signal, surfaced in the Classrooms admin UI (Sprint 1; live ping from a reader is wired in P8.3)

---

# P8.4 — Intelligent Timetable Validation

Faculty attendance must **NOT** simply record a tap. Aura must **validate** against:

- Current **timetable**
- Assigned **faculty**
- Assigned **classroom** (resolved from the NFC tag, P8.3)
- Current **period**
- Current **date**

**If all conditions match → attendance is accepted.**

**If validation fails → attendance must NOT be recorded.** Instead, show the reason, e.g.:
- "You are not assigned to this classroom."
- "This class belongs to another faculty."
- "No scheduled lecture exists."
- "This lecture has already been completed."

**Requirements:**
- [ ] Validation service that cross-checks tag location × faculty × period × date against the timetable
- [ ] Clear, reason-coded rejection messages (no silent failures)

## Substitute Faculty *(mandatory)*

If a faculty member is on leave:
- The **HOD or Principal can assign** another faculty member, **OR**
- The **Scheduler Engine** can automatically recommend / assign a substitute.

After reassignment:
- The **substitute** faculty **is allowed** to tap the classroom NFC tag.
- The **original** faculty is **no longer allowed**.
- **All substitutions must be audited.**

**Requirements:**
- [ ] Manual substitute assignment (HOD / Principal)
- [ ] Scheduler Engine auto-recommend / auto-assign substitute
- [ ] Validation (P8.4) honours the active substitution (original blocked, substitute permitted)
- [ ] **Full audit trail** of every substitution

## Missed Lecture Detection (system-generated event)

A **system-generated operational event** — **not** a notification feature.

**Condition:** scheduled lecture exists in the **current timetable** → faculty **never
tapped** → **no substitute assigned** → **grace period exceeded** ⇒ Aura generates a
**Missed Lecture** event.

- Visible to **Principal · HOD · Super Admin**.
- This is an **operational event** (it feeds the [Attendance Exception Dashboard](#smart-campus-operations-monitoring)), distinct from any push notification.

**Requirements:**
- [ ] System job evaluates timetable vs. Faculty-Presence/Lecture-Started events after a **configurable grace period** (CF-1)
- [ ] Emits a **Missed Lecture** operational event when the condition holds
- [ ] Surfaced to Principal / HOD / Super Admin

---

# P8.5 — Mobile Push Notifications

Implement **push notifications**; every role receives **role-specific** notifications.
**Reuse Aura's notification engine** — do not build a parallel one.

| Role | Notifications |
|------|---------------|
| **Student** | Attendance · Fees · Results · Circulars |
| **Parent** | Student absent · Fee due · Result published |
| **Faculty** | Timetable changed · Substitute assigned · Leave approved |
| **Principal** | Faculty absent · Attendance exception · IQAC reminder |
| **Chairman** | Fee collection milestone · Admission target · Executive alerts |

### Parent Notification Policy (clarification)

Replaces the earlier "optional parent notification" wording — the expected behaviour is
**defined**, and the rules remain **configurable through CF-1**:

| Trigger | Expected behaviour |
|---------|--------------------|
| **Student absent** (attendance) | **Immediate** push notification |
| **Fee due** | **Configurable reminder schedule** (e.g. 7-day + 1-day) |
| **Results published** | **Immediate** notification |
| **Leave approved** | **Immediate** notification |

> Notification rules (enable/disable, timing, channel) are **CF-1-configurable** — see
> [Smart Campus Configuration](#smart-campus-configuration-cf-1).

**Requirements:**
- [ ] Integrate **Expo Push Notifications**
- [ ] Register device token in Supabase on login; add a **`device_tokens`** table
- [ ] Server-side: send push via the **Expo Push API** when notifications are triggered
- [ ] Update `src/lib/notifications.ts` to **also** send push alongside in-app
- [ ] Parent triggers honour the **Parent Notification Policy** above, with the schedule **configurable via CF-1**

---

# P8.6 — Campus CCTV Integration

Provide **live CCTV integration**. **This is NOT Aura Vision** — this phase only integrates
**existing** CCTV systems.

**Access is permission-driven (clarification).** CCTV access is governed by a **permission**,
**not** a hardcoded role check. The **initial implementation exposes cameras only to
`SUPER_ADMIN` · `INST_ADMIN` · `PRINCIPAL`** (the "Chairman" executive persona = `INST_ADMIN`),
but the authorization model must stay flexible enough that **future versions can grant access
to HOD, Security Officer, Facility Manager, or any custom role through permissions** — without
code changes to the access checks.

**Protocols:** **ONVIF · RTSP**.

**Capabilities:** Camera List · Live View · Multi-camera View · Full Screen · Camera Status ·
Camera Groups.

**Surfaces:** inside the **Web Application** **AND** inside the **Android Mobile Application**.

**Strict boundary — NONE of the following in this phase** (they belong to **Aura Vision**):
No AI · No analytics · No face recognition · No motion detection · No occupancy detection.

**Implementation strategy** (browser-based RTSP is not supported — native approach in-app):
- **Primary:** `react-native-vlc-media-player` for direct RTSP stream in app
- **Fallback:** `Linking.openURL()` to open official NVR apps (e.g. Hikvision `hik-connect://`, CP Plus `cpplusremotenet://`)

**What to build:**
- [ ] Web admin **camera registration** (name, RTSP/ONVIF URL, location, group)
- [ ] `src/app/api/cctv/cameras/route.ts` — list registered cameras (role-gated)
- [ ] Web CCTV dashboard — list / live / multi-cam / full-screen / status / groups
- [ ] Mobile `screens/cctv/CCTVListScreen.tsx` — camera grid + status
- [ ] Mobile `screens/cctv/CCTVPlayerScreen.tsx` — full-screen RTSP player + NVR deep-link fallback

---

# Smart Campus Operations (monitoring)

> Operational monitoring surfaces. **This is NOT Aura Intelligence** — it is part of **Smart
> Campus Operations** (live operational state, not analytical Q&A).

## Attendance Exception Dashboard

Aura Campus maintains an **Attendance Exception Dashboard** surfacing live exceptions:

- **Faculty Missing**
- **Late Faculty**
- **Missed Lectures** (from P8.4)
- **RFID Reader Offline**
- **NFC Tag Offline**
- **Camera Offline**

Available to **Principal · Chairman · Super Admin**.

## Smart Classroom Status

Every classroom carries a **live status**, derived **automatically** from the **timetable**,
**NFC faculty taps** (Faculty Presence / Lecture Started), **substitute assignments**, and
**time of day**:

| Classroom | Status |
|-----------|--------|
| CSE-101 | 🟢 Class in Progress |
| CSE-102 | 🟡 Faculty Late |
| MBA-201 | 🔵 Free Period |
| Physics Lab | 🔴 Missed Lecture |
| Seminar Hall | 🟣 Event |

> Status is computed from existing signals — it introduces **no new data capture**, only a
> derived operational view over the Classroom entity.

---

# Out of Scope

The following are **intentionally excluded** from Aura Campus v1.0. **Do NOT implement them**
— they belong to **Aura Vision**:

Face Recognition · Biometric Attendance · **QR Student Attendance** · GPS Attendance ·
AI CCTV · Crowd Analytics · Occupancy Detection · Heat Maps · Behaviour Analysis ·
PPE Detection · Vehicle Tracking.

---

# Phase 8 Completion Checklist

**Deliverables (directive):**
- [ ] ✅ Android Mobile Applications (role-adaptive, all 7 roles)
- [ ] ✅ Student Card Attendance — RFID / NFC / MIFARE / DESFire, vendor-independent (P8.2)
- [ ] ✅ NFC Faculty Attendance — Faculty Presence + Lecture Started events (P8.3)
- [ ] ✅ Intelligent Timetable Validation (P8.4)
- [ ] ✅ Substitute Faculty Assignment (P8.4 — audited)
- [ ] ✅ Push Notifications (P8.5 — role-specific)
- [ ] ✅ Live CCTV Integration (P8.6 — ONVIF/RTSP, web + Android, no AI)

**Quality gates:**
- [ ] Expo app runs on **Android** (target) — iOS out of v1.0 scope
- [ ] Student card attendance works end-to-end via the vendor-independent reader/card layer (reader → record → parent push per CF-1 policy)
- [ ] NFC faculty attendance works end-to-end with **timetable validation** + reason-coded rejections, recording **Faculty Presence** and **Lecture Started** separately
- [ ] Missed-Lecture event generates after the grace period and surfaces on the Attendance Exception Dashboard
- [ ] Substitute assignment flips tap permission (original blocked, substitute allowed) and is **audited**
- [ ] Push notifications received on device for student, parent, and faculty
- [ ] CCTV streams play inside web + mobile (or NVR deep-link fallback triggers)
- [ ] Supabase auth persists across app restarts
- [ ] Parent app correctly links to child record and shows live data
- [ ] UX targets met — staff attendance **< 3 s**, student results/fees **≤ 2 taps**
- [ ] `git commit -m "feat: Phase 8 — Mobile & Smart Campus complete"`
- [ ] `git push origin main`

> **This represents the Smart Campus capabilities required for the commercial launch of Aura
> Campus. Everything else becomes part of future releases.**

---

## Specification status — 🔒 FROZEN

The refinements above are **clarifications for maintainability, extensibility, and operational
readiness** — they **do not change implementation priority, scope, or order**. No new sprint,
no new roadmap, no expanded scope.

**The Phase 8 specification is now considered FROZEN. Development proceeds immediately, in the
unchanged P8.1 → P8.6 order.**
