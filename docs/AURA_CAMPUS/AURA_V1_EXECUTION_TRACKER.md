# 🎯 Aura Campus v1.0 — Execution Tracker

> **Single source of truth** from now until the Aura Campus v1.0 commercial
> release. This is an **operational dashboard**, not a planning doc — it tracks
> execution of the already-approved [AURA_CAMPUS_FINAL_COMPLETION_PLAN.md](AURA_CAMPUS_FINAL_COMPLETION_PLAN.md).
> Update it **continuously** as work progresses.
>
> **Last updated:** 2026-06-21 · **Execution start:** Track 2 (Arch A2) underway — **Step 1 complete**

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
| **Step 2** | Authenticated route-crawl — all 230 routes × allowed roles (HTTP<400, 0 `pageerror`) | 🔲 | Step 1 | 0% | +2–3 days after S1 |
| **Step 3** | Critical user-flow e2e — admissions, fees, leave, exams, knowledge hub | 🔲 | Step 1 | 0% | +5–7 days after S1 |
| **Step 4** | Cross-role negative auth — wrong role denied (not 200) | 🔲 | Step 1 | 0% | +2 days after S3 |
| **Step 5** | **Institution isolation** — tenant A cannot read tenant B via HTTP/API | 🔲 | Step 1 | 0% | +2 days after S3 |
| **Step 6** | Wire e2e into `ci.yml` (seed → run) as a required check | 🔲 | Steps 2–5 | 0% | +2–3 days after S5 |
| **Step 7** | Action-wiring coverage — top ~20 money/grade/enrollment/access actions | 🔲 | Step 1 | 0% | +3–5 days |

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

**Track 2 completion: ~25%** (unit foundation ✅; auth fixtures ✅; route-crawl/flows/isolation pending)

---

# Track 3 — Phase 9 (Business Readiness)

> **P1 = v1.0-gating** (9A, 9B, 9I). P2/P3 should be *ready* but a subset can
> trail into the launch window. Mostly non-engineering; parallelizable with Tracks 1–2.

| Item | Description | Priority | Status | Dependencies | Progress % |
|------|-------------|----------|--------|--------------|-----------|
| **9A** | Pricing Strategy — tiers mapped to `subscription_plans` (7E ✅) | 🔴 P1 | 🔲 | Phase 7E (✅) | 0% |
| **9B** | Demo Institution — fully-seeded showcase tenant + reset script | 🔴 P1 | 🔲 | Seed engine (shared w/ A2 Step 1) | 0% |
| **9C** | Trial Provisioning — spin-up → Onboarding Wizard (A4 ✅) → trial sub | 🟠 P2 | 🔲 | A4 (✅), 7E (✅) | 0% (foundations ✅) |
| **9D** | Onboarding Toolkit — import templates, go-live checklist, migration playbook | 🟠 P2 | 🔲 | BulkUpload flows (✅) | 0% |
| **9E** | Sales Deck — problem→solution, NAAC/NIRF/AISHE compliance story, ROI | 🟠 P2 | 🔲 | 9A | 0% |
| **9F** | Implementation Guide — infra runbook, DR (✅), config matrix, cutover | 🟡 P3 | 🔲 | Infra docs (partial ✅) | 0% |
| **9G** | Training Materials — role quickstarts, short videos, FAQ, cheat-sheets | 🟡 P3 | 🔲 | Stable UI | 0% |
| **9H** | Support & Help Center — in-app help, KB (dogfood Knowledge Hub ✅), tickets, SLA | 🟡 P3 | 🔲 | Knowledge Hub (✅) | 0% |
| **9I** | Release Checklist — security, A2 green, backups, billing, legal, monitoring, rollback | 🔴 P1 (final gate) | 🔲 | All tracks | 0% |

**Track 3 completion: ~3%** (existing 7E/A4/Knowledge-Hub foundations only)

---

# 📊 Weekly Dashboard

> Update this block every week. Percentages are toward the **v1.0 line**, not raw feature counts.

### Completion snapshot — Week 0 (2026-06-21) · A2 Step 1 ✅

```
Overall v1.0   ████░░░░░░░░░░░░░░░░░░░░░░░░░░  ~14%
  Track 1  Phase 8 (P0–P5)   ███░░░░░░░░░░░░░░░░░░░░  ~12%
  Track 2  Arch A2 (gate)    ███████░░░░░░░░░░░░░░░░  ~25%  (Step 1/7 ✅)
  Track 3  Phase 9 (P1 focus) █░░░░░░░░░░░░░░░░░░░░░░  ~3%
```

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

### Risk Register

| # | Risk | Likelihood | Impact | Mitigation | Status |
|---|------|-----------|--------|------------|--------|
| R1 | Institution isolation regresses unseen (tenant data leak) | Low | 🔴 Critical | A2 Step 5 isolation e2e as required CI gate | Open |
| R2 | A2 stays at Foundation → ship on unverified routes | Medium | 🔴 Critical | A2 = hard v1.0 gate | Open |
| R3 | EAS / app-store approval delays | Medium | 🟠 High | Start P0 week 1; web is fully usable without mobile | Open |
| R4 | Anthropic credit unfunded → AI inert in demos | Medium | 🟠 Med | Fund before 9B (B2) | Open |
| R5 | CCTV scope creep drags release | Low | 🟠 Med | CCTV = post-v1.0 add-on (P7) | Mitigated |
| R6 | Scope drift into Aura Build / new modules | Medium | 🔴 Critical | Rules below; this tracker is execution-only | Open |
| R7 | Deferred items (SMS/recurring billing) mistaken for v1.0 blockers | Low | 🟢 Low | They're add-ons with manual fallbacks | Mitigated |

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

---

*Cross-reference: [AURA_CAMPUS_FINAL_COMPLETION_PLAN.md](AURA_CAMPUS_FINAL_COMPLETION_PLAN.md) (the approved plan) · [AURA_ROADMAP.md](AURA_ROADMAP.md) (master tracker) · [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md).*
