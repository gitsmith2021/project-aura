# Developer — Coding Standards

## Purpose

The conventions that keep the codebase consistent and reviewable. These are derived from the existing code and the contributor rules in [AGENTS.md](../../AGENTS.md) / [CLAUDE.md](../../CLAUDE.md).

## Current State

TypeScript `strict` throughout; ESLint is a hard CI gate (0 errors). The codebase follows a consistent server-action + `Result<T>` pattern and a token-based design system.

## Implementation

### Language & types
- **TypeScript `strict`** ([tsconfig.json](../../tsconfig.json)); avoid `any` (lint enforces). Path alias `@/*` → `src/*`.
- **Result pattern:** server actions return a discriminated union
  `{ success: true; data } | { success: false; error }` — callers branch on `success`, never throw across the action boundary.

### Server Actions
- File starts with `"use server"`; authenticate via `supabase.auth.getUser()`; apply an explicit role/ownership gate **before** expensive work; rely on RLS as the source of truth for data access.
- Use the correct Supabase client (`server` vs `admin`) — never import the service-role `admin` client into client code.

### React / Next.js
- Server Components by default; add `"use client"` only when interactivity requires it.
- This is **not the Next.js from training data** — read the relevant guide in `node_modules/next/dist/docs/` before using an unfamiliar API, and heed deprecation notices (per [AGENTS.md](../../AGENTS.md)).
- File references in markdown/UI use clickable `[text](path)` links, not bare backticks (per session conventions).

### Styling (design system)
- Tailwind CSS v4 with **semantic tokens** in [globals.css](../../src/app/globals.css); class-based dark mode (`dark:` variants under `.dark`). Derive colors from tokens — see [Colours](../branding/Colours.md).
- **Institution pages** under `/institutions/[id]/` must wrap in `<DashboardLayout>` and use `w-full` (not `max-w-*`).
- **Forms & modals** slide in from the right as a drawer (`flex justify-end` + `animate-in slide-in-from-right duration-300`) — never centered modals.
- Logo lockups and color usage follow [Logo Usage](../branding/Logo Usage.md) / [Brand Guidelines](../branding/Brand Guidelines.md).

### Linting
- `eslint.config.mjs` — **0 errors** required (hard gate). The one scoped exception is `react-hooks/set-state-in-effect` (set to `warn`) for the standard loader pattern. New code must be error-clean.

### Commits & PRs
- Branch from `main`; never commit directly (protected).
- Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; PR bodies end with the Claude Code footer.
- `.claude/settings.local.json` is always left unstaged.

### Tracker discipline (from AGENTS.md)
- On completing a development phase, update the roadmap/phase-spec/execution-plan trackers and commit them before moving on.

## Future Roadmap

- Extract shared types into `@aura/types`; enforce package dependency rules once the monorepo lands.

## Related Documents

- [AGENTS.md](../../AGENTS.md) · [Project Structure](Project Structure.md) · [Testing](Testing.md) · [Branch Strategy](Branch Strategy.md) · [Colours](../branding/Colours.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
