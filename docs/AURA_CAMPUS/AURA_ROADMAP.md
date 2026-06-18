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
| 7 | [roadmap/07-phase5-admissions-lifecycle.md](roadmap/07-phase5-admissions-lifecycle.md) | Phase 5 — Admissions, Recruitment & Lifecycle Intake (5A–5L) | 🟡 In progress (5A ✅ · 5A-sub ✅ · 5B ✅ · 5C ✅ · 5C-sub ✅ · 5D ✅ · 5E ✅ · 5F ✅ · 5G ✅ · 5H ✅ · 5I ✅ · 5J ✅) |
| 8 | [roadmap/08-phase6-portals-tools.md](roadmap/08-phase6-portals-tools.md) | Phase 6 — Parent Portals & Extended Digital Tools (6A–6H) | 🔲 Pending |
| 9 | [roadmap/09-phase7-super-admin.md](roadmap/09-phase7-super-admin.md) | Phase 7 — Super Admin Panel / SaaS Multi-Tenancy (7A–7F-sub2) | 🔲 Pending |
| 9X | [AURA_CAMPUS_KNOWLEDGE_HUB.md](AURA_CAMPUS_KNOWLEDGE_HUB.md) | Phase 7X — Aura Knowledge Hub (KH-1 through KH-5) — *Vision & Architecture approved; implementation begins after Phase 8* | 🗓️ Strategic Deferred |
| 10 | [roadmap/10-phase8-mobile-apps.md](roadmap/10-phase8-mobile-apps.md) | Phase 8 — React Native Mobile Apps & CCTV (8A–8F) | 🔲 Pending |
| 11 | [roadmap/11-erp-standards-register.md](roadmap/11-erp-standards-register.md) | Global Academic ERP Standards — Alignment & Gap Register | 📖 Reference |
| 12 | [roadmap/12-architecture-quality-register.md](roadmap/12-architecture-quality-register.md) | Architecture & Quality Improvement Register (A1–A8) | ⚙️ Ongoing |
| 13 | [roadmap/13-how-to-run.md](roadmap/13-how-to-run.md) | How to Run Full Stack Locally | 📖 Reference |
| 14 | [DEFERRED_REGISTER.md](DEFERRED_REGISTER.md) | Deferred Items Register — consolidated rollup of all intentionally deferred work | 🗂️ Register |

---

## 📋 Overall Progress Tracker

> **Last updated:** 2026-06-17  
> **66 of 87 modules complete — 76% of full platform built**

```
Overall  ████████████████████████░░░░░░░░  76%  (66/87)
Phase 1  ████████████████████████████████  100% (7/7   — Staff & Student Portals ✅)
Phase 2    ████████████████████████████████  100% (13/13 — All foundations + Academic Ops ✅)
Phase 2.5  ████████████████████████████████  100% (3/3  — Critical Security & Compliance Fixes ✅)
Phase 3    █████████████████████████████░  95%  (3A ✅ · 3B ✅ · 3C 🟡 email live · 3D ✅ notices · pg_cron sweeps live: fee-due + low-attendance + outpass-overdue · only SMS/WhatsApp deferred)
Phase 4    ████████████████████████████████  100% (12/12 — 4A ✅ · 4B ✅ · 4C ✅ · 4D ✅ · 4E ✅ · 4E-sub ✅ · 4F ✅ · 4G ✅ · 4H ✅ · 4I ✅ · 4J ✅ · 4K ✅)
Phase 5    ████████████████████░░░░░░░░░░░  86%  (12/14 — 5A Admissions ✅ · 5A-sub CRM + Merit List ✅ · 5B Recruitment ✅ · 5C Non-Teaching Staff + Daily-Wage Payroll ✅ · 5C-sub Indian Statutory Payroll ✅ · 5D Alumni System ✅ · 5E Staff Appraisal + Workload ✅ · 5F Placement Cell ✅ · 5G Scholarship Management ✅ · 5H Disciplinary & Anti-Ragging ✅ · 5I Research & Publications ✅ · 5J Staff Attendance + LOP ✅ · career/budget pending)
Phase 6    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%   (0/8  — Extended Portals & Tools + Full LMS)
Phase 7    ████████████████░░░░░░░░░░░░░░░░  50%  (4/8  — 7A ✅ · 7B ✅ · 7C ✅ · 7F-sub SSR Builder ✅)
Phase 7X   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  🗓️ Strategic Deferred  (Knowledge Hub KH-1→KH-5 · Vision 📐 approved · implementation after Phase 8)
Phase 8    █████░░░░░░░░░░░░░░░░░░░░░░░░░░░  17%  (1/6  — 8A ✅ · 8B/8C screens built · NFC/push/CCTV/Parent pending)
Arch       ██████░░░░░░░░░░░░░░░░░░░░░░░░░░  19%  (1/8 + A2 🟡 — Audit Log ✅ · Test infra (Vitest+Playwright) foundation · RLS, Indexes, CI/CD, Billing pending)
```

> **5C-sub Indian Statutory Payroll ✅ (commit `0ac0995`)** — 3 DB tables (statutory_payroll_config, staff_tax_declarations, monthly_statutory_deductions) + RLS; pure computation lib (TDS new/old regime, EPF, ESI, FY helpers); 7 server actions; admin dashboard with collapsible config panel, KPI strip, deduction table (Run + CSV export), Form 16 generator (per-staff breakdowns + print); staff tax-declaration portal (regime selector + 80C/D/HRA/LTA form + deduction history); Sidebar links; 42 unit tests. **5D Alumni System ✅ (commit `035d11a`)** — `alumni` + `alumni_announcements` tables + RLS; admin directory (stats, filters, CSV, Import Graduates, add/edit drawer) + batch-targeted announcements; teal alumni portal (dashboard, profile, directory); login + middleware route active alumni to `/alumni-portal`; 12 unit tests. **5E Staff Appraisal & Workload ✅ (commit `79f8199`)** — `staff_appraisals` + `staff_appraisal_activities` + RLS + `appraisal-docs` bucket; admin cycle overview + review panel (weighted 50/30/20 scoring) + faculty workload report (planned timetable hrs vs attendance sessions); staff self-appraisal portal with proof-document upload; 17 unit tests. **5F Placement Cell ✅ (commit `8a43dea`)** — companies + placement_drives + placement_registrations + RLS; admin dashboard/company registry/drive pipeline/NIRF statistics; eligibility-gated student registration with exclusivity block + stage-change notifications; 23 unit tests. **5G Scholarship Management ✅ (commit `ebd5caf`)** — scholarship_schemes + scholarship_applications + RLS + scholarship-docs bucket; admin registry + verify→approve→disburse pipeline with fee_concession integration (deducts dues, audited); student portal eligibility-gated apply + proof upload; 13 unit tests. **5H Disciplinary & Anti-Ragging ✅ (commit `8c5b3e9`)** — disciplinary_incidents + disciplinary_actions + confidentiality-first RLS (members report incl. anonymous, admins read/manage only); admin register + detail (committee actions + printable warning letter) + UGC anti-ragging register; student anonymous reporting form; 9 unit tests. **5I Research & Publications ✅ (commit `aaf9778`)** — research_projects + publications + RLS + research-docs bucket; admin dashboard/projects registry/publications directory (Scopus/UGC filters + NIRF CSV); staff log own pubs → auto-links to open appraisal (5E); 9 unit tests. **5J Staff Attendance + LOP ✅ (commit `f3f6667`)** — staff_attendance + RLS; admin daily register + monthly report (NAAC 2.4 avg + CSV); staff my-attendance; leave approval auto-marks on_leave; payroll LOP deduction (guarded); 11 unit tests. **Next up:** Phase 5K Staff Career Lifecycle Management. **Approved execution sequence: 5K → 5L → Phase 6 → Phase 7 → Phase 8 → Phase 7X (Knowledge Hub).** Knowledge Hub is intentionally deferred until the core Aura Campus platform reaches operational maturity — the vision and architecture are approved (see [AURA_CAMPUS_KNOWLEDGE_HUB.md](AURA_CAMPUS_KNOWLEDGE_HUB.md)) but KH-1 development does not begin until after Phase 8 is substantially complete. **5C Non-Teaching Staff ✅** — staff_type (5 values) + daily_wage_rate columns. **Phase 4 complete** — all 12 campus infrastructure modules shipped. **Scheduler now live:** pg_cron runs `private.sweep_overdue_outpasses` (30 min) + `private.sweep_low_attendance` (daily) — migration `20260615050000`. **Phase 3 deferred:** only 3C SMS (MSG91 + DLT) & WhatsApp (Meta) — wrappers stubbed. **Phase 2.5 manual leftovers:** PITR (Supabase Dashboard → Database → Backups → Point in Time, project `nsaheksysxinemtjcako`), GitHub repo secrets (`SUPABASE_DB_URL` + `BACKUP_ENCRYPTION_KEY`), UptimeRobot monitor on `/api/scheduler-health` (see [DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md))

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
| 🔲 Phase 5K | Staff Career Lifecycle (Increments, Transfers, Resignation) | Pending | — |
| 🔲 Phase 5L | Department Budget Management (NAAC 6.4) | Pending | — |
| 🔲 Phase 6A | Parent Portal (multi-child via junction table) | Pending | — |
| 🔲 Phase 6B | Transport Management + Vehicle Registry | Pending | — |
| 🔲 Phase 6C | Certificate & Document Generator (Student + Staff) | Pending | — |
| 🔲 Phase 6D | Online Examination System + Anti-Cheating | Pending | — |
| 🔲 Phase 6E | Student Feedback & Faculty Ratings | Pending | — |
| 🔲 Phase 6F | Grievance Redressal System (NAAC Criterion 6.2) | Pending | — |
| 🔲 Phase 6G | E-Learning & Study Materials LMS | Pending | — |
| 🔲 Phase 6H | Industry Connect & MOU Management (NAAC Criterion 7.1) | Pending | — |
| ✅ Phase 7A | Super Admin Auth & Layout | Complete | `24f64f1` |
| ✅ Phase 7B | Platform Overview Dashboard | Complete | `24f64f1` |
| ✅ Phase 7C | Per-Institution Drill Down | Complete | `d21e9bd` |
| 🔲 Phase 7D | Platform Health & Audit | Pending | — |
| 🔲 Phase 7E | SaaS Subscription & Billing Management | Pending | — |
| 🔲 Phase 7F | IQAC & Govt Compliance Reports (NAAC/NIRF/AISHE) | Pending | — |
| ✅ Phase 7F-sub | NAAC SSR Builder — registry, readiness dashboard, Excel workbook + AISHE return + NIRF extract + print-PDF report | Complete | `3944ed7` |
| 🔲 Phase 7F-sub2 | IQAC Meeting & Action Tracker (NAAC 6.1) | Pending | — |
| 🔲 Arch A1 | Fine-grained RLS Policies (HOD/STAFF/ADMIN) | Pending | — |
| 🟡 Arch A2 | Testing Strategy — Vitest + Playwright infra, assessment-engine unit tests (CIA/CO-PO/role), public-route smoke crawl, `docs/testing-guide.md` (retroactive action coverage + authed e2e flows progressive) | Foundation | `ea779f2`+ |
| 🔲 Arch A3 | Database Index Strategy | Pending | — |
| 🔲 Arch A4 | Institution Onboarding Wizard | Pending | — |
| 🔲 Arch A5 | CI/CD Pipeline (GitHub Actions) | Pending | — |
| 🔲 Arch A6 | Multi-currency & Multi-timezone Support | Pending | — |
| 🔲 Arch A7 | SaaS Billing — Minimal Viable (Trial + Expiry) | Pending | — |
| ✅ Arch A8 | Platform-Wide Audit Log — `audit_logs` table + `logAudit()` helper | Complete | `b3c2ed0` |
| ✅ Phase 8A | React Native Setup — Expo SDK 54 + role-adaptive bottom-tab shell (all 6 roles) + Supabase auth + portal screens | Complete | `301be79` · tabs `fd762bd` · SDK54 `841bd2c` |
| 🟡 Phase 8B | Staff Mobile — Home, Schedule, Leave (apply), Payslip, Attendance view + admin/HOD Approvals; NFC marking deferred (Phase 4F + EAS) | Screens built | `64246fd` |
| 🟡 Phase 8C | Student Mobile — Home, Timetable, Attendance, Fees; in-app Razorpay pay + notification inbox pending | Screens built | `64246fd` |
| 🔲 Phase 8D | Push Notifications (Staff + Student + Parent) | Pending | — |
| 🔲 Phase 8E | CCTV Integration | Pending | — |
| 🔲 Phase 8F | Parent Mobile App | Pending | — |
| 🗓️ Phase 7X | Knowledge Hub — Vision & Architecture approved (see [AURA_CAMPUS_KNOWLEDGE_HUB.md](AURA_CAMPUS_KNOWLEDGE_HUB.md)) · **Strategic Deferred — begins after Phase 8** | Strategic Deferred | — |
| 🗓️ Phase 7X-KH1 | Knowledge Hub — Basic Repository (upload, categorize, three-tier permissions, Storage bucket) | Deferred — Future | — |
| 🗓️ Phase 7X-KH2 | Knowledge Hub — Search & Discovery (PG full-text, faceted filters, browse mode, smart discovery widgets) | Deferred — Future | — |
| 🗓️ Phase 7X-KH3 | Knowledge Hub — Collaboration (ratings, bookmarks, curated collections, share links) | Deferred — Future | — |
| 🗓️ Phase 7X-KH4 | Knowledge Hub — Analytics (usage metrics, dept insights, Knowledge Health Score, NAAC gap analysis) | Deferred — Future | — |
| 🗓️ Phase 7X-KH5 | Knowledge Hub — AI Layer (semantic search/pgvector, AI summaries via Claude API, Knowledge Assistant/RAG) | Deferred — Future | — |

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
13. **Audit trail** — every Server Action mutating `marks`, `cia_marks`, `fee_payments`, `salary_disbursements`, `student_promotions`, `fee_concessions`, `leave_requests`, `institution_members`, `lms_submissions`, or `department_budgets` **must** call `logAudit()` from `src/lib/auditLog.ts` — no exceptions
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