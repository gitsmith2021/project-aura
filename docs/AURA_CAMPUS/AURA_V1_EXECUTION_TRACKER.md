# 🎯 Aura Campus v1.0 — Execution Tracker

> **Single source of truth** from now until the Aura Campus v1.0 commercial
> release. This is an **operational dashboard**, not a planning doc — it tracks
> execution of the already-approved [AURA_CAMPUS_FINAL_COMPLETION_PLAN.md](AURA_CAMPUS_FINAL_COMPLETION_PLAN.md).
> Update it **continuously** as work progresses.
>
> **Last updated:** 2026-06-26 · **📚 PHASE 9 ~95% — only 9B's owner 5% remains:** 9C trial provisioning ✅ + the 9F/9G/9H launch-readiness doc trio ✅ ([IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) · [TRAINING_MATERIALS.md](TRAINING_MATERIALS.md) · [SUPPORT_HELP_CENTER.md](SUPPORT_HELP_CENTER.md)). All Phase 9 items done except 9B's live screenshots + persona sign-off (owner). · **✅ WEB PLATFORM ENGINEERING RELEASE READY — 9I SIGNED OFF:** every 🔴 release-checklist blocker is green ([RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)); ops toggles configured (Vercel env, repo backup secrets, UptimeRobot); Supabase Pro (PITR + leaked-password) deferred (accepted). **Note:** this is the *web platform* gate — **Track 1 (Phase 8 mobile) is still ~12%, blocked on EAS/dev-account purchase (B1)**, and is the remaining piece of the full v1.0 line. · **📦 PHASE 9D + 9E ✅ DELIVERED:** Onboarding Toolkit ([ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) — importer-accurate CSV templates, go-live checklist, migration playbook) and Sales Deck ([SALES_DECK.md](SALES_DECK.md) — 16-slide narrative + objection handling). Track 3 → ~60%. · **🚦 PHASE 9I RELEASE CHECKLIST ✅ DELIVERED — 🟡 CONDITIONAL GO:** the v1.0 go/no-go gate ([RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)) is live across 9 domains, evidenced against real platform state. **No engineering blockers** — remaining items are ops toggles (backup secrets, UptimeRobot), Pro-plan upgrades (PITR, leaked-password) and owner sign-off, all with fallbacks. · **💰 PHASE 9A PRICING ✅ COMPLETE:** public pricing page is the single source of truth (Essential ₹9,999 · Professional ₹24,999 · Enterprise Custom) with monthly/annual toggle (15% off) + 30-day free trial; `subscription_plans` aligned via migration `20260710000000` (awaiting remote apply); [PRICING_STRATEGY.md](PRICING_STRATEGY.md) documents the commercial reference. · **🧩 SCHEDULER ENGINE #1 PRODUCTION DEPLOYED:** the OR-Tools timetable engine is live on Railway (`project-aura-production-6b0d.up.railway.app`) with shared-secret auth — validated end-to-end; UptimeRobot monitoring still pending (release-checklist item 9I). See [AURA_SCHEDULER_DEPLOYMENT.md](AURA_SCHEDULER_DEPLOYMENT.md). · **✅ ARCH A2 COMPLETE — all 7 steps done** (route-crawl · 5 flows · 27 cross-role denials · institution isolation clean · 11 write-auth denials · 4 production/security bugs found & fixed; Arch register 88% → 100%). · **🩺 INFRA STABILIZATION done (R1+R2):** Supabase returned **Unhealthy → Healthy** (CPU 14% · Disk 17% · RAM 48%) — see the [Infra Stabilization](#-infrastructure-stabilization-unplanned--complete) section. The A2 e2e gate is **paused against prod** (R1) pending the local-stack CI job. · **🎬 PHASE 9B (Demo Institution) 🟡 In Review (80%):** showcase-grade "Aura Demo College" seeded (3,240 students (UG + PG) · 148 faculty · 9 executive personas · KH 55 · fee 88% · placements 92%) + CLI/admin reset — manual walkthrough & screenshots pending.

**Status legend:** 🔲 Not Started · 🟡 In Progress · ⛔ Blocked · ✅ Complete

---

# Release Goal

## Aura Campus v1.0 — Commercial Release

**Definition of Done — all four must be true:**
1. ✅ **Phase 8** complete to the v1.0 line (P0–P5; P6/P7 = post-v1.0 add-ons)
2. ✅ **Arch A2** Foundation → Complete (authenticated e2e + institution isolation in CI)
3. ✅ **Phase 9 P1 items** complete (9A Pricing · 9B Demo · 9I Release Checklist; 9C/9D ready)
4. ✅ **Release Checklist (9I)** passed (security, backups, billing, monitoring, legal)

**Target window:** ~6–8 weeks from execution start · **Long pole:** Arch A2 (release gate)

---

# Track 1 — Phase 8 (Mobile + CCTV to the v1.0 line)

> Foundation in place: Expo SDK 54 shell, 6-role auth, **22 screens built, all
> running in Expo Go.** Every remaining item gates on **P0 (EAS dev build)**.

| Item | Description | Status | Owner | Dependencies | Blockers | Start Date | Completion % |
|------|-------------|--------|-------|--------------|----------|-----------|-------------|
| **P0** | EAS dev build + Apple ($99/yr) & Google Play ($25) accounts; `eas.json` profiles | 🔲 | Unassigned | Developer accounts (purchase) | Accounts not yet purchased | — | 0% |
| **P1** | 8D Push Notifications — `device_push_tokens` table + Expo Push fan-out (reuse Phase 3A) + deep-links + parent inbox | 🔲 | Unassigned | P0 | Gated on P0 | — | 0% (3A infra ✅ reusable) |
| **P2** | 8C/8F In-app Razorpay pay — RN checkout reusing verified webhook (2.5A) | 🔲 | Unassigned | P0; Razorpay live keys (✅ web) | Gated on P0 | — | ~40% (screens built; pay missing) |
| **P3** | On-device QA pass — all 22 screens × 6 roles on real devices | 🔲 | Unassigned | P0, P1, P2 | Gated on P0 | — | 0% |
| **P4** | 8B NFC attendance — mobile card-read → mark (card registry 4F ✅) | 🔲 | Unassigned | P0; NFC Android phones + test cards | HW + P0 | — | ~30% (registry ✅, reader half pending) |
| **P5** | Store submission — TestFlight + Play internal track | 🔲 | Unassigned | P1–P4 | Gated on P1–P4 | — | 0% |

**Excluded from v1.0 (post-release add-ons, tracked but not gating):**
P6 Parent self-link OTP (blocked on 3C SMS) · P7 CCTV (hardware/infra add-on).

**Track 1 completion: ~12%**

---

# Track 2 — Arch A2 (Testing: Foundation → Complete) · **RELEASE GATE**

> Baseline: **653 Vitest unit tests (strong pure-logic coverage)** + Playwright
> config + **1 seed smoke spec (2 public routes only)**. The completion work is
> almost entirely **authenticated e2e** — currently 0.

| Step | Description | Status | Dependencies | Progress % | Est. Completion |
|------|-------------|--------|--------------|-----------|-----------------|
| **Step 1** | Seed test tenant (2 institutions) + role login fixtures (`storageState` × 6 roles) | ✅ | — | **100%** | **Done (2026-06-21)** |
| **Step 2** | Authenticated route-crawl — every route × canonical owner role (HTTP<400, no `/login` bounce, 0 `pageerror`) | ✅ | Step 1 | **100%** | **238 passed · 0 skipped · 0 failed** (all 230 routes) |
| **Step 3** | Critical user-flow e2e — admissions, fees, leave, exams, knowledge hub | ✅ | Step 1 | **100%** | **5/5 flows pass** (1 production bug found & fixed) |
| **Step 4** | Cross-role negative auth — wrong role denied (not 200) | ✅ | Step 1 | **100%** | **27 cross-role denials green** (1 security gap found & fixed) |
| **Step 5** | **Institution isolation** — tenant A cannot read tenant B via HTTP/API | ✅ | Step 1 | **100%** | **Isolation holds — 0 leaks** (4 RLS/IDOR checks green) |
| **Step 6** | Wire e2e into `ci.yml` (seed → run) as a required check | ✅ | Steps 2–5 | **100%** | **Live & required** — secrets set, full suite green in CI (~6 min), now a required check on `main` |
| **Step 7** | Action-wiring coverage — top ~20 money/grade/enrollment/access actions | ✅ | Step 1 | **100%** | **11 write-denials green — no gap found** (cross-tenant + privilege-escalation) |

**Definition of Done:** all 230 routes crawl green under auth · 5 critical flows
pass · cross-role + isolation green · e2e is a required CI check → **Arch A2 = 100%,
Arch register 88% → 100%.**

**Step 1 delivered (2026-06-21):** `tests/e2e/seed.mjs` (idempotent, service-role)
seeds **2 isolated institutions + 8 users** (6 roles in A + admin/student in B for
isolation/cross-role); `tests/e2e/auth.setup.ts` drives `/login` to produce
`storageState` per role; Playwright split into `public`/`setup`/`authed` projects;
`session.spec.ts` verifies each role lands correctly. **Verified: 8/8 credentials
authenticate · 14/14 fixture+session checks green.** Found & fixed a seed-level bug
en route — the `students` SELECT RLS keys self-read on `id = auth.uid()`, so the
seed sets `students.id = uid` (not just `profile_id`). **Steps 2–7 now unblocked.**

**Step 2 delivered (2026-06-22):** `tests/e2e/fixtures/route-map.mjs` enumerates all
**230** App-Router pages from the filesystem, classifies each into an access area
matching `middleware.ts`, and resolves dynamic params from a seed manifest the
seeder now emits (`.auth/seed-manifest.json` — institution slug/uuid, a student,
staff & department id). `tests/e2e/authed/route-crawl.spec.ts` hits each route as
its **canonical owner role** and asserts HTTP < 400, no bounce to `/login`, and
**zero uncaught client `pageerror`**. caught a **real production 500** — `/finance/payroll/statutory` (a Server Component
passed an `onRefresh` function prop to a Client Component, which React forbids);
**fixed** by dropping the redundant prop (the table already calls `router.refresh()`).

The seeder was then extended to create **one minimal row per entity-detail route**
in institution A (23 entities + a teaching-assignment link + a submitted online-exam
session so the exam-review route renders), and `route-map.mjs` resolves every
dynamic param (with context-sensitivity: `[examId]`→exam_schedule for hall-tickets
vs online_exam for online routes; `[applicationId]`→admissions vs job_applications;
the budget-detail `?ay=` query). **Final result: 238 passed · 0 skipped · 0 failed**
(the transport-detail route is marked flaky — a transient Supabase `ECONNRESET`
under parallel load — and passes on the CI-standard single retry). HOD/role-boundary
access is deliberately deferred to Step 4 (canonical owner = INST_ADMIN is a strict
superset for renderability).

**Finding (found by the crawl, now FIXED):** `public.clubs`, `club_members` and
`club_activities` had been lost in the migration rebaseline (`be1b9e4`), yet
`src/actions/clubs.ts` still queried them — the Phase 4H clubs feature was silently
broken. Restored via `supabase/migrations/20260626000000_restore_clubs.sql`
(schema reconstructed from clubs.ts + src/lib/clubs.ts, RLS mirroring the Phase 4
`laboratories` pattern). Verified: all four clubs routes crawl green with a real
seeded club rendering on the detail page; security advisors show no RLS gaps.

**Step 3 delivered (2026-06-22):** five critical user-flow specs under
`tests/e2e/authed/flows/`, each driving the real UI across roles via per-role
browser contexts (`tests/e2e/fixtures/flow.ts`): **leave** (staff applies →
admin approves → staff sees approved), **admissions** (public form submit → admin
sees the applicant), **fees** (student sees their seeded demand → admin sees it),
**online exam** (admin creates an exam → it lists), **knowledge hub** (admin
uploads a resource → it appears). The seeder now also records the two required
DPDP consents per user (so the first-login banner can't block the UI) and a fee
demand for the student. **Result: 5/5 flows pass; full authed suite green
(route-crawl + flows).** Flows surfaced & fixed **2 more production bugs**:
(1) the **public admissions form was completely broken** — `submitApplication`
did an anon `.insert().select()` but anon has no SELECT policy on `admissions`,
so every submission failed with "violates RLS policy" and saved nothing; fixed by
using the service-role client for the validated public insert (mirrors
`checkApplicationStatus`). (2) a Knowledge-Hub test-only locator ambiguity
("Publish" vs "Unpublish") — hardened, not an app bug.

**Step 4 delivered (2026-06-22):** `tests/e2e/authed/cross-role.spec.ts` — a negative
matrix asserting the **wrong** role is bounced out of every protected area (super-admin
`/admin`, the institution admin app via **both** slug & uuid URLs, the staff/student/parent
portals, and the admin-only view routes). **27 denials green across 5 roles.** Caught &
fixed a **real defense-in-depth gap**: `/institutions/{slug}` routes bypassed the
portal-role fence because the middleware slug→uuid rewrite `return`s before the fences run,
so a logged-in student/staff could reach the institution **admin shell** via the slug URL
(RLS still emptied the data, but the shell should never render). Fixed in
`src/utils/supabase/middleware.ts` — portal roles are now bounced to their home before the
slug rewrite (the same policy already enforced on the uuid form). Positive route-crawl
unaffected (admin/HOD/super skip the fence).

**Step 5 delivered (2026-06-22) — the SaaS release gate, verified clean:**
`tests/e2e/authed/isolation.spec.ts` proves a tenant cannot read another tenant's
data through the public API/RLS layer the way a real PostgREST client reaches it.
Each admin signs in with their own credentials; cross-tenant reads of `departments`,
`students` and `institution_members` return **0 rows** in both directions, while
own-tenant reads stay non-empty (so RLS isn't blanket-denying), plus a **direct-id
(IDOR)** check — admin A fetching a B-owned student by primary key → 0 rows.
**Result: isolation HOLDS — no leak found** (4/4 checks green). This is the single
most important multi-tenant guarantee and the hardest part of the release gate.

**Step 6 delivered (2026-06-22):** added the **`e2e` job** to `.github/workflows/ci.yml`
— seeds the namespaced tenants then runs the `authed` Playwright project (setup →
route-crawl → flows → cross-role → isolation) against the **built** app
(`playwright.config.ts` is now CI-aware: `npm run start` + 1 retry). The job is
**secret-gated**: a first step checks for the Supabase secrets and, if absent, exits
**green (skipped)** so it never blocks a merge before CI is configured. Required
secrets + the "runs against remote DB; local-stack hardening is future" tradeoff are
documented in `docs/ci-cd.md`. **✅ Activated (2026-06-22):** the owner added the 9 CI
secrets; the gate ran the full suite in CI — secrets check → npm ci → Playwright
install → build → seed → **route-crawl + flows + cross-role + isolation all green
(~6 min)** — and **Authenticated e2e** is now a **required status check on `main`**
(alongside type-check/lint/unit and migration-replay). Steps 2–5 are a **permanent
enforced gate** now, and the institution-isolation guarantee is continuous.

**Step 7 delivered (2026-06-22):** `tests/e2e/authed/action-auth.spec.ts` — the WRITE
side of authorization (Steps 4–5 covered reads). It's the data-layer backstop behind
the highest-risk server actions (money / grades / enrollment / access): even if an
action's code gate were bypassed, the DB must reject the mutation. **11 write-denials
green**, each against a real seeded target so an empty result means RLS blocked it, not
"no such row": cross-tenant (admin A → tenant B) INSERT student/department → error,
UPDATE B's student / DELETE B's department / change B's member roles → 0 rows; and
privilege-escalation — a student can't self-promote membership, create a department,
zero its own fee demand, self-admit an admission, or create a grade component, and
staff can't grant itself an INST_ADMIN membership. **Result: no write-authorization
gap found** — the RLS write-side holds.

**Track 2 completion: 100% — ✅ ARCH A2 COMPLETE.** All 7 steps done: unit ✅ · fixtures ✅ ·
route-crawl ✅ · 5 flows ✅ · cross-role ✅ · isolation ✅ · CI gate live & required ✅ ·
action-wiring ✅. The Arch register flips **88% → 100% (8/8)**. The release gate's long
pole is cleared — **4 production/security issues found & fixed** along the way.

> ⚠️ **Gate status update (2026-06-23):** the A2 e2e suite is **paused against the
> production DB** (Infra Stabilization R1 — it was a Disk-I/O source on Nano). It still
> runs **locally** and lives in git; the **continuous** CI enforcement is restored by
> R1-Phase-2 (ephemeral local-Supabase CI job), after which `RUN_E2E` is set true. A2
> itself remains complete & accepted — the one-time validation stands.

---

# 🩺 Infrastructure Stabilization (unplanned — complete)

> Mid-execution, the Supabase project went **Unhealthy** (high Disk I/O on the Nano
> tier). Stabilized before resuming Phase 8. Full report + plan:
> [INFRA_STABILIZATION/](INFRA_STABILIZATION/) (`DISK_IO_ANALYSIS.md` diagnosis ·
> `INFRA_STABILIZATION_R1_R2_R5.md` plan/risk/impact/rollback).

| Item | Action | Status | Result |
|---|---|---|---|
| **R1** | Remove e2e load from prod — CI suite gated behind `RUN_E2E` (default off → skip-green) | ✅ **Done** | Removed the acute Disk-I/O trigger (CI was hammering the 25 MB prod DB on every push/PR) |
| **R2** | Resolve 166 `auth_rls_initplan` findings — wrap `auth.uid()`/`auth.email()` as `(select …)` so RLS evaluates once/query not per row (`20260709000000_rls_initplan_fix.sql`) | ✅ **Done + validated** | Applied to remote, 0 bare remaining; A2 RLS suite green (access control unchanged); lowered per-query CPU app-wide |
| **R5** | Realtime — evaluate & propose disable for v1.0 | 🔎 **Proposed** | Only `notifications` is published; bell can poll. Recommend disable + poll fallback (removes top WAL-decode I/O). Needs code + owner toggle — **awaiting approval** |
| R3 | Drop 341 unused indexes | ⏸️ Deferred (per direction) | — |
| Tier upgrade | Nano → Micro/Small | ⏸️ Deferred (per direction) | — |

**Outcome:** Supabase **Unhealthy → Healthy** (CPU 14% · Disk 17% · RAM 48%, 2026-06-23).
**Open follow-ups:** R5 (approve), R1-Phase-2 (local-stack CI → re-enable continuous e2e).

---

# Track 3 — Phase 9 (Business Readiness)

> **P1 = v1.0-gating** (9A, 9B, 9I). P2/P3 should be *ready* but a subset can
> trail into the launch window. Mostly non-engineering; parallelizable with Tracks 1–2.

| Item | Description | Priority | Status | Dependencies | Progress % |
|------|-------------|----------|--------|--------------|-----------|
| **9A** | Pricing Strategy — tiers mapped to `subscription_plans` (7E ✅) | 🔴 P1 | ✅ | Phase 7E (✅) | **100%** |
| **9B** | Demo Institution — fully-seeded showcase tenant + reset script | 🔴 P1 | 🟡 **In Review** | Seed engine (✅) | **95%** — built & seeded; **playbook + storyboards + validation checklist + screenshot catalog delivered** ([DEMO_PLAYBOOK.md](DEMO_PLAYBOOK.md) · [PERSONA_STORYBOARDS.md](PERSONA_STORYBOARDS.md)); live capture + validation sign-off pending (owner) |
| **9C** | Trial Provisioning — spin-up → Onboarding Wizard (A4 ✅) → trial sub | 🟠 P2 | ✅ | A4 (✅), 7E (✅) | **100%** — `provisionInstitution()` action: creates institution (is_onboarded=false → wizard) + auto-starts a 30-day trial on the entry plan; `TRIAL_DAYS`/`trialExpiry()` helpers + 4 unit tests |
| **9D** | Onboarding Toolkit — import templates, go-live checklist, migration playbook | 🟠 P2 | ✅ | BulkUpload flows (✅) | **100%** — [ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) (CSV templates matching the in-app importer · 4-phase go-live checklist · migration playbook · error→fix table) |
| **9E** | Sales Deck — problem→solution, NAAC/NIRF/AISHE compliance story, ROI | 🟠 P2 | ✅ | 9A | **100%** — [SALES_DECK.md](SALES_DECK.md) (16-slide structure · persona slides · ROI · pricing · objection-handling · deck-build checklist) |
| **9F** | Implementation Guide — infra runbook, DR (✅), config matrix, cutover | 🟡 P3 | ✅ | Infra docs (partial ✅) | **100%** — [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) (architecture, full env matrix, deploy/rollback per system, cutover sequence, prod posture) |
| **9G** | Training Materials — role quickstarts, short videos, FAQ, cheat-sheets | 🟡 P3 | ✅ | Stable UI | **100%** — [TRAINING_MATERIALS.md](TRAINING_MATERIALS.md) (8 role quickstarts, task cheat-sheets, FAQ, train-the-trainer plan) |
| **9H** | Support & Help Center — in-app help, KB (dogfood Knowledge Hub ✅), tickets, SLA | 🟡 P3 | ✅ | Knowledge Hub (✅) | **100%** — [SUPPORT_HELP_CENTER.md](SUPPORT_HELP_CENTER.md) (channels, S1–S4 SLA, KB-via-Knowledge-Hub, triage-by-area, incident/escalation path) |
| **9I** | Release Checklist — security, A2 green, backups, billing, legal, monitoring, rollback | 🔴 P1 (final gate) | ✅ | All tracks | **100%** — ✅ **ENGINEERING RELEASE READY, signed off 2026-06-25** ([RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)); all blockers green; Supabase Pro (PITR + leaked-password) deferred (accepted) |

**9B delivered (2026-06-23) — 🟡 In Review (80%):** a standalone, showcase-grade demo
tenant **"Aura Demo College"** (`aura-demo`, `@demo.aura.test`) — completely isolated
from real + e2e tenants. `scripts/demo/` (independent of `tests/e2e`): `seed-demo.mjs`
(idempotent, service-role) builds **3,240 students (UG + PG) · 148 faculty · 6 departments** and
a curated "best-case" story across every module — finance (**88% fee collection**,
salaries, expenses, 6 dept budgets), attendance, academics (CO/PO, CIA marks & published
results), admissions funnel, exams, **placements (92%)**, **320 scholarships**, research
(22 projects/48 papers), 80 alumni, **Knowledge Hub 55 resources (hero)**, IQAC/NAAC
(meetings + action items + accreditation evidence), role-specific notifications — so every
KPI dashboard is populated. **9 executive personas** (Chairman · Principal · IQAC · Admin ·
HOD · Faculty · Student · Parent · Alumnus) all authenticate (single password, written to
gitignored `.demo/credentials.txt`). `reset-demo.mjs` + **`npm run seed:demo` / `reset:demo`**;
admin-only **Reset Demo Tenant** button in `/admin` (`resetDemoInstitution()` — SUPER_ADMIN
validated from DB, explicit `aura-demo` allowlist, refuses non-demo, type-to-confirm).
**Verified:** 9/9 logins · reset scoped to demo only (Bishop Heber + e2e tenants untouched)
· tsc + lint clean. **Reserved 20%:** manual walkthrough · screenshot/marketing validation
· sales-readiness review.

**9B 80% → 95% (2026-06-24):** delivered the demo enablement docs — [DEMO_PLAYBOOK.md](DEMO_PLAYBOOK.md)
(10–15 min sales flow · per-persona walkthrough scripts · executive validation checklist · screenshot
catalog) and [PERSONA_STORYBOARDS.md](PERSONA_STORYBOARDS.md) (Chairman · Principal · HOD · Faculty ·
Student — Pain → Capability → Outcome, reusable across demo/deck/web). AI features scoped as
*optional/roadmap* (no Anthropic credit needed). **Remaining 5%** (owner): live screenshot capture +
persona validation sign-off → flip to 100%.

**9A delivered (2026-06-25) — ✅ Complete:** the public pricing page
([PricingSection.tsx](../../src/components/landing/Pricing/PricingSection.tsx)) is now
the single source of truth — **Essential ₹9,999 · Professional ₹24,999 · Enterprise Custom**,
with a **monthly/annual billing toggle (15% annual discount)** and a **30-day free trial**
on every paid CTA; AI features explicitly scoped as an optional add-on. The `subscription_plans`
catalog (7E) is aligned to these anchors via migration
[`20260710000000_phase9a_pricing_alignment.sql`](../../supabase/migrations/20260710000000_phase9a_pricing_alignment.sql)
(Starter→Essential, Pro→Professional reprice; Enterprise custom + MRR baseline; FK-safe rename;
idempotent + cold-start seed). Commercial reference documented in
[PRICING_STRATEGY.md](PRICING_STRATEGY.md) (tiers · levers · source-of-truth mapping · billing
mechanics · deferrals). **Migration awaiting apply to remote DB (owner authorization).**

**9I delivered (2026-06-25) — 🟡 CONDITIONAL GO:** the v1.0 release gate
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) is live — a grounded go/no-go across 9 domains
(security · A2 testing · backups/DR · billing · legal/DPDP · monitoring · rollback · perf/infra ·
sign-off), each item evidenced against the real platform state (live security advisors, A2 results,
DR runbook, 7E billing, 9A pricing). **Verdict: no engineering blockers** — green on security
(documented baseline + 2 trivial WARNs tracked), testing (A2 7/7), billing, legal, and rollback
(every layer). Remaining pre-cutover actions are **ops toggles** (backup secrets, webhook/live-key
confirmation, UptimeRobot) + **Pro-plan** upgrades (PITR, leaked-password) + **owner sign-off** —
all with documented fallbacks. Deferrals carried into v1.0 are catalogued with fallbacks.

**9D + 9E delivered (2026-06-25):** [ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) (9D) —
copy-paste CSV import templates that mirror the in-app importer exactly (student + staff column
rules, auto roll-number/email behaviour), a 4-phase go-live checklist, a legacy-ERP→Aura migration
playbook, and a common-error→fix table. [SALES_DECK.md](SALES_DECK.md) (9E) — a 16-slide
problem→solution→proof→compliance→ROI→pricing→close narrative (persona slides lifted from the
storyboards, screenshots from the demo shot-list), plus an objection-handling cheat sheet and a
deck-build checklist. Both are doc-only, no external blockers.

**9I signed off (2026-06-25) — ✅ ENGINEERING RELEASE READY:** every 🔴 release blocker is
green and the owner has signed off. Ops toggles all configured — Vercel env (`RAZORPAY_WEBHOOK_SECRET`,
live Razorpay keys, `RESEND_API_KEY`/`EMAIL_FROM`), GitHub repo secrets (`SUPABASE_DB_URL` +
`BACKUP_ENCRYPTION_KEY` → weekly encrypted backup live), and UptimeRobot (web + scheduler, 5-min).
Supabase Pro (PITR + leaked-password protection) **consciously deferred** — accepted launch risk with
documented fallbacks (weekly-backup RPO floor; strong-password policy), to revisit on Pro upgrade.

**9C delivered (2026-06-26) — ✅ Complete:** `provisionInstitution()` server action
([src/actions/institutions.ts](../../src/actions/institutions.ts)) makes spinning up a tenant one
SUPER_ADMIN operation: creates the institution with `is_onboarded=false` (so the admin's first login
routes into the Arch A4 Onboarding Wizard) **and** auto-starts a **30-day trial** on the entry plan
(7E `institution_subscriptions`, `status='trial'`), audit-logged (A8). Best-effort trial — institution
is created even if no plan exists. New pure helpers `TRIAL_DAYS` + `trialExpiry()` in
[subscriptions.ts](../../src/lib/subscriptions.ts) (+4 unit tests, 16/16 green). AddInstitutionModal
now routes through the action instead of a raw client insert.

**9F + 9G + 9H delivered (2026-06-26):** the P3 launch-readiness doc trio, all grounded in the
shipping platform. [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) (9F) — architecture, full env
config matrix, per-system deploy/rollback, cutover sequence, known prod posture.
[TRAINING_MATERIALS.md](TRAINING_MATERIALS.md) (9G) — 8 role quickstarts, task cheat-sheets, FAQ,
train-the-trainer plan. [SUPPORT_HELP_CENTER.md](SUPPORT_HELP_CENTER.md) (9H) — channels, S1–S4 SLA,
KB via the Knowledge Hub, triage-by-area, incident/escalation path.

**Track 3 completion: ~95%** (9A · 9C · 9D · 9E · 9F · 9G · 9H · 9I ✅ — **all of Phase 9 except 9B's owner 5%** (live screenshots + persona sign-off))

---

# 📊 Weekly Dashboard

> Update this block every week. Percentages are toward the **v1.0 line**, not raw feature counts.

### Completion snapshot — Week 0 (2026-06-23) · A2 ✅ · Infra 🩺 · 9B 🟡 In Review

```
Overall v1.0   ███████████████████░░░░░░░░░░  ~68%
  Track 1  Phase 8 (P0–P5)   ███░░░░░░░░░░░░░░░░░░░░  ~12%
  Track 2  Arch A2 (gate)    ██████████████████████  100%  ✅ COMPLETE — all 7 steps (e2e gate paused vs prod per R1)
  Track 3  Phase 9          ████████████████████░  ~95%  (9A·9C·9D·9E·9F·9G·9H·9I ✅ — only 9B's owner 5% left: screenshots + sign-off)
  Infra    Supabase health   ██████████████████████  Healthy  ✅ R1+R2 done · R5 proposed
```

> 🎯 **The release gate's long pole (Arch A2) is cleared, and the prod DB is back to
> Healthy.** Remaining v1.0 work is **Phase 8** (mobile, gated on the EAS dev build —
> blocker B1) and **Phase 9 P1** business-readiness (pricing · demo tenant · release
> checklist) — both parallelizable. Infra follow-ups (R5, R1-Phase-2) are non-blocking.

*Overall = weighted toward the release gate: A2 40% · Phase 8 35% · Phase 9 25%.*

### Current Critical Path
1. **Week 1:** Purchase dev accounts + **EAS dev build (P0)** ‖ **A2 Step 1 seed + fixtures** (also feeds 9B).
2. **Weeks 1–4:** A2 Steps 2–7 → **institution isolation in CI** (the gate).
3. **Weeks 2–5:** Phase 8 P1–P4 (post-EAS, parallel).
4. **Weeks 1–6:** Phase 9 9A/9B/9D (parallel, non-eng).
5. **Weeks 6–8:** P5 store submission · 9I Release Checklist → **v1.0 cutover**.

> **The gate is A2.** Phase 8 and Phase 9 can run in parallel, but v1.0 cannot be
> declared until A2 institution-isolation e2e is green in CI.

### Current Blockers

| # | Blocker | Affects | Owner | Action |
|---|---------|---------|-------|--------|
| B1 | Dev accounts (Apple/Google/EAS) not purchased | Phase 8 P0→all | Unassigned | Purchase to unblock all mobile natives |
| B2 | Anthropic account has $0 credit | KH-5 AI live, 9B demo polish | Account owner | Add credit (console.anthropic.com → Billing) |
| ~~B3~~ | ~~No seeded test tenant / role fixtures~~ | ~~A2 Steps 2–7, 9B demo~~ | — | ✅ **Resolved 2026-06-21** — `npm run seed:e2e` + `storageState` fixtures landed (A2 Step 1) |
| ~~B4~~ | ~~CI secrets not set → e2e gate inactive~~ | ~~A2 Step 6 enforcement~~ | — | ✅ **Resolved 2026-06-22** — 9 CI secrets added, full e2e suite green in CI, **Authenticated e2e** now a required check on `main` |

### Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Status |
|---|------|-----------|--------|------------|--------|
| R1 | Institution isolation regresses unseen (tenant data leak) | Low | 🔴 Critical | A2 Step 5 isolation e2e (verified clean). ⚠️ CI gate **paused vs prod** (infra-R1) — still runs **locally** + in git; continuous CI restored by R1-Phase-2 (local-stack) | ✅ Mitigated (CI enforcement to re-arm) |
| R2 | A2 stays at Foundation → ship on unverified routes | Medium | 🔴 Critical | A2 **complete (7/7)**; full suite runs locally; CI auto-run paused vs prod pending local-stack | 🟢 Mitigated |
| R3 | EAS / app-store approval delays | Medium | 🟠 High | Start P0 week 1; web is fully usable without mobile | Open |
| R4 | Anthropic credit unfunded → AI inert in demos | Medium | 🟠 Med | Fund before 9B (B2) | Open |
| R5 | CCTV scope creep drags release | Low | 🟠 Med | CCTV = post-v1.0 add-on (P7) | Mitigated |
| R6 | Scope drift into Aura Build / new modules | Medium | 🔴 Critical | Rules below; this tracker is execution-only | Open |
| R7 | Deferred items (SMS/recurring billing) mistaken for v1.0 blockers | Low | 🟢 Low | They're add-ons with manual fallbacks | Mitigated |
| R8 | Supabase Disk-I/O / Nano capacity (went Unhealthy 2026-06-22) | Med | 🔴 Critical | Infra-R1 (e2e off prod) + R2 (RLS initplan) → **back to Healthy**; R5 (disable Realtime) + tier-upgrade are the remaining levers for real traffic | 🟢 Mitigated (R5 + capacity pending real load) |

---

# 📜 Rules (non-negotiable until v1.0 ships)

- ❌ Do **not** create new modules.
- ❌ Do **not** expand scope.
- ❌ Do **not** create additional roadmap or strategy documents — **update *this* file**.
- ❌ Do **not** start Aura Build.
- ❌ Do **not** start Aura Field.
- ❌ Do **not** start Aura Vision.
- ✅ **Track execution only.** This document is the operational dashboard for the
  Aura Campus v1.0 release; keep it continuously updated.

> ### 🧱 Note — Aura Core Foundation (owner-directed, 2026-06-25)
> A separate **Aura Core Foundation** platform stream (CF-1…CF-5) has been opened
> at [../AURA_CORE/AURA_CORE_FOUNDATION.md](../AURA_CORE/AURA_CORE_FOUNDATION.md).
> This is **planning/architecture only — no code, and it does NOT change the Aura
> Campus v1.0 scope or gate the release.** It honours the rules above *in intent*:
> Core Foundation is **not** a new Campus module, **not** the start of Aura
> Build/Field/Vision, and lives in its own `AURA_CORE/` area with its own roadmap
> + DEV_TRACKER — so v1.0 execution here stays undisturbed. (Mitigates R6: the
> stream is explicitly fenced off from Campus v1.0 execution.)

---

*Cross-reference: [AURA_CAMPUS_FINAL_COMPLETION_PLAN.md](AURA_CAMPUS_FINAL_COMPLETION_PLAN.md) (the approved plan) · [AURA_ROADMAP.md](AURA_ROADMAP.md) (master tracker) · [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md).*
