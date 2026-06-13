# Aura Mobile

Native iOS/Android companion app for Aura, built with **Expo (SDK 52) + Expo Router + TypeScript**. It is a **standalone app that shares the web app's Supabase backend** — same Postgres, same auth, same Row-Level Security. There is no separate API server, and no second permission system: whatever a user can see/do is governed by the same RLS policies the web app uses.

## One app, role-adaptive

A single app serves all six roles. After sign-in it reads the user's `institution_members` role (falling back to `staff`/`students` presence) and renders the right experience — the same role→access-tier mapping as the web app (`src/lib/roles.ts`).

| Role | Mobile experience (this foundation build) |
|---|---|
| Student | Dashboard (attendance %, fees due) → Attendance, Fees |
| Staff | Dashboard (today's classes, pending leave) → My Schedule |
| HOD | Department read-only snapshot (students/staff counts) |
| Admin / Principal / Super Admin | Institution read-only snapshot; full tools remain on web |

## ⚠️ Status: foundation, not yet device-verified

This was scaffolded in an environment **without** a device, simulator, or Expo toolchain, so it has **not been run or built on a device**. It is structurally complete and type-oriented, but treat the first `expo start` as the real first test. Run on your machine:

```bash
cd aura-mobile
cp .env.example .env        # fill in the SAME Supabase URL + anon key as the web app
npm install
npx expo install --fix      # reconcile any SDK 52 version drift
npx expo start              # open in Expo Go (auth + read-only screens work here)
npm run typecheck           # tsc --noEmit
```

## Deferred (need their dependencies or a native build)

These are intentionally **not** in this build:

- **NFC attendance marking** (`react-native-nfc-manager`) — needs Phase 4F (NFC card→student registry) and a **custom dev client / EAS build** on a physical device. Does not run in Expo Go.
- **Push notifications** (`expo-notifications`) — needs Phase 3 (notification engine) for the server side.
- **CCTV / RTSP** (`react-native-vlc-media-player`) and **online fee payment** — later builds; both require native modules + EAS.
- **Parent app** — needs Phase 6A (Parent Portal), not yet built.

Building these later means switching from Expo Go to an EAS dev client:

```bash
npm install -g eas-cli
eas build --profile development --platform android   # or ios
```

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
