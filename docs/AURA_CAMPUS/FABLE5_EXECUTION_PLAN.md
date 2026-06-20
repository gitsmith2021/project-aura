# 🎯 Aura Roadmap — Fable 5 Execution Plan
> **Purpose:** Strategic guide for maximizing Claude Fable 5's free window (June 9–22, 2026).
> Use this file to decide which model to use for each module.
> Always read `AURA_ROADMAP.md` alongside this file for full technical context.

---

## ⚠️ Critical Note on "Free Until June 22"

Fable 5 is included in Pro/Max/Team plans until June 22 — but it counts
**roughly 2× the usage** of Opus toward your plan limits.

**Rules for using Fable 5:**
- Use it surgically — only for Tier 1 (highest complexity) tasks
- Give one large, complete prompt per session (don't chat back and forth)
- Always start prompt with: `"Read AURA_ROADMAP.md (the index), then the matching roadmap/XX-*.md for this module's full spec"`
- Always end prompt with: `git add -A && git commit -m "..." && git push origin main`
- Let Claude Code's auto-compact handle context management automatically

---

## 🔴 TIER 1 — Use Claude Fable 5
> Multi-file, cross-system, long-horizon tasks that require holding
> the entire codebase in context and self-verifying across many files.

| # | Module | Phase | Why Fable 5 is Required |
|---|--------|-------|------------------------|
| 1 | **Landing Page** (GSAP + Three.js + Lenis) | Pre-Phase | 15 interdependent components, Three.js shaders, scroll system architecture, performance optimization across all devices |
| 2 | **Razorpay Webhook Security** | Phase 2.5A | Cryptographic HMAC verification, idempotency logic, replay attack prevention, signature validation across payment flows |
| 3 | **DPDP Act 2023 Compliance** | Phase 2.5B | Consent management system, data erasure flows, legal requirement mapping across all 87 modules, privacy policy engine |
| 4 | **Platform-Wide Audit Log** | Phase 2.5C / A8 | Trigger wiring across every table, Postgres functions, RLS policies, tamper-proof log architecture for NAAC/ISO 27001 |
| 5 | **Super Admin Analytics Dashboard** | Phase 3B | Cross-institution data aggregation, complex SQL views, multi-tenant reporting, recharts visualizations at scale |
| 6 | **CIA / Continuous Assessment Engine** | Phase 4A | Internal marks entry, assessment calculation engine, component weighting, result processing, CO/PO mapping |
| 7 | **NAAC SSR Builder** | Phase 7A | Maps all 87 modules to NAAC criteria, auto-generates PDF reports, SSR section templates, accreditation evidence bundler |
| 8 | **React Native App Setup + NFC** | Phase 8A | New monorepo setup, Expo configuration, NFC library wiring, Supabase auth on mobile, shared types from web |

---

## 🟡 TIER 2 — Either Model Works
> Moderate complexity, contained scope. Use Fable 5 if still in free window
> and you have allowance left. Otherwise Opus 4.8 handles these well.

| Module | Phase | Notes |
|--------|-------|-------|
| Notifications Infrastructure | Phase 2A | Standard DB schema + Supabase realtime subscription |
| Notification Triggers | Phase 2B | Wiring into existing modules, straightforward event system |
| Resend Email Integration | Phase 2C | API integration, email templates, sendEmail() wrapper |
| Super Admin Auth & Layout | Phase 3A | Auth middleware extension + new layout, familiar patterns |
| Per-Institution Drill Down | Phase 3C | Extends existing institution pages with analytics |
| Platform Health Dashboard | Phase 3D | Status checks, ping endpoints, error rate monitoring |
| Admissions CRM | Phase 5A | CRUD-heavy, standard SaaS patterns |
| Curriculum & Syllabus Manager | Phase 5B | Document management, structured data |
| Guest Lectures & Events | Phase 5C | Event scheduling, certificate generation |
| Exam Management | Phase 4C | Exam scheduling, hall tickets, seating |
| LMS Core (assignments + gradebook) | Phase 6A | Standard LMS patterns, file uploads |
| Student Mobile Screens | Phase 8C | Extends staff mobile patterns |

---

## 🟢 TIER 3 — Use Sonnet 4.6
> Simple, focused, single-file or single-feature tasks.
> Save Fable 5 allowance for Tier 1.

| Module | Phase | Notes |
|--------|-------|-------|
| Email HTML Templates | Phase 2C | Static HTML email designs only |
| Leave Management additions | Phase 5 | Small extension to existing module |
| Bug fixes & UI tweaks | Any | Single component edits |
| Migration SQL files | Any | Straightforward SQL, no logic |
| AURA_ROADMAP.md updates | Any | Documentation only |
| Individual modal components | Any | Isolated UI components |
| TypeScript type additions | Any | Type definition files only |
| Test data / seed files | Any | SQL seed data |

---

## 📅 Fable 5 Battle Plan — Module Sequence

> **8 Tier 1 modules · run in order · well ahead of the June 22 window close**

```
[x] 1   🎨  Landing Page (GSAP + Lenis)
[x] 2   🔐  Phase 2.5A — Razorpay Webhook Security
[x] 3   🔐  Phase 2.5B — DPDP Act 2023 Compliance
[x] 4   🔐  Phase 2.5C — Platform-Wide Audit Log (A8)
[x] 5   📊  Super Admin Analytics Dashboard (roadmap Phase 7A+7B)
[x] 6   📊  Per-institution drill down + reports (roadmap Phase 7C)
[x] 7   📚  CIA Assessment Engine — weighted results + publish flow
[x] 8   📚  CO/PO outcome mapping + attainment reports (OBE)
[x] 9   🏛️  NAAC SSR Builder scaffold (roadmap 7F-sub: registry + readiness)
[x] 10  🏛️  NAAC SSR exports (Excel workbook, AISHE return, NIRF extract, print report)
[x] 11  📱  Phase 8A — Aura Mobile foundation (Expo SDK 54 + role-adaptive bottom tabs, all 6 roles + auth + portal screens) — Opus
[~] 12  📱  Phase 8B/8C screens — staff Leave/Payslip/Schedule, admin+HOD Approvals, student Dashboard/Fees/Attendance — Opus
[x] +   🏛️  Phase 4 Campus Infra COMPLETE (4A Library · 4B Bookings · 4C Hostels · 4D Labs · 4E Assets · 4E-sub Vendors/PO · 4F ID Cards · 4G Gate · 4H Clubs · 4I Infirmary · 4J Sports · 4K Events) — Opus/Sonnet
[ ] —   ⏳  Remaining: NFC (Phase 4F + EAS), push (Phase 3), in-app pay, CCTV, Parent app (Phase 6A)
─────────────────────────────────────────────────────
After the free window → Switch to Opus 4.8 / Sonnet 4.6 for Tier 2 & 3
```

---

## 🧠 Prompt Template for Fable 5 Sessions

Use this template at the start of every Fable 5 session in Claude Code:

```
Read AURA_ROADMAP.md in the project root for the index, then read the
roadmap/XX-*.md file that covers this module for its full spec.
(AURA_ROADMAP.md is now a slim index — the detailed phase specs live in
the roadmap/ folder, e.g. Audit Log → roadmap/12-architecture-quality-register.md,
Phase 8 → roadmap/10-phase8-mobile-apps.md.)
We are building Aura 1.0 — a premium multi-tenant EdTech SaaS.

Current task: [MODULE NAME] — [PHASE]

Tech stack: Next.js 16.2.4 App Router, TypeScript strict, Tailwind CSS,
Supabase (@supabase/ssr), Lucide React, Recharts.
(This fork of Next.js has breaking changes vs. training-data assumptions —
read node_modules/next/dist/docs/ for the relevant guide before writing code,
per AGENTS.md.)

Key rules (non-negotiable):
- Table names: institutions, staff, students, institution_members (never old names)
- Server Actions return: { success: true, data } | { success: false, error: string }
- Always call revalidatePath() after mutations
- Auth: supabase.auth.getUser() only
- Use institution_id (never tenant_id)
- Run npx tsc --noEmit before committing

[PASTE FULL MODULE SPEC HERE]

After all files are built and TypeScript passes:
npm run build   # must pass clean before committing — never skip
git add -A
git commit -m "feat: [Phase X] — [Module Name] complete"
# Do NOT auto-push — review the build locally, then push manually when ready
```

---

## 🎛️ Prompting Fable 5 (it's not Opus)

> Fable 5 is the most capable widely released Claude model — but it responds to
> prompts **differently** from Opus/Sonnet. Anthropic's own guidance is that
> prompts written for earlier models are *often too prescriptive for Fable 5 and
> reduce its output quality.* Our `roadmap/*.md` specs are deliberately
> prescriptive (exact file paths, step-by-step "What to build" lists) — which is
> great for Opus/Sonnet but can **suppress** Fable 5's quality. Adjust how you
> drive it:

- **Goal + constraints, not a to-do list.** Paste the module spec for *context*,
  but frame the actual ask as the outcome you want plus the non-negotiable rules.
  Let Fable 5 architect the module's structure rather than dictating every step.
  It plans better than it follows checklists.
- **Expect long turns.** A single Fable 5 request on a hard module can run *many
  minutes* (10–15 min is normal at high effort). A long pause is the model
  working, not a hang — don't interrupt it.
- **Run Tier 1 at high effort.** These are the intelligence-sensitive tasks Fable
  5 exists for — use `high` or `xhigh` effort, not the defaults.
- **A/B the first module both ways.** For module 1, try the full prescriptive
  spec vs. a goal-and-constraints framing, and keep whichever produces better
  code. Use that as the template for the rest of the window.
- **If a security module refuses, that's the safety classifier.** Fable 5 runs
  classifiers that target cybersecurity content and can occasionally
  false-positive on *legitimate* security work — most likely on **Day 2
  (Razorpay webhook/HMAC)** and **Day 3 (DPDP)**. If a session returns a refusal,
  rephrase around the legitimate engineering goal; don't assume the model broke.
- **Cost reality:** Fable 5 is ~2× Opus per token *and* its tokenizer counts ~30%
  more tokens for the same content → effectively **~2.6× Opus** for an identical
  task. That's the real price of every Tier 1 day — keep Tier 2/3 off Fable 5.

---

## 📊 Value Estimate: Fable 5 Window vs. Post-Window

| Scenario | Time Estimate |
|----------|--------------|
| 8 Tier 1 modules with Fable 5 (autonomous, self-verifying) | ~11 days |
| Same 8 modules with Sonnet 4.6 (more back-and-forth) | ~4–6 weeks |
| **Time saved by using Fable 5 strategically** | **~3–5 weeks** |

---

## ✅ Completion Tracker

| Module | Model Used | Status | Commit |
|--------|-----------|--------|--------|
| Landing Page (GSAP + Three.js) | Fable 5 | ✅ Complete (June 12) | `f86eeb7` |
| Razorpay Webhook Security | Fable 5 | ✅ Complete (June 12) | `924abe9` |
| DPDP Act 2023 Compliance | Fable 5 | ✅ Complete (June 12) | `d75993d` |
| Platform Audit Log (A8) | Fable 5 | ✅ Complete (June 12) | `b3c2ed0` |
| Super Admin Dashboard | Fable 5 | ✅ Complete (7A+7B `24f64f1` · 7C drill-down `d21e9bd`) | `d21e9bd` |
| CIA Assessment Engine | Fable 5 | ✅ Complete — engine `aa1a694` + CO/PO mapping & attainment `2b65093` (June 12) | `2b65093` |
| NAAC SSR Builder | Fable 5 | ✅ Complete — scaffold `e254e47` + export hub (Excel/AISHE/NIRF/PDF) `3944ed7` | `3944ed7` |
| React Native Mobile (8A + 8B/8C screens) | Opus 4.8 | ✅ 8A complete · 8B/8C screens built — Expo SDK 54, role-adaptive tabs (6 roles), staff Leave/Payslip/Schedule, admin/HOD Approvals, student Dashboard/Fees/Attendance (NFC/push/CCTV/Parent deferred) | `301be79` · `fd762bd` · `64246fd` |
| Phase 4 Campus Infrastructure (4A–4H) | Opus 4.8 | ✅ Library · Bookings · Hostels · Laboratories · Assets · Vendors/PO · ID Cards · Gate · Clubs complete (infirmary/sports/events pending) | `c1a528c` |
| Notifications Infrastructure | Opus/Sonnet | 🔲 Pending | — |
| Notification Triggers | Opus/Sonnet | 🔲 Pending | — |
| Resend Email Integration | Opus/Sonnet | 🔲 Pending | — |
| Super Admin Auth & Layout | Opus/Sonnet | 🔲 Pending | — |
| Admissions (5A + 5A-sub CRM/Merit List) | Opus/Sonnet | ✅ 5A apply/pipeline/enroll + 5A-sub enquiry funnel, convert-to-application, merit list (CSV/print) + offer letters | `20260616020000` |
| Recruitment (5B) | Sonnet 4.6 | ✅ job_postings + job_applications, 5-stage kanban, interview scheduler, offer form, one-click hire → staff account; 13 unit tests | `3f1f213` |
| Non-Teaching Staff & Payroll (5C) | Sonnet 4.6 | ✅ staff_type + daily_wage_rate columns; pure helpers (20 unit tests); EditPersonModal/AddPersonModal/BulkUploadModal updated; generateDailyWageDisbursements; role-aware staff portal (warden hostel link, wage banner) | `1f51a4b` |
| Indian Statutory Payroll (5C-sub) | Sonnet 4.6 | ✅ TDS (new/old regime FY 2024-25) + EPF + ESI; 3 DB tables + RLS; pure lib + 42 unit tests; admin dashboard (config panel, KPI strip, Run, CSV, Form 16 generator); staff tax-declaration portal; Sidebar links; dataRetention updated | `0ac0995` |
| Alumni System & Panel (5D) | Opus 4.8 | ✅ alumni + alumni_announcements tables + RLS (private alumni_institution_ids helper); admin directory (stats, filters, CSV, Import Graduates, add/edit drawer) + batch announcements; teal alumni portal (dashboard, profile, directory); login+middleware alumni routing; 12 unit tests | `035d11a` |
| Staff Appraisal & Workload (5E) | Opus 4.8 | ✅ staff_appraisals + staff_appraisal_activities + RLS (staff/admin/HOD-dept) + appraisal-docs bucket; admin cycle overview + review panel (weighted 50/30/20 scoring) + faculty workload report (planned vs attendance hours, CSV); staff self-appraisal portal with proof upload; 17 unit tests | `79f8199` |
| Placement Cell & Career Services (5F) | Opus 4.8 | ✅ companies + placement_drives + placement_registrations + RLS; admin dashboard/company registry/drive pipeline (stage tracking + offer CTC + student notify)/NIRF statistics (dept-wise + CSV); eligibility-gated student registration with exclusivity block; 23 unit tests | `8a43dea` |
| Scholarship Management (5G) | Opus 4.8 | ✅ scholarship_schemes + scholarship_applications + RLS + scholarship-docs bucket; admin registry (8 types + eligibility builder) & verify→approve→disburse pipeline; fee integration (disburse → approved fee_concession deducts dues, audited + notify); student portal eligibility-gated apply + proof upload + track; EligibilityChecker; 13 unit tests | `ebd5caf` |
| Disciplinary & Anti-Ragging (5H) | Opus 4.8 | ✅ disciplinary_incidents + disciplinary_actions + confidentiality-first RLS (members report incl. anonymous, admins read/manage only); admin register + detail (committee actions, suspension/fine, printable warning letter) + UGC anti-ragging register + NAAC 6.2 CSV; student anonymous reporting form; 9 unit tests | `8c5b3e9` |
| Research & Publications (5I) | Opus 4.8 | ✅ research_projects + publications + RLS (staff manage own pubs, admins manage) + research-docs bucket; admin dashboard (NAAC 3 KPIs + faculty leaderboard) + projects registry + publications directory (Scopus/UGC filters + NIRF CSV); staff log own pubs → auto-links to open appraisal (5E); 9 unit tests | `aaf9778` |
| Staff Attendance + LOP (5J) | Opus 4.8 | ✅ staff_attendance + RLS (staff read own, admins manage, HOD dept); admin daily register (bulk-present + exceptions) + monthly report (NAAC 2.4 avg + CSV); staff my-attendance; leave approval auto-marks on_leave; payroll run deducts LOP (guarded/additive); 11 unit tests | `f3f6667` |
| Staff Career Lifecycle (5K) | Sonnet 4.6 | ✅ staff_career_events + RLS (staff own / admin / HOD-dept) + staff-career-docs bucket; increment versions salary_structures (deactivate-old/insert-new), promotion/transfer update staff.designation/department_id, resignation/retirement/termination deactivate staff.is_active — all audit-logged; admin career log (filters + NAAC CSV) + per-staff timeline with resign/retire shortcuts; staff-portal read-only My Career; serviceYears() seniority calc; 23 unit tests | `29752a9` |
| Department Budget Management (5L) | Sonnet 4.6 | ✅ department_budgets + budget_line_items + RLS (admins any dept, HOD own dept) — replaces schema-drifted legacy `budgets` table (0 rows, broken `academic_year` column queries) and its Set Budgets/Budget Report UI; draft→submitted→approved/rejected workflow (approve/reject gated in Server Actions, not RLS); category-mapped actuals auto-synced from expense logger, PO spend surfaced for manual review; admin overview + detail page + CSV export; 11 unit tests | `0ce6b1e` |
| Parent Portal (6A) | Opus 4.8 | ✅ parents + parent_student_links + RLS; amber parent portal with cookie child-switcher (dashboard/attendance/results/fees ledger); child data via service-role after verified link; login+middleware aura-role=parent routing + fence; admin create-parent-login + link/unlink children; 8 unit tests; Razorpay pay-on-behalf deferred | `a85f205` |
| Transport Management (6B) | Opus 4.8 | ✅ vehicles + bus_routes (JSONB stops) + transport_allocations + RLS (admins manage; student reads only own allocation/route/vehicle via auth.email() ownership); lib expiry classification (30-day insurance/fitness alerts) + stop/pickup helpers; vehicle CRUD + route CRUD + allocate/unassign actions; admin vehicle registry + route list + route detail (stops timeline + allocations); student-portal My Transport page; `transport` fee_structures type added; dataRetention entry; 14 unit tests | `eb1756c` |
| Certificate & Document Generator (6C) | Opus 4.8 | ✅ certificate_requests (student+staff holders via requester_type CHECK, 10 doc types, requested→approved→issued/rejected, sequential numbered) + RLS (admins manage; student reads/raises own); lib type metadata + numbering + per-type formal body templates; actions request/approve/reject/issue + direct staff-letter issuance + RLS-gated print reader; printable letterhead CertificateDocument (print-to-PDF) shared by admin+student; admin queue + student request/track/download portal; dataRetention entry; 12 unit tests | `048e0cc` |
| Online Examination System (6D) | Opus 4.8 | ✅ 5 tables (online_exams/questions/sessions/answers/violations) + RLS designed so answer keys never reach the client — student exam flow runs via service-role server actions that strip correct_keys and grade server-side; admins manage, student reads own session + eligible published exams; lib auto-grading (mcq/multi exact-set, short normalized, no partial) + window/timer maths; question-bank editor (MCQ single/multi + short); timed ExamPlayer (countdown, palette, fullscreen + tab-switch + copy detection, 3 violations=auto-submit+flag, unique session_token); admin results dashboard + student review; CIA gradebook auto-push deferred (exam_results table absent); dataRetention entry; 18 unit tests | `6153c1a` |
| Student Feedback & Faculty Ratings (6E) | Opus 4.8 | ✅ feedback_forms + feedback_responses (NO student_id, anonymity by design) + feedback_submissions ledger (unjoinable, unique(form_id,student_id) blocks double-submit) + RLS (admins manage; rated faculty read own aggregates via staff.email; students insert-only, never read responses); lib per-question aggregation + 1–5★ distributions + response-rate + stopword-filtered word cloud; actions form CRUD (details-edit preserves questions) + ledger-guarded submit + report builder (service-role eligible-count); admin question-builder + report (stars/bars/word-cloud/comments), student fill page, staff own-ratings overview; dataRetention entry; 12 unit tests | `e937daf` |
| Grievance Redressal System (6F) | Opus 4.8 | ✅ grievances + RLS (admins manage; members file with status forced to submitted + submitter=self/NULL; named complainant reads only own) — anonymous grievances store NO complainant identity (submitted_by NULL, CHECK-enforced) and are untrackable by design; lib SLA/overdue maths (30-day NAAC target) + stats (resolution rate, within-SLA %, avg days-to-resolve, overdue) + NAAC 6.2 CSV; actions submit (anonymous-aware) + complainant tracking + acknowledge/assign/deadline/status with status-change notifications to named complainants; admin dashboard (KPIs + filters + overdue banner + CSV) + case-detail workflow; shared student/staff portal submit+track view; Sidebar (Governance + both portals) + dataRetention + ssrRegistry 6.2 live; 15 unit tests | `51a8422` |
| E-Learning & Study Materials / LMS (6G) | Opus 4.8 | ✅ study_materials + lms_assignments + lms_submissions + RLS (admins; teaching staff via teaching_assignments manage+grade own subjects; dept students read published + submit own) + 2 public storage buckets (study-materials/lms-submissions); lib gradebook aggregation (student×assignment matrix, per-student/per-assignment avg, cell states) + deadline/late + YouTube embed; actions material CRUD/publish + assignment CRUD + grading + student submit (late-flag, deadline-enforced, upsert resubmit) + gradebook builder; admin overview/materials/assignments/grader/gradebook; staff own-subject workspace; student materials accordion + assignment submit/grade view; ScormPlayer (iframe+postMessage); dataRetention entry; 28 unit tests | `4c8513f` |
| Industry Connect & MOU Management (6H) | Opus 4.8 | ✅ mou_partners + industry_interactions + admin RLS + mou-documents bucket; lib expiry bands (60-day warn/30-day critical) + UTC-safe computeExpiry + stats + per-partner activity rollup + NAAC 7.1 CSV; MOU CRUD (+document upload, activate toggle) + activity logging; admin registry (stats strip, expiry-alert banner, status filters, MOUCard urgency badge) + activity log page + one-click NAAC 7.1 export; Sidebar link + dataRetention + ssrRegistry 7.1 live; 9 unit tests. **Phase 6 complete (8/8).** | `5018171` |
| Platform Health, Audit & Security (7D) | Opus 4.8 | ✅ public.platform_table_stats() SECURITY DEFINER (service-role-only, off the authenticated-execute advisor list) for live row-estimate + RLS coverage; lib error-rate/RLS-coverage/compact-number (7 tests); SUPER_ADMIN-gated platformHealth actions (scheduler ping, cross-institution payment failures, audit trail, DB counts) + security posture (live RLS % + ISO-27001 findings); /admin/health + /admin/security dashboards + AdminNav tabs; security headers in next.config.ts (full CSP deferred); docs/rls-policy-map + security-audit-plan + query-performance | `d3ec04e` |
| SaaS Subscription & Billing (7E) | Opus 4.8 | ✅ subscription_plans + institution_subscriptions + subscription_invoices + RLS (SUPER_ADMIN manage; inst-admin reads own) + seeded Starter/Pro/Enterprise; lib feature catalog + MRR/ARR (paying-only, annual amortised) + trial/expiry countdown + limit checks (12 tests); plan CRUD + assign/renew/cancel + invoice generate/mark + getBilling + isFeatureEnabled (default-allow); /admin/billing + /plans + /invoices dashboards; Razorpay recurring + middleware gating deferred (manual now) | `d70babd` |
| Curriculum & Syllabus | Opus/Sonnet | 🔲 Pending | — |
| Exam Management | Opus/Sonnet | 🔲 Pending | — |
| LMS Core | Opus 4.8 | ✅ Delivered as Phase 6G (see above) | `4c8513f` |
| Student Mobile Screens | Opus/Sonnet | 🔲 Pending | — |
| NAAC SSR continued | Opus/Sonnet | 🔲 Pending | — |

---

*Fable 5 free window active until June 22, 2026 — running well ahead of schedule. All 10 Tier‑1 web/data modules complete; mobile (module 11) built on Opus — Phase 8A done + 8B/8C screens built; NFC/push/CCTV/Parent remain.*
*Reference: AURA_ROADMAP.md for full technical specifications per module*
