# AURA Testing Guide (Arch A2)

Two layers, both required from **Phase 3 onward** (Dev Rule 18):

| Layer | Tool | Tests | Run |
|-------|------|-------|-----|
| Unit / logic | **Vitest** | Pure functions — calculation/aggregation engines, lib helpers | `npm test` |
| End-to-end | **Playwright** | Route-crawl smoke + user flows in a real browser | `npm run test:e2e` |
| Types | **tsc** | Whole-project type check | `npm run typecheck` |

## Commands

```bash
npm test            # vitest run — all unit tests once
npm run test:watch  # vitest watch mode while developing
npm run test:e2e    # playwright (first run: npx playwright install chromium)
npm run typecheck   # tsc --noEmit
```

## Unit tests (Vitest)

- Live in `tests/unit/**/*.test.ts`. Node environment by default; add
  `// @vitest-environment jsdom` at the top of a file to test a React component.
- Import with the `@/` alias exactly like app code (configured in `vitest.config.ts`).
- **What to test:** the *pure logic* — not Supabase round-trips. The codebase
  deliberately isolates calculation policy into pure modules so it's testable
  without mocking the DB:
  - `src/lib/ciaEngine.ts` → `tests/unit/ciaEngine.test.ts`
  - `src/lib/coPoEngine.ts` → `tests/unit/coPoEngine.test.ts`
  - `src/lib/roleLabel.ts` → `tests/unit/roleLabel.test.ts`
- **Convention for new Server Actions (Dev Rule 18):** extract any
  non-trivial calculation/decision into a pure helper (in `src/lib/` or an
  exported function) and unit-test that helper. Thin DB wrappers with no logic
  don't need a unit test — cover them via the e2e flow instead.

## E2E tests (Playwright)

- Live in `tests/e2e/**/*.spec.ts`. Config reuses a running `npm run dev` on
  `:3000`, or starts one (`reuseExistingServer: true`).
- First run downloads the browser: `npx playwright install chromium`.
- The committed `smoke.spec.ts` covers **public** routes (`/login`,
  `/privacy-policy`) — loads without an uncaught `pageerror`. This is the seed
  of the full **route-crawl**: as authenticated routes are added, assert no
  runtime crash on every page (catches null/undefined-data bugs cheaply).

### Authenticated routes (storageState pattern)

Authenticated crawl + flows need a logged-in session. The intended setup (add
when first needed):

1. A `tests/e2e/global-setup.ts` that logs in a seeded test user once and saves
   `storageState` to `tests/e2e/.auth/<role>.json`.
2. Per-role projects in `playwright.config.ts` that load the matching
   `storageState`, so tests start already authenticated.
3. Seeded, disposable test accounts per role (admin / staff / student) — never
   real institution data.

### Priority e2e flows (Arch A2 backlog)

- student login → view attendance
- admin → add fee → student pays → verify status
- route-crawl over every `/institutions/[id]/...`, `/staff-portal/...`,
  `/student-portal/...` page

## Definition of Done (Phase 3+)

Every PR that adds a Server Action or page must:
1. `npm run typecheck` — passes
2. `npm test` — passes (new pure logic has a unit test)
3. New page added to the route-crawl; new user-facing flow has an e2e test
