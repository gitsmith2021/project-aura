# 🎬 Aura Campus — Demo Playbook (Phase 9B)

> The operational guide for running, validating, and capturing the **Aura Demo College**
> showcase. Pairs with [demo_credentials.md](demo_credentials.md) (logins) and
> [PERSONA_STORYBOARDS.md](PERSONA_STORYBOARDS.md) (Pain → Capability → Outcome narratives).
>
> **Scope:** documentation/content only. **AI features** (Knowledge Hub AI summaries / RAG
> assistant) are *optional / roadmap* and are deliberately **not** part of the core flow — the
> demo runs entirely on currently-shipping features (no Anthropic credit required).
>
> **Last updated:** 2026-06-24

## Access (quick reference)

| | |
|---|---|
| Login | `/login` · password (all personas): `AuraDemo@2026` |
| Tenant | `aura-demo` · `/institutions/aura-demo` |
| Seed / reset | `npm run seed:demo` · `npm run reset:demo` (or `/admin` → Reset Demo Tenant) |
| Headline | 6 departments · 2,893 students · ~148 faculty · 88% fee collection · 92% placements · 320 scholarships · KH 55 resources · live IQAC/NAAC |

---

## 1. Sales Demo Flow (10–15 min)

> A single continuous narrative. Optimised for a prospect/principal/chairman audience. Reset the
> tenant beforehand so numbers are pristine.

| # | Beat | Time | Persona | What you show | The line to land |
|---|------|------|---------|---------------|------------------|
| 0 | **Cold open** | 0:30 | — | Landing page → "one platform, no consultants, no 6-month setup." | "Most campuses run on 8 disconnected tools. Here's all of it in one." |
| 1 | **Chairman's view** | 2:00 | Chairman | Institution KPI dashboards — students, 88% fees, 92% placements, attendance, NAAC A+. | "This is your whole institution, live, in one screen — no spreadsheets." |
| 2 | **The wow: AI timetable** | 2:30 | Principal | `/schedules` → pick a department → **Generate Auto-Schedule** → conflict-free draft in ~10s → preview. | "What takes your staff weeks, our engine does in seconds — and it's running in production right now." |
| 3 | **Accreditation readiness** | 2:00 | IQAC | IQAC/NAAC tooling — meetings, action items, accreditation evidence, CO/PO attainment. | "NAAC prep stops being a 3-month scramble. Evidence is always current." |
| 4 | **Operations depth** | 2:00 | Administrator | Finance (fees, payroll, 6 dept budgets), admissions funnel. | "Fees, payroll, admissions, budgets — one system, real numbers." |
| 5 | **Department & faculty** | 1:30 | HOD → Faculty | HOD analytics + CIA/CO-PO; switch to Faculty staff portal (timetable, marks, KH). | "Every level — institution to a single lecturer — works in the same platform." |
| 6 | **The student & parent** | 1:30 | Student → Parent | Student portal (attendance, results, fee dues, online pay) → Parent portal. | "And the families feel it too — transparency, self-service, online payments." |
| 7 | **Close** | 1:00 | — | Back to Chairman dashboard; recap the storyboards. | "One platform. Demonstrable today. Launch-ready." |

**Wow moments to never skip:** (1) the **live AI timetable solve** (beat 2), (2) **88% fee collection + 92% placements** on the Chairman dashboard (beat 1), (3) **NAAC/IQAC evidence** always-current (beat 3).

**If asked about AI:** "AI summaries and a RAG knowledge assistant are built and ship as an optional add-on; today's demo shows the platform without them so you see the core value first."

---

## 2. Per-Persona Walkthrough Scripts

> For each: log in (password `AuraDemo@2026`), confirm the landing surface, follow the click-path,
> say the line, highlight the number. All 9 personas from [demo_credentials.md](demo_credentials.md).

### Chairman — `chairman@demo.aura.test` (lands: Admin / institution dashboards)
- **Click-path:** login → institution dashboard.
- **Highlight:** total students (2,893), fee collection **88%**, placements **92%**, attendance, NAAC A+.
- **Say:** "Your entire institution's health, live, from one source of truth."

### Principal — `principal@demo.aura.test` (lands: Admin)
- **Click-path:** login → `/schedules` → select department → **Generate Auto-Schedule** → **Preview**.
- **Highlight:** conflict-free draft generated in **~10s** (production OR-Tools engine).
- **Say:** "Weeks of manual timetabling → seconds. This is live in production, not a mockup."

### IQAC Coordinator — `iqac@demo.aura.test` (lands: Admin / IQAC tooling)
- **Click-path:** login → IQAC / NAAC section → meetings, action items, accreditation evidence.
- **Highlight:** populated IQAC meetings + NAAC evidence; CO/PO attainment.
- **Say:** "Accreditation evidence is always current — no cycle-end scramble."

### Administrator — `admin@demo.aura.test` (lands: Admin / full operations)
- **Click-path:** login → Finance (fees, payroll, budgets) → Admissions funnel.
- **Highlight:** 88% collection, 6 department budgets, salaries/expenses, admissions pipeline.
- **Say:** "Finance, payroll, admissions — operated from one place, on real numbers."

### HOD (Computer Science) — `hod@demo.aura.test` (lands: HOD / department view)
- **Click-path:** login → department analytics → CIA results / CO-PO → faculty workload.
- **Highlight:** published CIA marks, CO/PO attainment, balanced faculty loads.
- **Say:** "The department runs on data — and it's accreditation-ready on demand."

### Faculty — `faculty@demo.aura.test` (lands: Staff Portal)
- **Click-path:** login → staff portal → timetable → mark attendance → CIA marks → Knowledge Hub.
- **Highlight:** one flow for schedule, attendance, marks, resources.
- **Say:** "Less paperwork, more teaching."

### Student — `student@demo.aura.test` (lands: Student Portal)
- **Click-path:** login → student portal → attendance → results → fees → (initiate online pay).
- **Highlight:** attendance %, published results, fee dues, Razorpay online payment.
- **Say:** "Everything a student needs — self-service, no office queue."

### Parent — `parent@demo.aura.test` (lands: Parent Portal)
- **Click-path:** login → parent portal → child's attendance / results / fees.
- **Highlight:** read-only visibility into the child's standing + dues.
- **Say:** "Families get transparency without calling the office."

### Alumnus — `alumni@demo.aura.test` (lands: Alumni Portal)
- **Click-path:** login → alumni portal → engagement.
- **Highlight:** alumni engagement surface (80 alumni seeded).
- **Say:** "Engagement continues after graduation."

---

## 3. Executive Persona Validation Checklist

> Run before any external demo. **Owner: product owner** (live validation per decision 1A).
> Reset first (`npm run reset:demo`), then verify each row. Mark ✅/❌.

| # | Persona | Login works | Lands on correct surface | Data populated (not empty) | Notes |
|---|---------|-------------|--------------------------|----------------------------|-------|
| 1 | Chairman | ☐ | Admin / KPI dashboards | KPIs render (students/fees/placements) | |
| 2 | Principal | ☐ | Admin | `/schedules` generate works → draft | |
| 3 | IQAC | ☐ | Admin / IQAC | meetings + NAAC evidence present | |
| 4 | Administrator | ☐ | Admin | finance/admissions populated | |
| 5 | HOD | ☐ | HOD | CIA/CO-PO + workload present | |
| 6 | Faculty | ☐ | Staff Portal | timetable + marks entry usable | |
| 7 | Student | ☐ | Student Portal | attendance/results/fees present | |
| 8 | Parent | ☐ | Parent Portal | child data visible | |
| 9 | Alumnus | ☐ | Alumni Portal | alumni surface renders | |

**Cross-checks:** (a) AI/Knowledge-Hub-AI screens degrade gracefully (no error) without Anthropic credit; (b) reset is scoped to `aura-demo` only (Bishop Heber + e2e tenants untouched); (c) online payment uses test Razorpay keys; (d) **Students page** (`/users/students`): department cards show **non-zero UG counts** and **distinct colours** — regression guard for the seed `student_program` (must be `"UG"`/`"PG"`, not a degree name) and per-department `color` fix. PG pills are `0` by design (seed is UG-only).

**Sign-off:** _____________________  Date: __________

---

## 4. Screenshot Catalog (shot-list)

> **Owner: product owner** captures these (decision 1A). Suggested ~1280×800, light theme,
> seeded demo data. Use column tags the asset to its destination: **D**=live demo, **K**=sales deck, **W**=website.

| # | Screen | Persona | Where | Caption | Use |
|---|--------|---------|-------|---------|-----|
| 1 | Landing / hero | — | `/` | "One platform for the whole campus" | W |
| 2 | Pricing | — | `/#pricing` | "Simple, transparent pricing" | W K |
| 3 | Institution KPI dashboard | Chairman | institution dashboard | "Your institution, live" | D K W |
| 4 | Fee collection panel (88%) | Administrator | Finance | "88% collection, in real time" | K W |
| 5 | Placements (92%) | Chairman | Placements | "92% placement outcomes" | K W |
| 6 | **AI timetable — generate** | Principal | `/schedules` | "Conflict-free timetable in seconds" | D K W |
| 7 | **AI timetable — draft preview** | Principal | `/schedules` (preview) | "Review before publish" | D K |
| 8 | IQAC / NAAC evidence | IQAC | IQAC tooling | "Accreditation-ready, always" | K W |
| 9 | CO/PO attainment | HOD | dept analytics | "Outcome attainment, automated" | K |
| 10 | Faculty staff portal | Faculty | staff portal | "Teaching, not paperwork" | D W |
| 11 | CIA marks entry | Faculty | staff portal | "Marks in one flow" | D |
| 12 | Student portal home | Student | student portal | "Everything a student needs" | D W |
| 13 | Student fees + online pay | Student | student portal → fees | "Pay fees in seconds" | D K W |
| 14 | Parent portal | Parent | parent portal | "Transparency for families" | W |
| 15 | Admissions funnel | Administrator | Admissions | "From enquiry to enrolment" | K |
| 16 | Knowledge Hub (55 resources) | Faculty | Knowledge Hub | "Institutional knowledge, organised" | W |

> AI-specific screens (AI summary, RAG assistant) are intentionally **excluded** from the core
> catalog; add them later as *optional* shots if/when Anthropic credit is funded.

---

## 5. Status & handoff

- ✅ Delivered (this phase): sales flow, per-persona scripts, validation checklist, screenshot catalog, [persona storyboards](PERSONA_STORYBOARDS.md).
- 🔲 Pending (owner: product owner, per decision 1A): live screenshot capture + persona validation sign-off (§3).
- On sign-off, flip 9B → 100% in [AURA_V1_EXECUTION_TRACKER.md](AURA_V1_EXECUTION_TRACKER.md).

*Phase 9B Demo Playbook — makes Aura Campus demonstrable. Reset with `npm run reset:demo`.*
