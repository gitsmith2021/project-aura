# Developer — Project Structure

## Purpose

Help a new engineer find where things live and where new code belongs.

## Current State

A single Git repository containing the Next.js web app plus two companion sub-projects (Python scheduler, Expo mobile). Not yet a monorepo — see the extraction plan in [Architecture Overview](../architecture/Architecture Overview.md).

## Implementation

### Repository top level
```
project-aura/
├── src/                      Next.js web app (Aura Campus)
├── aura-scheduler-engine/    Python + OR-Tools FastAPI service (deployed to Railway)
├── aura-mobile/              Expo / React Native shell
├── supabase/                 migrations/, migrations_archive/, config.toml (local dev), seed.sql
├── scripts/                  demo/ seeders (seed-demo, reset-demo) + utilities
├── tests/                    e2e/ (Playwright) + unit tests
├── docs/                     this documentation tree
├── .github/workflows/        ci.yml, db-backup.yml
├── AGENTS.md / CLAUDE.md      contributor + agent operating rules
├── package.json, tsconfig.json, postcss.config.mjs, eslint.config.mjs
```

### `src/` layout
| Folder | Contains | Rule of thumb |
|---|---|---|
| `app/` | App Router routes (admin, portals, `api/`, public) + `layout.tsx`, `globals.css` | Route + page UI |
| `actions/` | **Server Actions** — business logic (78 modules), `"use server"`, return `Result<T>` | All reads/writes go here |
| `components/` | React components (`layout/`, `landing/`, `dashboard/`, feature UIs) | Presentational + interactive UI |
| `context/` | React providers (`ThemeContext`, `InstitutionContext`, `SidebarContext`) | Cross-tree state |
| `hooks/` | Shared client hooks | Reusable client logic |
| `lib/` | Pure helpers + service seams (`email`, `sms`, `whatsapp`, `scheduler`, `auditLog`, `knowledgeAI`, engines) | No request/response objects; pure-ish utilities |
| `utils/supabase/` | `client`, `server`, `admin`, `middleware` client factories | Pick the right client (see below) |
| `types/` | Shared TypeScript types | Cross-module types |
| `proxy.ts` | Edge middleware entrypoint (`updateSession`) | Auth/routing/fencing |

### Choosing a Supabase client
- **Browser/client component** → `utils/supabase/client.ts` (anon key, RLS).
- **Server component / Server Action** → `utils/supabase/server.ts` (cookie session, RLS).
- **Privileged server-only** (webhooks, seeding, demo reset) → `utils/supabase/admin.ts` (service role, **bypasses RLS**, never client).

### Where new code goes
- A new feature module → a `src/actions/<feature>.ts` (logic) + `src/app/.../page.tsx` (route) + components.
- Anything generic (auth, notifications, file upload, approvals, audit, reporting) → route through the existing `lib/` seam; design it product-agnostic (future `@aura/*` package). See the decision guardrails in [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md) §6.

## Future Roadmap

- Migrate to the `apps/ + packages/ + services/` monorepo layout ([Architecture Overview](../architecture/Architecture Overview.md)).

## Related Documents

- [Architecture Overview](../architecture/Architecture Overview.md) · [Coding Standards](Coding Standards.md) · [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md)

## Last Updated

2026-06-29

## Owner

Platform Engineering
