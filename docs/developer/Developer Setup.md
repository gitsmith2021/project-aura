# Developer — Setup

## Purpose

Get a new engineer from a fresh clone to a running local environment and a green Definition of Done.

## Current State

The web app is a Next.js 16 project; local data uses either the shared Supabase project or a local Supabase stack via the CLI. The scheduler engine and mobile app are optional for most web work.

## Implementation

### Prerequisites
- **Node.js 20+** (CI runs Node 22; engines not pinned in `package.json`).
- **npm** (the repo uses `package-lock.json`).
- **Supabase CLI** (`supabase` is a dev dependency) + Docker (for the local stack / migration replay).
- **Git** with the project's commit conventions.
- *(Optional)* Python 3 + venv for `aura-scheduler-engine/`; Expo tooling for `aura-mobile/`.

### First run
```bash
git clone https://github.com/gitsmith2021/project-aura.git
cd project-aura
npm ci
cp .env.local.example .env.local   # if present; otherwise create .env.local (see below)
npm run dev                         # http://localhost:3000
```

### Environment variables
Create `.env.local` with the keys listed in [Environment Variables](../operations/Environment Variables.md). At minimum for the app to boot:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. AI/payments/email/scheduler features need their respective keys; absent keys degrade gracefully (e.g. AI returns "not configured"). **Never commit `.env.local`** (git-ignored).

### Definition of Done (run before every PR)
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint — 0 errors required
npm test            # vitest run
```

### Optional sub-projects
- **Scheduler engine (local):** `cd aura-scheduler-engine && venv\Scripts\activate && uvicorn main:app --port 8000` — set `SCHEDULER_API_KEY` in your shell + `.env.local` or `/generate-schedule` returns `503`. (Local dev only — production runs on Railway.)
- **Local Supabase stack:** `supabase db start` then `supabase migration up --local --include-all` (this is what CI's `migrations` job does).
- **Demo data:** `npm run seed:demo` (tunable with `DEMO_STUDENTS`); reset with `npm run reset:demo`.

## Future Roadmap

- Commit a `.env.local.example` and pin Node via `engines` / `.nvmrc`.
- Provide a one-command bootstrap script.

## Related Documents

- [Project Structure](Project Structure.md) · [Coding Standards](Coding Standards.md) · [Testing](Testing.md) · [Environment Variables](../operations/Environment Variables.md) · [AGENTS.md](../../AGENTS.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
