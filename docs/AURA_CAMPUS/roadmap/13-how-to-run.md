[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** N/A — local environment setup reference.
> **Feeds into:** N/A — consult whenever running the full stack locally (Phase 8 adds the third terminal for the mobile app).

Important Document!!!!

---

## 🏃 How to Run Full Stack Locally

```bash
# Terminal 1 — Next.js Frontend
npm run dev

# Terminal 2 — Python Scheduler Engine
cd aura-scheduler-engine
.\venv\Scripts\activate      # Windows
source venv/bin/activate     # Mac/Linux
uvicorn main:app --reload

# Terminal 3 — Mobile App (Phase 8 — directory created in Step 8A)
# Note: Run 'npx create-expo-app aura-mobile' in Step 8A first
cd aura-mobile
npx expo start
```

---

## 🧪 Running the Tests

```bash
# Unit tests (Vitest — pure logic, no DB or server needed)
npm test

# Public smoke e2e (no auth, no seed needed)
npm run test:e2e:public
```

### Authenticated e2e (Arch A2 — route-crawl, flows, isolation)

The authenticated suite logs in as each seeded role and hits every route, so it
needs the seeded test tenants **and** a running app. Two `.env.local` prerequisites:

- `SUPABASE_SERVICE_ROLE_KEY` — the seeder uses it to create the test users.
- `NEXT_PUBLIC_SUPABASE_URL` — must be the **project URL**
  (`https://<ref>.supabase.co`), *not* a key. It is inlined at **build time**, so
  a wrong value makes every page 500.

Run it against a **production build**, not `next dev` — dev recompiles into
`.next` and will clobber a running server mid-crawl:

```bash
# 1. Seed the e2e tenants (2 institutions, 6 role logins + one row per detail route).
#    Idempotent + namespaced (@e2e.aura.test / e2e-college-*) — safe to re-run.
npm run seed:e2e

# 2. Build + start the app (Terminal A)
npm run build
npm run start

# 3. Run the authenticated crawl (Terminal B — reuses the running server on :3000)
npm run test:e2e -- --project=authed
```

Saved login sessions and the seed id manifest land in `tests/e2e/.auth/`
(gitignored). The `setup` Playwright project regenerates the sessions
automatically before the `authed` project runs.
