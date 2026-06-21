# 🚀 AURA 1.0 — Master Development Roadmap

> **Instructions for Claude:** This is the official development roadmap for Aura 1.0.
> Work through each phase and step **in order**. Do not skip steps.
> Mark each step as ✅ when complete. Never start the next phase until all steps
> in the current phase are marked complete and committed to GitHub.
> Always follow the tech stack, naming conventions, and patterns defined in the
> System Context below.
>
> **This roadmap is split across the [`roadmap/`](roadmap/) folder** — one file per
> phase/section, listed in the Roadmap Index below. Each phase file opens with a
> **Depends on / Feeds into** note so cross-phase context isn't lost when reading
> a single file. This index retains everything that applies across every phase:
> System Context, Dev Rules, Environment Variables, and the Progress Tracker.

---

## 📌 System Context (Always Apply) 

```
Project:      Aura 1.0 — Premium Multi-Tenant EdTech SaaS
Client:       Academic institutions (e.g. Bishop Heber College)
Repo:         https://github.com/gitsmith2021/project-aura.git
Branch:       main
```

### Tech Stack
- **Frontend:** Next.js 15 (App Router, Server Actions, Server Components)
- **Language:** TypeScript (strict mode, discriminated unions for all Server Actions)
- **Styling:** Tailwind CSS — glassmorphism (bg-white/70, backdrop-blur-xl, border-white/20)
- **Palette:** Violet/Purple primary · Emerald for success · Rose for errors/expenses
- **Database:** Supabase (PostgreSQL) with @supabase/ssr cookie-based auth
- **Icons:** Lucide React only
- **Charts:** Recharts
- **Hosting:** Vercel (frontend) · Local/Cloud (Python microservice)
- **Scheduler:** Python FastAPI + Google OR-Tools on port 8000

### Naming Conventions (CRITICAL — never use old names)
| ❌ Old | ✅ New |
|--------|--------|
| `tenants` | `institutions` |
| `tenant_users` | `institution_members` |
| `profiles` (STAFF rows) | `staff` |
| `profiles` (STUDENT rows) | `students` |
| `tenant_id` | `institution_id` |

### Code Patterns (Always Follow)
- Supabase server: `import { createClient } from "@/utils/supabase/server"`
- Supabase client: `import { createClient } from "@/utils/supabase/client"`
- Auth: always use `supabase.auth.getUser()` — never trust `getSession()` alone
- Server Actions: always return `{ success: true, data: ... } | { success: false, error: string }`
- Always call `revalidatePath()` after every mutation
- Never expose secrets to the client

### 🔗 Institution URL Pattern (CRITICAL — always use slugs)

All `/institutions/[id]/...` routes display the institution **slug** in the browser URL, not the UUID.

```
Browser sees:  /institutions/bishop-heber-college/curriculum
Page receives: /institutions/22f26ef2-d7e9-4a41-a267-97d7eaa7c1d8/curriculum  (after middleware rewrite)
```

**How it works:**
1. `src/utils/supabase/middleware.ts` — detects non-UUID segment after `/institutions/`, looks up `institutions.slug → id`, rewrites to UUID path via `NextResponse.rewrite()` before the page handler runs
2. `src/components/layout/Sidebar.tsx` — all nav hrefs built from `activeInstSlug` (stored in `localStorage` + `aura-inst-slug` cookie set at login)
3. Pages receive UUID in `params.id` — **no page code ever changes** — the slug is only visible in the browser URL bar

**Rules for Claude:**
- When writing page files under `src/app/institutions/[id]/...`: always use `params.id` as-is — it will be a UUID at runtime
- When writing sidebar or nav links: always use `instSlug` / `activeInstSlug`, never hardcode UUIDs
- When writing `Link` hrefs or `router.push()` calls in client components: use the slug variable, not the UUID
- `revalidatePath()` calls in Server Actions should use the UUID form: `revalidatePath(\`/institutions/${institutionId}/...\`)` — this is fine because Next.js matches by internal path

### ✅ Completed Modules (Do Not Rebuild)
- [x] Core platform — auth, middleware, multi-tenant routing
- [x] Institutions CRUD — AddInstitutionModal, EditInstitutionModal
- [x] Departments CRUD — with color, funding type, icons
- [x] Staff directory — staff table, AddPersonModal, EditPersonModal, BulkUploadModal
- [x] Students directory — students table, roll numbers, program/year
- [x] AI Timetable Scheduler — FastAPI + OR-Tools + DraftPreviewPanel + Publish flow
- [x] Attendance System — NFC webhook + manual marking + SessionSummaryModal
- [x] Finance Module — Fee Structures, Fee Payments (Razorpay), Salary, Expenses, Reports
- [x] Dark mode — ThemeContext with localStorage persistence
- [x] UI overhaul — glassmorphism, InstitutionTabBar, StudentDeptBreakdown

---

## 🗂️ Roadmap Index

| # | File | Covers | Status |
|---|------|--------|--------|
| 1 | [roadmap/01-phase1-portals.md](roadmap/01-phase1-portals.md) | Phase 1 — Staff & Student Portals | ✅ Complete |
| 2 | [roadmap/02-foundation-migrations.md](roadmap/02-foundation-migrations.md) | Foundation Migrations (2-Pre-A – 2-Pre-D) | ✅ Complete |
| 3 | [roadmap/03-phase2-academic-operations.md](roadmap/03-phase2-academic-operations.md) | Phase 2 — Academic Operations (2A–2I) | ✅ Complete |
| 4 | [roadmap/04-phase2.5-critical-fixes.md](roadmap/04-phase2.5-critical-fixes.md) | Phase 2.5 — Critical Security & Compliance Fixes | ✅ Complete (3 manual dashboard steps pending) |
| 5 | [roadmap/05-phase3-notifications.md](roadmap/05-phase3-notifications.md) | Phase 3 — Notification Engine & Alert Infrastructure | 🟢 Core complete (3A/3B/3D ✅, 3C email; pg_cron sweeps live — fee-due + low-attendance + outpass-overdue; only SMS/WhatsApp deferred) |
| 6 | [roadmap/06-phase4-campus-infrastructure.md](roadmap/06-phase4-campus-infrastructure.md) | Phase 4 — Campus Infrastructure & Laboratories (4A–4K) | ✅ Complete (4A ✅ · 4B ✅ · 4C ✅ · 4D ✅ · 4E ✅ · 4E-sub ✅ · 4F ✅ · 4G ✅ · 4H ✅ · 4I ✅ · 4J ✅ · 4K ✅) |
| 7 | [roadmap/07-phase5-admissions-lifecycle.md](roadmap/07-phase5-admissions-lifecycle.md) | Phase 5 — Admissions, Recruitment & Lifecycle Intake (5A–5L) | ✅ Complete (5A ✅ · 5A-sub ✅ · 5B ✅ · 5C ✅ · 5C-sub ✅ · 5D ✅ · 5E ✅ · 5F ✅ · 5G ✅ · 5H ✅ · 5I ✅ · 5J ✅ · 5K ✅ · 5L ✅) |
| 8 | [roadmap/08-phase6-portals-tools.md](roadmap/08-phase6-portals-tools.md) | Phase 6 — Parent Portals & Extended Digital Tools (6A–6H) | ✅ Complete (6A–6H ✅) |
| 9 | [roadmap/09-phase7-super-admin.md](roadmap/09-phase7-super-admin.md) | Phase 7 — Super Admin Panel / SaaS Multi-Tenancy (7A–7F-sub2) | ✅ Complete (7A–7F + SSR + IQAC Meeting Tracker — 8/8) |
| 9X | [AURA_CAMPUS_KNOWLEDGE_HUB.md](AURA_CAMPUS_KNOWLEDGE_HUB.md) | Phase 7X — Aura Knowledge Hub (KH-1 through KH-5) — *KH-1…KH-5 ✅ (Repository · Search · Collaboration · Analytics · AI Layer); semantic-search/pgvector deferred* | ✅ Complete |
| 10 | [roadmap/10-phase8-mobile-apps.md](roadmap/10-phase8-mobile-apps.md) | Phase 8 — React Native Mobile Apps & CCTV (8A–8F) | 🔲 Pending |
| 11 | [roadmap/11-erp-standards-register.md](roadmap/11-erp-standards-register.md) | Global Academic ERP Standards — Alignment & Gap Register | 📖 Reference |
| 12 | [roadmap/12-architecture-quality-register.md](roadmap/12-architecture-quality-register.md) | Architecture & Quality Improvement Register (A1–A8) | ⚙️ Ongoing |
| 13 | [roadmap/13-how-to-run.md](roadmap/13-how-to-run.md) | How to Run Full Stack Locally | 📖 Reference |
| 14 | [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md) | Deferred Items Register — consolidated rollup of all intentionally deferred work | 🗂️ Register |
| 15 | [AURA_CAMPUS_FINAL_COMPLETION_PLAN.md](AURA_CAMPUS_FINAL_COMPLETION_PLAN.md) | Final Completion Plan — Phase 8 + Arch A2 + Phase 9 (Business Readiness) + Aura Core extraction analysis + v1.0 Go/No-Go | 🎯 Plan |
| 16 | [AURA_V1_EXECUTION_TRACKER.md](AURA_V1_EXECUTION_TRACKER.md) | **v1.0 Execution Tracker — single source of truth to release** (Track 1 Phase 8 · Track 2 Arch A2 · Track 3 Phase 9 · Weekly Dashboard) | 📊 Live |

---

## 📋 Overall Progress Tracker

> **Last updated:** 2026-06-21  
> **85 of 92 modules complete — 92% of full platform built**

```
Overall  █████████████████████████████░  92%  (85/92)
Phase 1  ████████████████████████████████  100% (7/7   — Staff & Student Portals ✅)
Phase 2    ████████████████████████████████  100% (13/13 — All foundations + Academic Ops ✅)
Phase 2.5  ████████████████████████████████  100% (3/3  — Critical Security & Compliance Fixes ✅)
Phase 3    █████████████████████████████░  95%  (3A ✅ · 3B ✅ · 3C 🟡 email live · 3D ✅ notices · pg_cron sweeps live: fee-due + low-attendance + outpass-overdue · only SMS/WhatsApp deferred)
Phase 4    ████████████████████████████████  100% (12/12 — 4A ✅ · 4B ✅ · 4C ✅ · 4D ✅ · 4E ✅ · 4E-sub ✅ · 4F ✅ · 4G ✅ · 4H ✅ · 4I ✅ · 4J ✅ · 4K ✅)
Phase 5    ████████████████████████████████  100% (14/14 — 5A Admissions ✅ · 5A-sub CRM + Merit List ✅ · 5B Recruitment ✅ · 5C Non-Teaching Staff + Daily-Wage Payroll ✅ · 5C-sub Indian Statutory Payroll ✅ · 5D Alumni System ✅ · 5E Staff Appraisal + Workload ✅ · 5F Placement Cell ✅ · 5G Scholarship Management ✅ · 5H Disciplinary & Anti-Ragging ✅ · 5I Research & Publications ✅ · 5J Staff Attendance + LOP ✅ · 5K Career Lifecycle ✅ · 5L Department Budgets ✅)
Phase 6    ████████████████████████████████  100% (8/8  — 6A Parent Portal ✅ · 6B Transport ✅ · 6C Certificates ✅ · 6D Online Exams ✅ · 6E Feedback ✅ · 6F Grievances ✅ · 6G E-Learning/LMS ✅ · 6H Industry Connect/MOU ✅)
Phase 7    ████████████████████████████████  100% (8/8  — 7A · 7B · 7C · 7D Health/Security · 7E Billing · 7F IQAC · 7F-sub SSR Builder · 7F-sub2 IQAC Meeting Tracker ✅. The Knowledge Hub is a separate phase → Phase 7X, now complete ✅)
Phase 7X   ██████████████████████████████  100% (5/5 — KH-1 Repository ✅ · KH-2 Search ✅ · KH-3 Collaboration ✅ · KH-4 Analytics ✅ · KH-5 AI ✅ (AI summaries + RAG Knowledge Assistant; semantic-search/pgvector deferred pending an embedding provider))
Phase 8    █████████░░░░░░░░░░░░░░░░░░░░░░  ~30% (8A ✅ · 8B/8C/8F screens built (Expo-Go) · 8F parent app: authed /api/parent + read-only child screens · NFC/push/CCTV + in-app pay need EAS/device)
Arch       ██████████████████████████░░░░  88%  (7/8 + A2 🟡 — A8 Audit Log ✅ · A7 SaaS Billing ✅ (via 7E) · A1 Fine-grained RLS ✅ (audit + 1 leak fixed) · A3 FK Index Strategy ✅ (136→0 unindexed FKs) · A4 Onboarding Wizard ✅ · A5 CI/CD Pipeline ✅ · A6 Multi-currency/timezone ✅ (foundation; call-site sweep progressive) · A2 Test infra foundation)
```

### 📍 Where we are — 2026-06-21

**85 / 92 modules shipped (92%).** Phases **1, 2, 2.5, 4, 5, 6, 7, and 7X (Knowledge Hub) are complete**; Phase 3 is **core-complete** (in-app + email live; SMS/WhatsApp deferred). AURA is a working multi-tenant academic ERP (admissions → academics → finance → campus ops → portals) plus a SaaS operator console (`/admin`) with health, security, billing and IQAC/NAAC tooling. **Arch A1 (fine-grained RLS) audited & hardened** — every table RLS-protected, one cross-tenant leak found & fixed. **Arch A3 (index strategy)** — every foreign key now indexed (advisor: 136 → 0 unindexed FKs). **Arch A4 (onboarding wizard)** — new tenants are walked through Departments → Academic Year → Fees → Staff setup, gated behind `is_onboarded`. **Arch A5 (CI/CD)** — GitHub Actions runs typecheck/lint/tests + a from-zero migration replay on every push & PR; **validated end-to-end via PR #1**, schema made reproducible via a `pg_dump` baseline, and **branch protection** enforces PR + both checks on `main`. **Arch A6 (multi-currency/timezone)** — per-institution `currency`/`locale`/`timezone` + `src/lib/locale.ts` formatters + a Settings UI (call-site sweep progressive). **Phase 7X (Aura Knowledge Hub) is fully shipped** — KH-1 Repository → KH-2 Search → KH-3 Collaboration → KH-4 Analytics → KH-5 AI Layer (Claude AI summaries + RAG Knowledge Assistant), all merged via green PRs; pure-vector semantic search deferred pending an embedding provider (pgvector 0.8.0 enabled and ready).

- **Quality gates:** 653 Vitest unit tests green · `npx tsc --noEmit` clean · `npm run lint` **0 errors** (lint debt burned down 325→0; now a hard CI gate) · **CI green on PR #1** incl. from-zero migration replay (schema reproducible from git via the baseline) · **branch protection on `main`** (PR + both CI checks required) · Supabase security advisors show only the accepted baseline (intentional deny-all tables + public document-URL buckets, both documented in [roadmap/12](roadmap/12-architecture-quality-register.md) / `docs/rls-policy-map.md`) · perf advisor: **0 unindexed foreign keys** (Arch A3).

### ▶️ Next up — Phase 8: React Native Mobile & CCTV

8A complete (Expo SDK 54, role-adaptive shell for all 6 roles, Supabase auth, read-only portal screens); 8B/8C screens built; **8F parent app foundation built** — parent tier in the mobile shell, read-only child Home/Attendance/Results/Fees screens via a new authenticated `/api/parent` (JWT + link-verified service-role reads), pay deep-links to the web portal. All run in **Expo Go** (no EAS needed). **Remaining (need an EAS dev build + device/hardware):** 8B NFC attendance (Phase 4F cards + EAS), 8C/8F in-app Razorpay pay, 8D push notifications (+ parent push inbox & alerts), 8E CCTV, and parent self-link OTP. **Phase 7X (Knowledge Hub) is now complete** — Phase 8 (mobile/CCTV, EAS-gated) is the remaining frontier of the platform.

### ⏸️ Tracked deferrals (intentional — not blocking)

- **Phase 3C:** SMS (MSG91 + DLT) & WhatsApp (Meta) — wrappers stubbed; need paid accounts + DLT/Meta verification.
- **Phase 7E:** Razorpay *recurring* auto-charge + middleware-level feature gating (manual invoicing + page-level `isFeatureEnabled` ship now).
- **Phase 2.5 manual ops:** Supabase PITR (Pro plan), Vercel `RAZORPAY_WEBHOOK_SECRET`, UptimeRobot on `/api/scheduler-health` — see [`DISASTER_RECOVERY.md`](../DISASTER_RECOVERY.md).
- **Security:** leaked-password protection (needs Supabase Pro); full resource-restricting CSP (report-only rollout first) — see `docs/security-audit-plan.md`.
- Consolidated list: [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md).

---

| Phase | Feature | Status | Commit |
|-------|---------|--------|--------|
| ✅ Core | Auth, Multi-tenant, Middleware + Slug URL rewrite | Complete | — |
| ✅ Core | Institutions & Departments CRUD | Complete | — |
| ✅ Core | Staff & Students Directory | Complete | — |
| ✅ Core | AI Timetable Scheduler (FastAPI + OR-Tools) | Complete | — |
| ✅ Core | Attendance System (NFC + Manual) | Complete | — |
| ✅ Finance | Fee Structures | Complete | — |
| ✅ Finance | Fee Payments + Razorpay | Complete | — |
| ✅ Finance | Salary Management | Complete | — |
| ✅ Finance | Expense Logger | Complete | — |
| ✅ Finance | Reports Page | Complete | — |
| ✅ Finance | Fee Demand & Collection — per-student `fee_demands` (due dates + concessions), cohort demand generation, outstanding/overdue dashboard, student "My Dues", fee-due sweep (pg_cron); RLS + 9 unit tests | Complete | `20260615060000` |
| ✅ Phase 1A | Staff Portal (self-service) | Complete | — |
| ✅ Phase 1A | Staff Admin Preview (`/staff-portal/view/[staffId]`) | Complete | — |
| ✅ Phase 1A | Staff Portal Credentials (login/password/block per card) | Complete | — |
| ✅ Phase 1B | Student Portal (self-service) | Complete | — |
| ✅ Phase 1B | Student Admin Preview (`/student-portal/view/[studentId]`) | Complete | — |
| ✅ Phase 1B | Student Portal Credentials (login/password/block per row) | Complete | — |
| ✅ Phase 1B | Student Portal — Razorpay Pay Page | Complete | — |
| ✅ 2-Pre-A | Subjects Master Table + Teaching Assignments | Complete | — |
| ✅ 2-Pre-B | `academic_years` FK Migration for Existing Tables | Complete | — |
| ✅ 2-Pre-C | HOD Role + Department Head Designation | Complete | — |
| ✅ 2-Pre-D | Fee Concession & Waiver Management | Complete | — |
| ✅ Phase 2A | Academic Year Calendar + `academic_years` Master Table | Complete | — |
| ✅ Phase 2B | Semester Exam Planner + Hall Tickets | Complete | — |
| ✅ Phase 2C | Marks & Arrears Management | Complete | — |
| ✅ Phase 2D | Year Promotion & Graduation Workflow | Complete | — |
| ✅ Phase 2E | CIA / Internal Assessment Ledger (NAAC) | Complete | `1df3ab8` |
| ✅ Phase 2E+ | CIA Assessment Engine — weighted results, compute → publish (`cia_results`) | Complete | `aa1a694` |
| ✅ Phase 2E++ | CO/PO Outcome Mapping & Attainment (OBE — NBA/NAAC) | Complete | `2b65093` |
| ✅ Phase 2F | Syllabus & Curriculum Management | Complete | `f938ff0` |
| ✅ Phase 2G | Teacher Lesson Plan / Daily Diary | Complete | `986bfd2` |
| ✅ Phase 2H | Guest Lecture & Expert Talk Management | Complete | `76ac333` |
| ✅ Phase 2I | Internship & Industrial Training (NAAC 1.2 / NIRF 5.2) | Complete | — |
| ✅ Phase 2.5A | Razorpay Webhook Signature Verification 🔒 | Complete | `924abe9` |
| ✅ Phase 2.5B | DPDP 2023 Compliance — Consent & Erasure Framework 🔐 | Complete | `d75993d` |
| ✅ Phase 2.5C | Backup Strategy + Scheduler Resilience ☁️ | Complete | `8509ae6` |
| ✅ Phase 3A | Notification Infrastructure — `notifications` table + RLS + realtime, actions, `useNotifications` hook, bell + drawer in Topbar (all portals), pure-logic unit tests | Complete | `20260614000000` |
| ✅ Phase 3B | Notification Triggers — 5 event triggers wired (leave req/review, payment manual+webhook, salary single+bulk, schedule publish) via `notificationTriggers.ts`; fee-due + low-attendance sweeps deferred (need a scheduler) | Complete | `12738e5`+ |
| 🟡 Phase 3C | Email live (Resend) — `sendEmail` + templates (payment receipt, leave status, salary) wired into triggers; SMS + WhatsApp stubbed (deferred: paid + DLT/Meta verification) | Email done | `6f17d82`+ |
| ✅ Phase 3D | Digital Notice Board — `notices` table + RLS, admin manager (create/pin/delete, audience + dept targeting, expiry), staff & student portal boards, emergency/exam → in-app notification | Complete | `20260614010000` |
| ✅ Phase 4A | Library Management — catalog (search/filter), issue/return with copy accounting, overdue tracker + ₹2/day fines, staff & student "my library"; RLS + unit-tested fine math | Complete | `20260614020000` · `20260615070000` |
| ✅ Phase 4B | Auditorium & Space Booking — venue registry, staff booking requests with conflict detection, admin approval workflow + notes, colour-coded upcoming agenda | Complete | `20260614030000` |
| ✅ Phase 4C | Hostel Management + Mess Billing — hostels/rooms/allocations + occupancy grid, mess menu editor + monthly billing, maintenance (raise → warden board), hostel announcements, student "my hostel" view | Complete | `20260614040000` · `20260614050000` · `20260615070000` |
| ✅ Phase 4D | Laboratory Management — labs registry (type/dept filters), experiment syllabus + batches, session logging with attendance + lab marks grid; admin + assigned-assistant (staff portal) manage, student "my labs" view; RLS + 14 unit tests | Complete | `20260615000000` |
| ✅ Phase 4E | Asset & Inventory Management — categories (consumable/fixed), stock registry with reorder low-stock alerts, allocations to dept/lab/staff (stock auto-decrement + return), maintenance logs with running cost; admin-only, RLS + 11 unit tests | Complete | `20260615010000` |
| ✅ Phase 4E-sub | Vendor & Purchase Order Management — vendor registry, PO lifecycle (draft→submitted→approved→received→paid) with status timeline, GST line-item editor + auto PO-YYYY-NNNN, invoice upload, receive→asset auto-population (clears 4E-2); RLS + 12 unit tests | Complete | `20260615020000` |
| ✅ Phase 4F | Smart ID Card & NFC Card Registry — issue/lost/deactivate/replace flow, issued/active/lost stats, unique UID + one-active-card-per-holder; NFC webhook rejects lost/deactivated cards (403); RLS + 8 unit tests | Complete | `20260615030000` |
| ✅ Phase 4G | Gate Pass & Visitor Management — visitor logbook (check-in/out + ID proof/vehicle), student outpass workflow (apply → warden/admin approve/reject → security mark-returned), live overdue, hostel-warden approval; student + staff portals; RLS + 10 unit tests | Complete | `20260615040000` |
| ✅ Phase 4H | Student Clubs & Organizations (NSS/NCC/Cultural) | Complete | c1a528c |
| ✅ Phase 4I | Health & Medical Records (Infirmary) — `medical_records` (blood group, allergies, emergency contact, insurance) + `medical_visits` (symptoms, diagnosis, medicines dispensed JSONB, referral, follow-up); admin dashboard (today's visits, pending follow-ups, referral stats); log-visit drawer with patient search (student+staff); medical records manager; student portal health page; strict RLS (staff read all, student reads own); 24 unit tests | Complete | `20260615090000` |
| ✅ Phase 4J | Sports & Physical Education — `sports_facilities` + `sports_teams` + `sports_team_members` + `sports_achievements`; tabbed manager (Overview/Teams/Facilities); 2-step TeamDrawer (create→roster); AchievementDrawer (level/position/team-vs-individual); AchievementsManager with level filter + NIRF CSV export; student portal MySportsView (my teams + achievements sorted by prestige); Trophy sidebar icon; 28 unit tests | Complete | `dc8d836` |
| ✅ Phase 4K | Annual Day & Large Campus Event Management — `campus_events` (9 event types, committee JSONB, budget tracking, photo URLs) + `event_participants` (4 roles, student self-register); EventsManager (upcoming/past tabs, stat cards, NAAC CSV export); EventDetail (inline spend edit, committee roster, participants table); EventDrawer (committee builder with roles); student portal one-tap self-registration; academic calendar auto-sync; 48 unit tests | Complete | `dca2243` |
| ✅ Phase 5A | Student Admissions System — public apply + status form (`/admissions/[slug]`, no auth), admin pipeline (applied→shortlisted→interview→admitted→enrolled), one-click Enroll creates student + auth account + roll number; RLS (anon apply, admins manage) + 8 unit tests | Complete | `20260616000000` |
| ✅ Phase 5A-sub | Admissions CRM + Enquiry Management + Merit List — `admission_enquiries` funnel (new→contacted→interested→applied, +lost), convert-to-application (audit-logged), source breakdown, overdue follow-ups; merit list (rank by marks, CSV + print) + printable offer letters; Admissions sidebar NavGroup; 16 unit tests | Complete | `20260616020000` |
| ✅ Phase 5B | Staff Recruitment Module — `job_postings` + `job_applications`, 5-stage hiring pipeline (applied→screened→interview→offer→joined), interview scheduler, offer form, one-click Hire creates staff auth account + profile + staff record (mirrors enrollStudent); Recruitment sidebar link; 13 unit tests | Complete | `3f1f213` |
| ✅ Phase 5C | Non-Teaching Staff & Payroll — `staff_type` (5-value CHECK) + `daily_wage_rate` columns; `src/lib/staffTypes.ts` pure helpers; EditPersonModal/AddPersonModal/BulkUploadModal updated (staff_type dropdown + daily_wage_rate field + CSV cols 5-6); `generateDailyWageDisbursements` for daily-wage staff; `generateMonthlyDisbursements` skips daily-wage; role-aware staff portal dashboard (Quick Links for warden/support, daily-wage banner); 20 unit tests | Complete | `1f51a4b` |
| ✅ Phase 5C-sub | Indian Statutory Payroll — 3 DB tables (statutory_payroll_config / staff_tax_declarations / monthly_statutory_deductions) + RLS; pure computation lib (TDS new/old regime FY 2024-25, EPF, ESI, FY helpers); 7 server actions; admin dashboard (config panel + KPI strip + deduction table + Run + CSV export); Form 16 generator (per-staff annual breakdown + print); staff tax-declaration portal (regime selector + 80C/D/HRA/LTA form + deduction history); Sidebar links; 42 unit tests | Complete | `0ac0995` |
| ✅ Phase 5D | Alumni System & Panel — `alumni` + `alumni_announcements` tables + RLS (private `alumni_institution_ids()` SECURITY DEFINER helper avoids self-referential recursion); admin directory (stats, batch/dept/programme filters, CSV export, add/edit drawer), Import Graduates (carries over `students.is_graduated` logins), batch-targeted announcements; teal alumni portal (dashboard, self-service profile, directory); login + middleware route active alumni to `/alumni-portal`; 12 unit tests | Complete | `035d11a` |
| ✅ Phase 5E | Staff Appraisal & NAAC Workload Reports — `staff_appraisals` + `staff_appraisal_activities` + RLS (staff edit own while pending/submitted, admins manage, HODs dept-scoped) + `appraisal-docs` bucket; admin cycle overview (per-period stats + NAAC CSV), review panel (weighted 50/30/20 scoring + grade + Save/Finalize), faculty workload report (planned timetable hrs vs attendance sessions, range filter + CSV); staff self-appraisal portal (remarks + activity log + proof upload + submit); 17 unit tests | Complete | `79f8199` |
| ✅ Phase 5F | Placement Cell & Career Services — `companies` + `placement_drives` + `placement_registrations` + RLS (members read drives, students register own, admins manage); admin dashboard (KPI cards + drives + New Drive drawer w/ eligibility + process-stage builder), company registry, drive detail (status + per-registration stage pipeline + offer CTC + student notification), NIRF statistics (dept-wise + CSV); student portal (eligibility-gated one-click register, exclusivity block, live stage); 23 unit tests | Complete | `8a43dea` |
| ✅ Phase 5G | Scholarship Management — `scholarship_schemes` + `scholarship_applications` + RLS (members read, students apply own, admins manage) + `scholarship-docs` bucket; admin schemes registry (8 types + eligibility builder) & per-scheme verify→approve→disburse pipeline; fee integration (disburse → approved `fee_concession` deducts dues, audited + notifies); student portal (eligibility-gated apply + proof upload + track); EligibilityChecker; 13 unit tests | Complete | `ebd5caf` |
| ✅ Phase 5H | Disciplinary Records & Anti-Ragging (UGC) — `disciplinary_incidents` + `disciplinary_actions` + RLS (members report incl. anonymous, admins read/manage only); admin incident register (filters + NAAC 6.2 CSV) + detail (status flow + committee actions + suspension/fine + printable warning letter) + UGC anti-ragging register; student anonymous reporting form (no reporter identity stored); 9 unit tests | Complete | `8c5b3e9` |
| ✅ Phase 5I | Research & Publications Management (NAAC Criterion 3) — `research_projects` (+ funding_spent) + `publications` + RLS (members read, staff manage own pubs, admins manage) + `research-docs` bucket; admin dashboard (NAAC 3 KPIs + faculty leaderboard) + projects registry + publications directory (Scopus/UGC-CARE/type/year filters + NIRF CSV); staff portal logs own pubs → auto-creates `paper_published` activity on open appraisal (5E); 9 unit tests | Complete | `aaf9778` |
| ✅ Phase 5J | Staff Daily Attendance + LOP-Payroll Integration — `staff_attendance` + RLS (staff read own, admins manage, HOD dept); admin daily register (bulk-present + exceptions) + monthly report (present/absent/LOP/leave + attendance %, NAAC 2.4 avg, CSV); staff `/staff-portal/my-attendance`; leave approval auto-marks `on_leave`; payroll run deducts LOP (guarded/additive); 11 unit tests | Complete | `f3f6667` |
| ✅ Phase 5K | Staff Career Lifecycle (Increments, Transfers, Resignation) — `staff_career_events` + RLS + `staff-career-docs` bucket; increment versions `salary_structures`, promotion/transfer update staff designation/department, resignation/retirement/termination deactivate staff (audit-logged); admin career log + per-staff timeline; staff-portal read-only My Career; serviceYears() seniority calc; 23 unit tests | Complete | `29752a9` |
| ✅ Phase 5L | Department Budget Management (NAAC 6.4) — `department_budgets` + `budget_line_items` + RLS (admins any dept, HOD own dept); replaces the schema-drifted legacy `budgets` table (0 rows, broken consumer queries) and its "Set Budgets"/"Budget Report" UI; draft → submitted → approved/rejected workflow (approve/reject gated in Server Actions, not RLS); category-mapped actuals auto-synced from expense logger, PO spend surfaced for manual review; admin overview + detail page + CSV export; 11 unit tests | Complete | `0ce6b1e` |
| ✅ Phase 6A | Parent Portal (multi-child via junction table) — `parents` + `parent_student_links` + RLS; amber portal with cookie child-switcher (dashboard/attendance/results/fees ledger); child data served via service-role after verified link; login + middleware `aura-role=parent` routing + fence; admin create-parent-login + link/unlink children; 8 unit tests. Razorpay pay-on-behalf deferred | Complete | `a85f205` |
| ✅ Phase 6B | Transport Management — `vehicles` + `bus_routes` (JSONB stops) + `transport_allocations` + RLS (admins manage; student reads own allocation/route/vehicle); insurance/fitness expiry alerts (30-day window); admin vehicle registry + route list + route detail (stops timeline + allocations); student-portal My Transport page; `transport` fee type added; 14 unit tests | Complete | `eb1756c` |
| ✅ Phase 6C | Certificate & Document Generator — `certificate_requests` (student+staff holders, 10 doc types, requested→approved→issued/rejected, numbered) + RLS (admins manage; student reads/raises own); lib body-text templates + numbering; admin queue (issue/reject + direct staff letters) + printable letterhead document (print-to-PDF); student request/track/download portal; 12 unit tests | Complete | `048e0cc` |
| ✅ Phase 6D | Online Examination System — 5 tables (exams/questions/sessions/answers/violations) + RLS with answer-keys-never-leave-server design (student exam flow via service-role; admins manage; student reads own session + eligible exams); lib server-side auto-grading + timer; question-bank editor (MCQ single/multi + short); timed ExamPlayer with anti-cheating (tab-switch/fullscreen-exit/copy detection, 3=auto-submit+flag, session token); admin results dashboard + student review; CIA auto-push deferred (no exam_results table); 18 unit tests | Complete | `6153c1a` |
| ✅ Phase 6E | Student Feedback & Faculty Ratings — feedback_forms + feedback_responses (NO student_id) + feedback_submissions ledger + RLS (anonymity by unjoinable ledger; admins manage, rated faculty read own aggregates, students insert-only); lib aggregation + distributions + word-cloud; admin question-builder + report (stars/bars/word-cloud/comments); student fill page; staff own-ratings overview; 12 unit tests | Complete | `e937daf` |
| ✅ Phase 6F | Grievance Redressal System (NAAC 6.2) — `grievances` + RLS (admins manage, members file, named complainant reads own); anonymous grievances store no identity (CHECK-enforced); submitted → acknowledged → under_review → resolved/escalated/closed workflow with assignment, SLA deadline + overdue alerts; status-change notifications to named complainants; admin dashboard (stats + NAAC CSV) + case detail; student & staff portal submit/track; 15 unit tests | Complete | `51a8422` |
| ✅ Phase 6G | E-Learning & Study Materials (LMS) — study_materials + lms_assignments + lms_submissions + RLS (admins; teaching staff via teaching_assignments manage+grade own subjects; dept students read published + submit own) + 2 public storage buckets; lib gradebook aggregation + deadline/late + YouTube embed; admin materials/assignments/grader/gradebook; staff own-subject workspace; student materials browser + assignment submit; ScormPlayer; 28 unit tests | Complete | `4c8513f` |
| ✅ Phase 6H | Industry Connect & MOU Management — mou_partners + industry_interactions + admin RLS + mou-documents bucket; lib expiry bands (60/30-day) + UTC computeExpiry + stats + activity rollup + NAAC 7.1 CSV; MOU CRUD (+doc upload) + activity logging; admin registry (stats, expiry-alert banner, filters, MOUCard) + activity log + NAAC 7.1 export; ssrRegistry 7.1 live; 9 unit tests | Complete | `5018171` |
| ✅ Phase 7A | Super Admin Auth & Layout | Complete | `24f64f1` |
| ✅ Phase 7B | Platform Overview Dashboard | Complete | `24f64f1` |
| ✅ Phase 7C | Per-Institution Drill Down | Complete | `d21e9bd` |
| ✅ Phase 7D | Platform Health, Audit & Security — `platform_table_stats()` SECURITY DEFINER (service-role only) for live row-estimates + RLS coverage; SUPER_ADMIN health dashboard (scheduler ping, cross-institution payment failures, audit trail, DB counts) + security dashboard (live RLS % + ISO-27001 findings); security headers in next.config; rls-policy-map + security-audit-plan + query-performance docs; 7 unit tests | Complete | `d3ec04e` |
| ✅ Phase 7E | SaaS Subscription & Billing — subscription_plans + institution_subscriptions + subscription_invoices + RLS + seeded Starter/Pro/Enterprise; lib MRR/ARR + trial/expiry + limits; plan CRUD + assign/renew/cancel + invoices + isFeatureEnabled; /admin/billing + /plans + /invoices; Razorpay recurring deferred (manual now); 12 unit tests | Complete | `d70babd` |
| ✅ Phase 7F | IQAC & Govt Compliance — IQAC dashboard (criterion completeness rings via reused SSR aggregator + meeting/action health) + printable AQAR; NAAC/NIRF/AISHE delivered via the SSR Builder (reused, not duplicated); Sidebar IQAC links; 8 unit tests | Complete | `3cc2876` |
| ✅ Phase 7F-sub | NAAC SSR Builder — registry, readiness dashboard, Excel workbook + AISHE return + NIRF extract + print-PDF report | Complete | `3944ed7` |
| ✅ Phase 7F-sub2 | IQAC Meeting & Action Tracker (NAAC 6.1) — iqac_meetings + iqac_action_items + RLS; register + meeting detail (agenda, minutes editor, action items with inline status/overdue); ≥2-meetings/year compliance + resolved-% (built within 7F) | Complete | `3cc2876` |
| ✅ Arch A1 | Fine-grained RLS Policies — full audit of every `public` policy: all tables RLS-on, fine-grained SUPER_ADMIN/INST_ADMIN/HOD/owner scoping verified; found & fixed 1 cross-tenant leak (`staff_appraisal_activities: read` → owner-scoped); detector queries + findings in `docs/rls-policy-map.md` | Complete | `20260701000000` |
| 🟡 Arch A2 | Testing Strategy — Vitest + Playwright infra, assessment-engine unit tests (CIA/CO-PO/role), public-route smoke crawl, `docs/testing-guide.md` (retroactive action coverage + authed e2e flows progressive) | Foundation | `ea779f2`+ |
| ✅ Arch A3 | Database Index Strategy — idempotent migration covers every foreign key with `ix_<table>_<fk_cols>`; advisor `unindexed_foreign_keys` **136 → 0**; strategy + deferred RLS-perf backlog in `docs/query-performance.md` | Complete | `20260702000000` |
| ✅ Arch A4 | Institution Onboarding Wizard — `/onboarding/[id]` multi-step wizard (Departments → Academic Year → Fees → Staff CSV), `is_onboarded` flag + first-login redirect, admin-gated actions, 14 unit tests | Complete | `20260703000000` |
| ✅ Arch A5 | CI/CD Pipeline — GitHub Actions `ci.yml`: quality job (typecheck/lint/tests) + migrations job (from-zero schema replay + lint). **PR-validated end-to-end (PR #1: CI + Vercel preview all green)**; migration drift fixed via a `pg_dump` schema baseline (133 migrations squashed); **branch protection live** (require PR + both checks). Weekly encrypted backup (2.5C) | Complete | `287f280`, `be1b9e4` |
| ✅ Arch A6 | Multi-currency & Multi-timezone — `currency`/`locale`/`timezone` on institutions + `src/lib/locale.ts` (formatCurrency/formatDate, 14 tests) + Settings → Institution Settings UI + `useInstitutionLocalization()` hook. Storage stays UTC/raw. Call-site sweep (~128 files) progressive | Foundation | `20260704000000` |
| ✅ Arch A7 | SaaS Billing — delivered via Phase 7E (plans/subscriptions/invoices + MRR/ARR + feature gating); middleware enforcement + Razorpay recurring deferred | Complete | `d70babd` |
| ✅ Arch A8 | Platform-Wide Audit Log — `audit_logs` table + `logAudit()` helper | Complete | `b3c2ed0` |
| ✅ Phase 8A | React Native Setup — Expo SDK 54 + role-adaptive bottom-tab shell (all 6 roles) + Supabase auth + portal screens | Complete | `301be79` · tabs `fd762bd` · SDK54 `841bd2c` |
| 🟡 Phase 8B | Staff Mobile — Home, Schedule, Leave (apply), Payslip, Attendance view + admin/HOD Approvals; NFC marking deferred (Phase 4F + EAS) | Screens built | `64246fd` |
| 🟡 Phase 8C | Student Mobile — Home, Timetable, Attendance, Fees; in-app Razorpay pay + notification inbox pending | Screens built | `64246fd` |
| 🔲 Phase 8D | Push Notifications (Staff + Student + Parent) | Pending | — |
| 🔲 Phase 8E | CCTV Integration | Pending | — |
| 🟡 Phase 8F | Parent Mobile App — parent tier + read-only child Home/Attendance/Results/Fees via authed `/api/parent` (JWT + link-verified service-role reads); Pay deep-links to web portal; runs in Expo Go. Push inbox/alerts + self-link OTP + native pay deferred (8D/EAS) | Foundation | `046f8a6` |
| ✅ Phase 7X | Knowledge Hub — Vision & Architecture approved (see [AURA_CAMPUS_KNOWLEDGE_HUB.md](AURA_CAMPUS_KNOWLEDGE_HUB.md)) · **KH-1…KH-5 shipped** (Repository · Search · Collaboration · Analytics · AI Layer); semantic-search/pgvector deferred | Complete | `20260705000000`…`20260708000000` |
| ✅ Phase 7X-KH1 | Knowledge Hub — Basic Repository: `knowledge_resources` + three-tier RLS (institution/department/restricted) + `knowledge-hub` storage bucket; `src/lib/knowledgeHub.ts` (taxonomy/helpers, 12 tests); upload drawer (file/link + metadata), category/type/dept filters, download tally, publish/archive/delete; admin/HOD surface (faculty/student portal surfaces = follow-up) | Complete | `20260705000000` |
| ✅ Phase 7X-KH2 | Knowledge Hub — Search & Discovery: Postgres full-text search (trigger-maintained `tsvector` + GIN, server-side `searchResources`); faceted filters (type/dept/year/NAAC/tag); clickable tag cloud; discovery widgets (Most Downloaded, From Your Department); zero-results state; +6 unit tests | Complete | `20260706000000` |
| ✅ Phase 7X-KH3 | Knowledge Hub — Collaboration: 1–5 star ratings (trigger-maintained aggregate) · personal bookmarks + Saved filter · curated collections (create/add/remove/delete + filter) · `averageRating`/`relatedResources` helpers (+2 tests). Comments / share-links / download-milestone alerts deferred | Complete | `20260707000000` |
| ✅ Phase 7X-KH4 | Knowledge Hub — Analytics: dashboard (gated admin/HOD) with upload trend, by-category/department, top contributors, **Knowledge Health Score** (volume/diversity/currency/participation), faculty participation, **NAAC coverage + gap alerts**, CSV export; pure `knowledgeAnalytics.ts` (+8 tests). No schema change | Complete | `7ed3808`+ |
| ✅ Phase 7X-KH5 | Knowledge Hub — AI Layer: **AI Summaries** (Claude-generated abstracts, owner/admin-triggered) + **Knowledge Assistant** (admin/HOD RAG — retrieves over the KH-2 full-text index, Claude answers grounded in & citing documents, queries logged); pure `knowledgeAI.ts` (+8 tests); `@anthropic-ai/sdk`. Semantic search (pgvector embeddings) deferred — needs an embedding provider (Claude is generative-only). Live AI requires Anthropic account credit | Complete | `20260708000000` |

---

## 🛠️ Development Rules (Claude Must Always Follow)

1. **One step at a time** — complete and commit before moving to the next
2. **TypeScript strict** — run `npx tsc --noEmit` before every commit
3. **No old table names** — always use `institutions`, `staff`, `students`, `institution_members`
4. **RLS always on** — every new Supabase table must have RLS enabled
5. **Discriminated unions** — every Server Action returns `{ success: true } | { success: false, error }`
6. **revalidatePath** — call after every data mutation
7. **Glassmorphism UI** — maintain `bg-white/70 backdrop-blur-xl border-white/20` aesthetic
8. **Indian locale** — all currency formatted as INR with `en-IN` locale
9. **Git discipline** — commit message format: `feat: Phase X — Description`
10. **Never expose secrets** — `RAZORPAY_KEY_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` server-only
11. **Webhook security** — all incoming webhooks (Razorpay, NFC) must verify HMAC signatures before processing any payload
12. **Consent before PII** — any new page or action collecting personal data must check `data_consent_logs` for valid consent
13. **Audit trail** — every Server Action mutating `marks`, `cia_marks`, `fee_payments`, `salary_disbursements`, `student_promotions`, `fee_concessions`, `leave_requests`, `institution_members`, `lms_submissions`, `department_budgets`, `staff` (designation/department_id/is_active), or `salary_structures` **must** call `logAudit()` from `src/lib/auditLog.ts` — no exceptions
14. **Scheduler resilience** — all calls to the Python scheduler must go through the `callScheduler()` wrapper with timeout and fallback error handling
15. **Privacy by default** — new tables storing PII must document their data retention period in `src/lib/dataRetention.ts`
16. **No RLS bypass without justification** — `createAdminClient()` (service role) may only be used in server-only files; add a comment above each use explaining why RLS bypass is necessary
17. **Audit logs are immutable** — never add an UPDATE or DELETE RLS policy to `audit_logs`; never call `.delete()` or `.update()` on that table from any Server Action
18. **Tests are part of Definition of Done (Phase 3 onward)** — every new Server Action ships with a Vitest unit test for its core logic, every new page is added to the Playwright route-crawl smoke test, and every new user-facing flow gets a Playwright e2e test. See Arch A2
19. **Synchronize trackers** — upon completing any development phase or major step, immediately update `AURA_ROADMAP.md`, the corresponding roadmap phase file in `roadmap/`, and `FABLE5_EXECUTION_PLAN.md` with correct completion status and the exact git commit hashes, then commit these updates before proceeding.

---

## 🔐 Environment Variables Reference

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# Scheduler
SCHEDULER_API_URL=http://127.0.0.1:8000

# Notifications — Email (Phase 3C, Resend)
RESEND_API_KEY=
# Sender identity; defaults to Resend's onboarding sender until a domain is verified
EMAIL_FROM="AURA <onboarding@resend.dev>"

# SMS Gateway (MSG91 / Fast2SMS)
SMS_API_KEY=
SMS_SENDER_ID=

# WhatsApp Business API (Meta Cloud)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# NFC Webhook
AURA_NFC_WEBHOOK_SECRET=
AURA_INSTITUTION_TIMEZONE=Asia/Kolkata

# Razorpay Webhook (Phase 2.5A — REQUIRED)
RAZORPAY_WEBHOOK_SECRET=

# Database (for GitHub Actions backup workflow)
SUPABASE_DB_URL=

# Per-institution locale (future multi-region support)
# Override at institution level in institutions table:
# institutions.locale (default: 'en-IN')
# institutions.currency (default: 'INR')
# institutions.timezone (default: 'Asia/Kolkata')
```

---

*Last updated: 2026-06-10 — ERP Standards gap audit completed. Added Phase 2.5 (Razorpay webhook security, DPDP 2023 privacy, backup & scheduler resilience). Added Global ERP Standards register + Architecture & Quality register (8 items). Added 5A-sub (Admissions CRM), 5C-sub (Statutory Payroll — TDS/PF/ESI/Form 16), 4E-sub (Vendor & Purchase Orders), 7F-sub (NAAC SSR Builder + AISHE + NIRF). Closed all ERP gaps: Step 5L (Department Budget Management — NAAC 6.4), Phase 6G expanded to full LMS (SCORM + assignments + gradebook), Phase 7D expanded with ISO 27001 security audit checklist, Phase 7F expanded with AISHE field-level schema + IQAC Meeting & Action Tracker (NAAC 6.1). Added Arch A8 — Platform-Wide Audit Log (`audit_logs` table, `logAudit()` helper, append-only, NAAC/UGC/ISO 27001 compliant — resolves audit trail gap). Extended Dev Rules 10 → 17. Total: **87 tracked modules** across Foundation Migrations + 9 phases + Architecture track. Every NAAC criterion mapped. Next: Phase 2.5A — Razorpay Webhook Security Fix.*

*This roadmap was split into [`roadmap/`](roadmap/) on 2026-06-12 for readability — each phase now lives in its own file with a "Depends on / Feeds into" note. See the Roadmap Index above.*

*Update 2026-06-13 — **Mobile:** Phase 8A complete (Expo SDK 54, role-adaptive bottom tabs for all 6 roles, Supabase auth, portal screens); 8B/8C screens built (staff Leave/Payslip/Schedule/Attendance view + admin & HOD leave Approvals; student Dashboard/Timetable/Attendance/Fees) — NFC marking, push, in-app pay, CCTV and the Parent app remain deferred. **Web hardening (this session):** codebase audit + schema/code drift repairs (`57919e9`), PRINCIPAL role end-to-end + staff CIA marks entry (`b212733`), staff↔departments PostgREST embed disambiguation fix — repaired the empty admin Staff page and the staff-portal redirect loop (`a1af19a`), sidebar overhaul + collapse persistence (`a1af19a`), staff leave RLS fix (`1f21402`), web sidebar role-nav fix (`4ace308`). **Next new module:** Phase 3A — Notification Infrastructure.*