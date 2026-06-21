# 🏁 Aura Campus — Final Completion Plan

> **Status:** Aura Campus is **92% complete** (85 / 92 modules) as a development
> platform. This document is the bridge from *"feature-complete development build"*
> to *"commercially deployable SaaS product."*
>
> **Scope guardrails (hard constraints for this stage):**
> - ❌ Do **not** start Aura Build, Aura Field, or Aura Vision.
> - ❌ Do **not** introduce any new ERP modules.
> - ✅ Finish Aura Campus *properly* before the next product in the ecosystem.
>
> Section 4 (Aura Core extraction) is **analysis only** — no code, no migrations,
> no refactoring at this stage.
>
> **Author:** Aura Product Architecture · **Created:** 2026-06-21 · **Cross-ref:**
> [AURA_ROADMAP.md](AURA_ROADMAP.md) · [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md) · `docs/testing-guide.md`

---

## Contents
1. [Section 1 — Phase 8 Completion Program](#section-1--phase-8-completion-program)
2. [Section 2 — Arch A2 Completion Program](#section-2--arch-a2-completion-program)
3. [Section 3 — Commercial Readiness Program (Phase 9)](#section-3--commercial-readiness-program-phase-9)
4. [Section 4 — Aura Core Extraction Preparation (analysis only)](#section-4--aura-core-extraction-preparation-analysis-only)
5. [Final Output — Effort, Sequence, Risks, Release Target, Go/No-Go](#final-output)

---

# SECTION 1 — Phase 8 Completion Program

**React Native Mobile Apps & CCTV.** Current state: **~30% complete**. The app
exists (Expo SDK 54, role-adaptive shell for all 6 roles, Supabase auth, **22
screens built**), and **everything currently runs in Expo Go** — but every
*remaining* item is gated on the same meta-dependency: a **native EAS dev build**
plus the corresponding developer accounts and, in two cases, physical hardware.

### 1.1 Per-sub-phase status

| Sub | Module | Status today | Remaining work |
|-----|--------|--------------|----------------|
| **8A** | RN setup — Expo SDK 54, role-adaptive bottom-tab shell (6 roles), Supabase auth, read-only portal screens | ✅ **Complete** | None |
| **8B** | Staff Mobile — Home, Schedule, Leave (apply), Payslip, Attendance view, Approvals (admin/HOD) | 🟡 **Screens built** | NFC attendance marking (the one native feature); polish + on-device QA |
| **8C** | Student Mobile — Home, Timetable, Attendance, Fees | 🟡 **Screens built** | In-app Razorpay checkout; notification inbox; on-device QA |
| **8D** | Push Notifications (Staff + Student + Parent) | 🔲 **Pending** | Expo push tokens, token registry table, send pipeline, deep-links, inbox UI |
| **8E** | CCTV Integration | 🔲 **Pending** | RTSP/HLS player, camera registry, gateway, native build |
| **8F** | Parent Mobile App — parent tier + read-only child Home/Attendance/Results/Fees via authed `/api/parent` (JWT + link-verified service-role reads); Pay deep-links to web | 🟡 **Foundation** | Push inbox/alerts; parent self-link OTP; native in-app pay |

### 1.2 Remaining work (consolidated)

| Work item | Sub | Type |
|-----------|-----|------|
| NFC attendance marking (read campus card UID → mark) | 8B | Native module + hardware |
| In-app Razorpay checkout (student + parent pay-on-behalf) | 8C, 8F | Native SDK + payments |
| Push notification pipeline (token registry → send → deep-link → inbox) | 8D | Backend + native |
| CCTV live view (RTSP→HLS, camera registry, per-role access) | 8E | Native + hardware + infra |
| Parent self-link OTP (claim a child without admin) | 8F | SMS (tied to 3C) |
| On-device QA pass for all 22 screens across 6 roles | 8B–8F | QA |
| Store submission (TestFlight / Play internal track) | all | Release ops |

### 1.3 Dependencies

```
Apple Developer Account ($99/yr) ─┐
Google Play Developer ($25 once) ─┼─► EAS Dev Build ──► 8B NFC, 8C/8F pay, 8D push, 8E CCTV
Expo EAS subscription ────────────┘                          │
                                                              ├─ 8B NFC  ← NFC reader phones + Phase 4F card registry (✅ exists)
                                                              ├─ 8C/8F pay ← Razorpay React Native SDK + live keys (✅ web keys exist)
                                                              ├─ 8D push ← Expo Push + a device-token table (new, small)
                                                              ├─ 8E CCTV ← IP cameras + RTSP gateway/transcoder + network
                                                              └─ 8F OTP  ← SMS provider (3C SMS — currently deferred)
```

- **Phase 4F (Smart ID / NFC card registry)** is ✅ complete — the NFC webhook already validates card status. 8B only needs the *mobile reader* half.
- **3C SMS** is deferred (needs paid SMS + DLT registration). Parent self-link OTP inherits that blocker; until then parent linking stays **admin-driven** (already shipped).

### 1.4 Hardware requirements

| Need | For | Notes |
|------|-----|-------|
| 1–2 NFC-capable Android phones | 8B testing | Android NFC is far simpler than iOS Core NFC |
| Campus NFC cards (test set) | 8B | Already issuable via Phase 4F |
| ≥1 IP camera (RTSP) + small NVR/gateway host | 8E | Biggest hardware lift; can be deferred to a paid add-on |
| iOS + Android test devices | all | TestFlight / Play internal QA |

### 1.5 EAS requirements

- **Apple Developer Program** ($99/yr) and **Google Play Console** ($25 one-time).
- **Expo EAS** (free tier works to start; paid for faster/parallel builds).
- `eas.json` build profiles (development / preview / production); app signing
  credentials managed by EAS.
- A **development client** build replaces Expo Go so native modules (NFC, Razorpay,
  push, video) link in. **This single step unblocks 8B/8C/8D/8E/8F natives.**

### 1.6 Razorpay mobile requirements

- `react-native-razorpay` (or the Standard Checkout web-view) wired into 8C and
  8F; reuse existing server order-creation + the **already-verified webhook**
  (Phase 2.5A). No new server trust surface — the mobile app only opens checkout
  and the webhook remains the source of truth.
- Live keys already exist for web; mobile reuses them. No PCI scope change
  (Razorpay-hosted checkout).

### 1.7 CCTV integration requirements

- **Camera registry** table (location, RTSP URL, per-role visibility) — *small new
  schema, but explicitly out of scope until Phase 8 resumes; do not build now.*
- **RTSP → HLS** transcoding gateway (e.g. a small media server) because RN cannot
  play RTSP directly; app plays HLS.
- Network: cameras + gateway reachable; auth-proxied stream URLs (never expose raw
  RTSP creds to the client).
- **Recommendation:** treat CCTV as a **premium/optional add-on**, not a v1.0 gate
  — it carries the most hardware, infra, and security surface of any Phase 8 item.

### 1.8 Push notification requirements

- `expo-notifications` + a **`device_push_tokens`** table (user, role, token,
  platform) — small, RLS-scoped.
- Send pipeline: reuse the existing `notifications` infra (Phase 3A) + a server
  step that fans out to Expo Push for users with registered tokens.
- Deep-links from a push into the right screen; a parent **push inbox** for 8F.
- No third-party cost (Expo Push is free); only needs the EAS dev build to obtain
  real device tokens.

### 1.9 ▶️ Priority order for completing Phase 8

> Sequence by *value unlocked per unit of dependency*, front-loading the one step
> that unblocks everything.

| Order | Item | Why first / here | Gate |
|-------|------|------------------|------|
| **P0** | **EAS dev build + developer accounts** | Meta-blocker — unblocks all natives; pure setup | $ accounts |
| **P1** | **8D Push Notifications** | Highest engagement value, software-only after EAS, reuses Phase 3A | EAS |
| **P2** | **8C / 8F In-app Razorpay pay** | Revenue-relevant; reuses verified webhook | EAS + RN SDK |
| **P3** | **On-device QA pass (8B/8C/8F screens, 6 roles)** | Converts "screens built" → "shippable"; no new hardware | EAS |
| **P4** | **8B NFC attendance** | High value but needs NFC phones; card registry ready | EAS + NFC HW |
| **P5** | **Store submission (TestFlight / Play internal)** | First real external distribution | P1–P4 |
| **P6** | **8F parent self-link OTP** | Nice-to-have; blocked on 3C SMS | SMS provider |
| **P7** | **8E CCTV** | Most hardware/infra/security; best as a paid add-on post-v1.0 | Cameras + gateway |

**Phase 8 "done enough for v1.0" line:** P0–P5 complete (push + pay + QA + NFC +
store presence). P6 and P7 can ship as **fast-follows / paid add-ons** without
holding the v1.0 release.

---

# SECTION 2 — Arch A2 Completion Program

**Testing Strategy.** Current status: **Foundation** (not Complete). This is the
single biggest **quality risk** to a commercial launch and should be treated as a
release gate.

### 2.1 Current state (measured)

| Layer | Today | Reality |
|-------|-------|---------|
| **Vitest (unit)** | **50 files · 653 tests** | Strong on *pure logic* (engines, lib helpers). This is genuinely good coverage of calculation/policy code. |
| **Playwright (e2e)** | **1 spec · 2 public routes** (`/login`, `/privacy-policy`) + a login-form render check | Essentially a seed. **No authenticated route is exercised.** |
| **Route-crawl** | 2 of **230** page routes | ~228 routes never loaded by any automated test |
| **Authenticated flows** | **0** | No storageState/login fixture exists yet |
| **Cross-role testing** | **0** | No test asserts a STUDENT is blocked from `/admin` etc. |
| **Institution isolation** | **0 at HTTP layer** | RLS is audited at the DB layer (Arch A1) but never asserted via the app/API surface |
| **Regression** | **Manual** | Only `tsc` + unit + migration replay run in CI; no e2e in CI |
| **Server-action coverage** | Indirect | 77 actions; pure logic extracted & unit-tested, but action *wiring* (auth gate → RLS write → revalidate) is unverified end-to-end |

### 2.2 Gap analysis (Foundation → Complete)

| Category | Gap | Severity |
|----------|-----|----------|
| Auth fixtures | No seeded login/storageState per role | 🔴 Blocks all of the below |
| Authenticated route crawl | 228/230 routes uncrawled | 🔴 Crashes on null data ship silently |
| Critical user flows | No e2e for admissions, fees, leave, exams, etc. | 🔴 Core revenue/operational paths unverified |
| Cross-role (negative) auth | No "wrong role is denied" assertions | 🔴 Security regressions invisible |
| Institution isolation | Tenant-A-can't-see-Tenant-B never asserted via HTTP | 🔴 The #1 SaaS-killer if it ever regresses |
| Regression in CI | e2e not wired into GitHub Actions | 🟠 No safety net on PRs |
| Action-wiring coverage | Auth-gate/RLS-write paths only covered transitively | 🟠 |
| Component tests | Minimal (jsdom available, lightly used) | 🟢 Lower priority |

### 2.3 Plan: move A2 from Foundation → Complete

**Step 1 — Seeded test tenant + role login fixtures (foundation for everything).**
- A deterministic seed: 2 institutions (A, B) × users for each of SUPER_ADMIN,
  INST_ADMIN, HOD, STAFF, STUDENT, PARENT.
- Playwright `storageState` fixtures per role (login once, reuse the session).
- This unlocks every authenticated test below.

**Step 2 — Authenticated route-crawl.**
- Parameterized crawl of all 230 routes, each visited as **every role allowed to
  see it**, asserting HTTP < 400 and **zero `pageerror`** (catches null-data crashes
  cheaply — the highest ROI test in the suite).

**Step 3 — Critical user-flow e2e (the revenue/operational spine).**
- Admissions: public apply → admin shortlist → enroll → student login works.
- Fees: demand → student pays (Razorpay test mode / mock) → ledger updates.
- Leave: staff applies → admin/HOD approves → attendance reflects.
- Exams: create → student takes → auto-grade → result visible.
- Knowledge Hub: upload → search → (AI summary/assistant once credit added).

**Step 4 — Cross-role negative auth.**
- For a representative set of admin/HOD/staff/student routes & actions, assert the
  **wrong** role gets redirected/denied (not a 200 with data).

**Step 5 — Institution isolation (the SaaS gate).**
- Logged in as Institution A, attempt to read/route to Institution B's data (by
  id) and assert **deny/empty** at the HTTP/API layer — turning the Arch A1 DB-layer
  RLS audit into a continuously-enforced product guarantee.

**Step 6 — Wire e2e into CI + regression baseline.**
- Add a Playwright job to `ci.yml` (seed DB → run e2e). Make green e2e a required
  check alongside the existing quality + migrations jobs.

**Step 7 — Close the highest-risk action-wiring gaps.**
- Audit the 77 actions; for the ~top 20 that mutate money/grades/enrollment/access,
  add a focused e2e or integration assertion of the **auth-gate + RLS + revalidate**
  path (thin no-logic wrappers stay covered by the crawl).

### 2.4 Required tests / missing categories (summary)

| # | Test category | New artifacts |
|---|---------------|---------------|
| 1 | Role login fixtures | seed script + 6 `storageState` files |
| 2 | Authenticated route crawl | 1 parameterized spec (×230 routes × roles) |
| 3 | Critical flow e2e | ~5–8 flow specs |
| 4 | Cross-role negative auth | 1–2 matrix specs |
| 5 | Institution isolation | 1 isolation spec |
| 6 | CI integration | `ci.yml` e2e job + seed |
| 7 | Action-wiring coverage | ~20 targeted assertions |

### 2.5 Estimated effort

| Workstream | Effort |
|------------|--------|
| Seed tenant + role fixtures (Step 1) | 3–4 days |
| Authenticated route-crawl (Step 2) | 2–3 days |
| Critical flow e2e (Step 3) | 5–7 days |
| Cross-role + isolation (Steps 4–5) | 3–4 days |
| CI wiring + flake-hardening (Step 6) | 2–3 days |
| Action-wiring gaps (Step 7) | 3–5 days |
| **Total** | **~3–4 focused weeks** |

**Definition of Done (A2 → Complete):** all 230 routes crawled green under auth;
the 5 critical flows pass e2e; cross-role + isolation specs pass; e2e is a required
CI check. At that point Arch flips **88% → 100% (8/8)**.

---

# SECTION 3 — Commercial Readiness Program (Phase 9)

> **Phase 9 is NOT development.** It is **Business Readiness** — the work that turns
> a finished platform into a sellable, onboardable, supportable product. Most items
> are content/process, not engineering (a few need light eng seams only).

| Item | Objective | Key deliverables | Dependencies | Priority |
|------|-----------|------------------|--------------|----------|
| **9A Pricing Strategy** | Decide how Aura Campus is sold | Tiered pricing (Starter/Pro/Enterprise) mapped to the **existing** `subscription_plans` (Phase 7E); per-student vs per-institution model; trial terms; discount policy | Phase 7E billing (✅) | 🔴 P1 |
| **9B Demo Institution** | A polished, always-on showcase tenant | Fully-seeded "Bishop Heber College" demo with realistic data across every module; reset script; guided demo path | Stable platform; seed tooling (shared with A2 Step 1) | 🔴 P1 |
| **9C Trial Institution Provisioning** | Self/assisted spin-up of a real trial tenant | One-click/CLI tenant create → Onboarding Wizard (Arch A4 ✅) → trial subscription auto-set; expiry + conversion path | Arch A4 (✅), Phase 7E (✅) | 🟠 P2 |
| **9D Customer Onboarding Toolkit** | Get a new institution live fast | Data-import templates (staff/student/dept CSV — reuse BulkUpload), go-live checklist, data-migration playbook, roles-setup guide | Existing bulk-upload flows | 🟠 P2 |
| **9E Sales Deck** | Win the deal | Problem→solution narrative, module map, NAAC/NIRF/AISHE compliance story (a genuine differentiator), ROI framing, competitor contrast | 9A pricing | 🟠 P2 |
| **9F Implementation Guide** | Repeatable deployment | Environment setup, Supabase/Vercel/scheduler runbook, DR (`DISASTER_RECOVERY.md` ✅), config matrix, cutover plan | Infra docs (partial ✅) | 🟡 P3 |
| **9G Training Materials** | Make users self-sufficient | Role-based quickstarts (admin/HOD/staff/student/parent), short screen-capture videos, FAQ, printable cheat-sheets | Stable UI | 🟡 P3 |
| **9H Support & Help Center** | Sustain customers post-sale | In-app help/contact, knowledge base (dogfood the **Knowledge Hub** internally!), ticket intake, SLA tiers, status page (UptimeRobot seed exists) | Knowledge Hub (✅) | 🟡 P3 |
| **9I Release Checklist** | Gate the v1.0 cutover | Security sign-off (advisors clean), A2 green, backups verified, billing live, legal (DPDP ✅, T&Cs, privacy ✅), monitoring on, rollback plan | All of the above | 🔴 P1 (final gate) |

**Notes / leverage:**
- **9B Demo + A2 Step 1 share the same seeding investment** — build the seed engine
  once, use it for tests *and* the demo tenant.
- **9H can dogfood the Knowledge Hub** — the institution's own help content becomes
  the first real Knowledge Hub deployment.
- Most of Phase 9 is **parallelizable with Section 1/2 engineering** because it is
  largely non-code.

---

# SECTION 4 — Aura Core Extraction Preparation (analysis only)

> ⚠️ **Analysis only.** Do **not** begin extraction. Do **not** create code,
> migrations, or refactors. This section *identifies and rates* candidates so the
> eventual Aura Core (the shared substrate beneath Campus / Build / Field) can be
> planned with eyes open. Extraction happens **after** Aura Campus v1.0 ships.

**Rating key — Extraction difficulty:** 🟢 Low · 🟡 Medium · 🔴 High.
**Shared potential:** how reusable across Build/Field/Vision.

### 4.1 Candidates

| # | Candidate | Current implementation in Campus | Shared potential | Extraction difficulty | Recommendation |
|---|-----------|----------------------------------|------------------|-----------------------|----------------|
| 1 | **Identity** | `institutions` + `institution_members` + roles (SUPER_ADMIN…STUDENT/PARENT), `@supabase/ssr` cookie auth, middleware slug-rewrite, `private.get_user_authorizations()` | **Very high** — every product needs tenants + roles + auth | 🔴 High — deeply woven into RLS everywhere; role enum is education-specific | **Extract first, but carefully.** Generalize role model (Campus roles become a *profile* over a generic identity). The foundational Core service. |
| 2 | **Notifications** | Phase 3A `notifications` table + RLS + realtime + `useNotifications` + Topbar bell/drawer; triggers via `notificationTriggers.ts`; email via Resend | **Very high** — product-agnostic already | 🟢 Low — clean, self-contained, event-driven | **Strong first extraction.** Highest reward / lowest risk. Channels (in-app/email/SMS/push) are pluggable. |
| 3 | **Audit** | `audit_logs` table + `logAudit()` helper; immutable; used across modules | **Very high** | 🟢 Low — single table + one helper, append-only | **Extract early.** Trivial to generalize; compliance value in every product. |
| 4 | **Billing** | Phase 7E — `subscription_plans` / `institution_subscriptions` / `subscription_invoices` + MRR/ARR + feature gating + Razorpay | **High** — SaaS billing is universal | 🟡 Medium — Razorpay/INR + plan model are Campus-shaped but cleanly layered | **Extract after Identity.** Abstract the gateway; keep plan definitions per-product. |
| 5 | **Documents** | Certificate generator (Phase 6C), SSR/NAAC builders, CSV/print exports, numbering | **Medium** — generation patterns reusable; *content* is education-specific | 🟡 Medium — templating engine is generic; templates are not | **Extract the engine, not the templates.** A Core "document/render service"; products supply templates. |
| 6 | **Storage** | ~10 Supabase Storage buckets (knowledge-hub, research-docs, mou-documents, etc.) with public-read + RLS write conventions | **High** — file handling is universal | 🟢 Low — already a thin, convention-based wrapper over Supabase Storage | **Extract as a thin Core utility** (upload/url/policy helpers). Low effort, broad reuse. |
| 7 | **Localization** | Arch A6 — per-institution `currency`/`locale`/`timezone` + `src/lib/locale.ts` formatters + `useInstitutionLocalization()` | **Very high** | 🟢 Low — already isolated in one lib + a hook | **Extract early.** Already designed as a clean seam; near-zero coupling. |
| 8 | **Knowledge Services** | Phase 7X Knowledge Hub — repository + FTS + ratings/collections + analytics + AI summaries/RAG assistant; `knowledgeHub.ts`/`knowledgeAnalytics.ts`/`knowledgeAI.ts` | **High** — a knowledge/RAG layer suits Build (project docs) & Field (SOPs/manuals) | 🟡 Medium — taxonomy is education-shaped; the retrieval/AI plumbing is generic | **Extract the service, re-skin the taxonomy.** The KH-5 RAG + embedding-ready design is the most directly reusable knowledge layer. |

### 4.2 Extraction read (analysis conclusion)

- **Tier-1 (clean, high-reward, low-risk — extract first):** Notifications, Audit,
  Localization, Storage. These are already near-seams; they validate the Core
  pattern with minimal blast radius.
- **Tier-2 (foundational but invasive):** Identity. Highest value, highest care —
  generalize the tenant/role/auth substrate; everything else sits on it.
- **Tier-3 (valuable, do after the substrate exists):** Billing, Documents,
  Knowledge Services — extract the *engine*, keep the *domain content* per-product.
- **Sequencing principle:** prove the extraction pattern on Tier-1, then take
  Identity, then layer Tier-3 on top. **None of this starts until Campus v1.0 ships.**

---

# FINAL OUTPUT

### 1. Remaining effort to complete Aura Campus

| Workstream | Effort | Type |
|------------|--------|------|
| **Arch A2 → Complete** (the quality gate) | **~3–4 weeks** | Engineering |
| **Phase 8 → v1.0 line (P0–P5)** | **~3–5 weeks** | Engineering + setup + light hardware |
| **Phase 9 Business Readiness (9A/9B/9I priority)** | **~4–6 weeks** | Mostly non-eng, parallelizable |
| Phase 8 fast-follows (P6 OTP, P7 CCTV) | post-v1.0 | Deferred / add-on |
| **Net critical path to v1.0** | **~6–8 weeks** | (A2 + Phase 8 partly parallel with Phase 9) |

> The three workstreams overlap: A2 (eng) and Phase 9 (content) run in parallel;
> Phase 8 natives gate on the EAS setup done in week 1. Hence ~6–8 weeks wall-clock,
> not the ~11-week naive sum.

### 2. Recommended sequence of work

```
Week 1     ── EAS dev build + dev accounts (Phase 8 P0)  ──┐ (unblocks all mobile natives)
           └─ A2 Step 1: seed tenant + role fixtures      ──┘ (also feeds 9B Demo)
Weeks 1–4  ── A2 Steps 2–7: route crawl → flows → isolation → CI  ★ RELEASE GATE
Weeks 2–5  ── Phase 8 P1–P4: push → pay → QA → NFC        (parallel, post-EAS)
Weeks 1–6  ── Phase 9 9A pricing, 9B demo, 9D onboarding kit (parallel, non-eng)
Week 6     ── Phase 8 P5 store submission · Phase 9 9E–9H content
Weeks 6–8  ── 9I Release Checklist → security sign-off → v1.0 cutover
Post-v1.0  ── Phase 8 P6/P7 (OTP/CCTV add-ons) · begin Aura Core Tier-1 extraction
```

### 3. Critical risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | **Institution isolation regresses unseen** (multi-tenant data leak) | 🔴 Existential for a SaaS | A2 Step 5 isolation e2e as a required CI gate; Arch A1 already audited DB-layer |
| R2 | **A2 stays at Foundation** → ship on unverified routes | 🔴 Production crashes / churn | Treat A2 Complete as a hard v1.0 gate, not optional |
| R3 | **EAS / store approval delays** (Apple review, signing) | 🟠 Slips mobile GA | Start P0 in week 1; web platform is fully usable without mobile |
| R4 | **Anthropic credit not funded** → KH-5 AI inert in demos | 🟠 Weakens the AI story | Fund a small balance before 9B demo build |
| R5 | **CCTV hardware/infra scope creep** | 🟠 Drags the release | Scope CCTV out of v1.0 as a paid add-on (P7) |
| R6 | **Scope drift into Aura Build/new modules** | 🔴 Never finishes Campus | This document's guardrails; Go/No-Go gate below |
| R7 | **Deferred items (SMS/WhatsApp, recurring billing)** mistaken for v1.0 blockers | 🟢 | They're add-ons; manual fallbacks already ship |

### 4. Recommended target for Aura Campus v1.0 release readiness

**v1.0 = "commercially deployable" is declared when ALL of:**
1. ✅ **Arch A2 = Complete** — authenticated route-crawl green, 5 critical flows
   pass, cross-role + **institution-isolation** e2e green, e2e in CI.
2. ✅ **Phase 8 P0–P5** — EAS build, push, in-app pay, on-device QA, NFC, store
   internal track. (P6 OTP / P7 CCTV explicitly **excluded** from the v1.0 line.)
3. ✅ **Phase 9 P1 items** — pricing (9A), demo tenant (9B), release checklist (9I)
   signed off; trial provisioning (9C) + onboarding kit (9D) ready.
4. ✅ **Operational** — backups verified, monitoring on, billing live, security
   advisors clean, Anthropic credit funded.

**Target window:** **~6–8 weeks** from start, A2 being the long pole and the gate.

### 5. Go / No-Go recommendation for beginning Aura Build

> ## 🔴 **NO-GO** for Aura Build — at this time.

**Rationale:** Aura Campus is feature-rich (92%) but **not yet commercially
hardened**. The decisive blocker is **Arch A2 at Foundation** — multi-tenant
isolation and authenticated flows are not yet continuously verified, which is the
exact risk class that sinks a SaaS in production. Starting Aura Build now would:
- Split focus before Campus is revenue-ready,
- Multiply the cost of the still-pending **Aura Core extraction** (extracting from a
  moving, unverified codebase is far riskier),
- Leave the isolation/quality gate unclosed across *two* products instead of one.

**Go criteria — begin Aura Build only after:**
1. Aura Campus **v1.0 released** per the target above (A2 Complete being mandatory),
2. **≥1 real trial/demo institution** running on it (proves deployability),
3. **Aura Core Tier-1 extraction plan** approved (Notifications/Audit/Localization/
   Storage) so Build is constructed *on Core*, not as a second silo.

**Bottom line:** Finish Aura Campus *properly* — A2 to Complete, Phase 8 to the
v1.0 line, Phase 9 business readiness — ship v1.0, land a trial, then extract Core
Tier-1. **Only then** is it the right moment to begin Aura Build.

---

*Document maintained by: Aura Product Architecture Team · Cross-reference:
[AURA_ROADMAP.md](AURA_ROADMAP.md) · [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md) ·
[AURA_CAMPUS_KNOWLEDGE_HUB.md](AURA_CAMPUS_KNOWLEDGE_HUB.md)*
