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

## 📅 Fable 5 Battle Plan — June 12 to June 22

> **11 days · 8 Tier 1 modules · Maximum ROI**

```
[x] Day 1  — June 12 (Today) 🎨  Landing Page (GSAP + Three.js + Lenis)
[x] Day 2  — June 12 (Today) 🔐  Phase 2.5A — Razorpay Webhook Security
[x] Day 3  — June 12 (Today) 🔐  Phase 2.5B — DPDP Act 2023 Compliance
[x] Day 4  — June 12 (Today) 🔐  Phase 2.5C — Platform-Wide Audit Log (A8)
[x] Day 5  — June 12 (Today) 📊  Super Admin Analytics Dashboard (roadmap Phase 7A+7B)
[ ] Day 6  — June 14         📊  Phase 3B continued (reports + drill down)
[ ] Day 7  — June 15         📚  Phase 4A — CIA Assessment Engine
[ ] Day 8  — June 16         📚  Phase 4A continued (CO/PO mapping + reports)
[ ] Day 9  — June 17         🏛️  Phase 7A — NAAC SSR Builder (scaffold)
[ ] Day 10 — June 18         🏛️  Phase 7A continued (PDF export + criteria map)
[ ] Day 11 — June 19         📱  Phase 8A — React Native Setup + NFC scaffold
[ ] Buffer — June 20–22      ⏳  Buffer for Tier 1 refinements / Tier 2 work
─────────────────────────────────────────────────────
June 23 onwards → Switch to Opus 4.8 / Sonnet 4.6 for Tier 2 & 3
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
| Super Admin Dashboard | Fable 5 | ✅ Complete (7A+7B; 7C drill-down = Day 6) | `24f64f1` |
| CIA Assessment Engine | Fable 5 | 🔲 Pending | — |
| NAAC SSR Builder | Fable 5 | 🔲 Pending | — |
| React Native + NFC Setup | Fable 5 | 🔲 Pending | — |
| Notifications Infrastructure | Opus/Sonnet | 🔲 Pending | — |
| Notification Triggers | Opus/Sonnet | 🔲 Pending | — |
| Resend Email Integration | Opus/Sonnet | 🔲 Pending | — |
| Super Admin Auth & Layout | Opus/Sonnet | 🔲 Pending | — |
| Admissions CRM | Opus/Sonnet | 🔲 Pending | — |
| Curriculum & Syllabus | Opus/Sonnet | 🔲 Pending | — |
| Exam Management | Opus/Sonnet | 🔲 Pending | — |
| LMS Core | Opus/Sonnet | 🔲 Pending | — |
| Student Mobile Screens | Opus/Sonnet | 🔲 Pending | — |
| NAAC SSR continued | Opus/Sonnet | 🔲 Pending | — |

---

*Last updated: June 12, 2026 — Fable 5 free window active (11 days remaining)*
*Reference: AURA_ROADMAP.md for full technical specifications per module*
