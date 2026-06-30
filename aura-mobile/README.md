# Aura Mobile

Native Android (v1.0 target) companion app for Aura, built with **Expo (SDK 54) + Expo Router + TypeScript**. It is a **standalone app that shares the web app's Supabase backend** — same Postgres, same auth, same Row-Level Security. There is no separate API server, and no second permission system: whatever a user can see/do is governed by the same RLS policies the web app uses (parent access goes through the authenticated `/api/parent` route instead, since parents have no RLS path).

See [Phase 8 — Mobile & Smart Campus](../docs/AURA_CAMPUS/roadmap/10-phase8-mobile-apps.md) for the current build scope and status.

## One app, role-adaptive

A single app serves all six roles. After sign-in it reads the user's `institution_members` role (falling back to `staff`/`students` presence) and renders the right experience — the same role→access-tier mapping as the web app (`src/lib/roles.ts`).

| Role | Mobile experience (this foundation build) |
|---|---|
| Student | Dashboard (attendance %, fees due) → Attendance, Fees |
| Staff | Dashboard (today's classes, pending leave) → My Schedule |
| HOD | Department read-only snapshot (students/staff counts) |
| Admin / Principal / Super Admin | Institution read-only snapshot; full tools remain on web |

## Status

Auth, role-adaptive shell, and the Student/Staff/Parent read-only screens run today in **Expo Go**:

```bash
cd aura-mobile
cp .env.example .env        # fill in the SAME Supabase URL + anon key as the web app
npm install
npx expo start               # open in Expo Go
npm run typecheck            # tsc --noEmit
```

## Native modules — Expo Dev Client (EAS), not Expo Go

`expo-dev-client` is installed and `eas.json` defines `development` / `preview` / `production` build profiles. Features that need a native module (NFC tap, RTSP/VLC player, in-app Razorpay) **cannot run in Expo Go** — they need a custom dev-client build:

```bash
npm install -g eas-cli
eas login                                              # one-time, any Expo account
eas init                                                # one-time — writes your real project ID into app.json (extra.eas.projectId)
eas build --profile development --platform android      # installable APK with the dev client baked in
```

> **No paid Expo plan is required.** EAS Build's free tier covers normal dev-client iteration; `eas build --local` (using a local Android SDK/Android Studio install) is also free and doesn't touch EAS cloud at all. Production builds (`production` profile, app bundle, auto-incrementing version) use the same `eas.json` config later with no code changes — only the profile name changes.

- **NFC attendance** (`react-native-nfc-manager`) — Phase 8 P8.2/P8.3. Backing DB (`smart_cards`, `classrooms`, `nfc_tags`, `card_readers`) lives in the web repo's Supabase migrations.
- **Push notifications** (`expo-notifications`) — Phase 8 P8.5.
- **CCTV / RTSP** (`react-native-vlc-media-player`) and **in-app Razorpay** — Phase 8 P8.6 / deferred payment flow.

## Layout

```
aura-mobile/
├── app/                      # Expo Router (file-based routes)
│   ├── _layout.tsx           # AuthProvider + root stack
│   ├── index.tsx             # session gate → login or home
│   ├── login.tsx
│   └── (app)/                # authed group (redirects out if no session)
│       ├── _layout.tsx       # header + sign-out
│       ├── home.tsx          # role switch → dashboard
│       ├── attendance.tsx    # student
│       ├── fees.tsx          # student
│       └── schedule.tsx      # staff
└── src/
    ├── lib/supabase.ts       # client + SecureStore-encrypted session
    ├── lib/roles.ts          # role → access-tier + label (mirrors web)
    ├── lib/theme.ts          # palette / spacing tokens
    ├── context/AuthContext.tsx
    ├── components/ui.tsx      # shared primitives
    └── screens/dashboards.tsx # per-role home dashboards
```

Session tokens are stored with a SecureStore-held AES key encrypting an AsyncStorage blob (Supabase's official Expo pattern — works around SecureStore's 2KB limit).
