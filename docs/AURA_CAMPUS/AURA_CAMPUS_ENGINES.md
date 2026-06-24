# 🧠 AURA CAMPUS — Engines Register

> **Purpose:** Catalogue every specialized, intelligence-producing subsystem inside AURA CAMPUS —
> current and future — and assess each one's business value and potential to graduate into a
> shared [AURA_CORE](../AURA_CORE/) service consumed by AURA Build, AURA Field, and AURA Vision.
> Use this document for architecture reviews, roadmap prioritisation, investor/IP conversations,
> and to decide where engineering effort produces compounding (not commodity) value.

---

## 1. What Is an Engine?

An **engine** is not a CRUD module. A CRUD module stores and displays data — any competitor,
intern, or no-code tool can rebuild one in a weekend. An engine is a subsystem that takes data
in and produces **intelligence** out: a decision, a schedule, a forecast, a ranking, a risk score,
or a recommendation that did not exist in the raw data.

| Signal | CRUD Module | Engine |
|--------|-------------|--------|
| What it does | Create / Read / Update / Delete records | Processes inputs through rules, constraints, math, or models |
| Output | The same data, formatted | New information that didn't exist before |
| Example | Student Directory (list, search, edit a student) | Attendance Intelligence Engine (defaulter prediction from that same data) |
| Example | Fee Payment Form | Fee Intelligence Engine (collection forecast, default risk) |
| Replaceable by a competitor in | Days | Months to years (constraint logic, tuned models, accumulated data) |
| Defensibility | None — it's a form | High — correctness and quality compound with data and tuning |

**Rule of thumb:** if you could describe the feature as "a table with a form," it's a CRUD module.
If you could describe it as "given X, decide/produce/predict Y," it's an engine.

```
✅ Timetable Scheduling Engine     →  inputs (rooms, staff, constraints) → optimized schedule
❌ Student CRUD                    →  inputs (name, roll no.)            → the same name, roll no.

✅ Attendance Intelligence Engine  →  raw taps                           → defaulter list, risk score
❌ Student Directory               →  raw profile fields                → the same profile fields
```

---

## 2. Why Engines Are Strategically Important

ERP modules manage data. **Engines generate intelligence, optimization, automation, and
recommendation** — and that is the part of AURA CAMPUS that cannot be cloned by copying a
database schema. Engines are AURA's long-term intellectual property:

- They encode **domain expertise** (Indian academic scheduling rules, statutory payroll math,
  NAAC attainment formulas) that took real institutional knowledge to build correctly.
- They get **better with data** — a scheduler that has resolved 50 real timetables, or an
  attendance engine that has seen three years of a college's patterns, outperforms a freshly
  installed competitor on day one.
- They are **hard to reverse-engineer** from the outside — a competitor can see a CRUD screen
  in a demo; they cannot see the constraint-solving logic behind a generated timetable.
- They create **cross-sell and retention anchors** — see
  [AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md](AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md) §3.2 and §3.7.
- Several of them are **portable across verticals** — a constraint solver that schedules classes
  can schedule construction crews or field technicians with a different input shape. That
  portability is exactly what turns a Campus-only feature into a shared AURA_CORE service.

A full strategic argument is in [§7 — Why Engines Matter](#7-why-engines-matter).

---

## 3. Engine Maturity Legend

| Status | Meaning |
|--------|---------|
| 🟢 **Implemented** | Built and live in the app, running against demo/pilot data |
| 🚀 **Production Deployed** | Implemented *and* deployed to a managed production host (beyond local/dev) with authentication + healthchecks |
| 🟡 **Designed** | Schema and roadmap spec exist (see linked phase file); not yet built |
| 🔵 **Conceptual** | Strategic opportunity identified; no schema or spec written yet |
| 🟣 **Core Candidate** | Strong candidate to extract into a shared [AURA_CORE](../AURA_CORE/) service |

---

## 4. Engine Classification

| Category | Engines |
|----------|---------|
| [Academic Optimization Engines](#5-academic-optimization-engines) | Timetable Optimization, Examination Scheduling, Faculty Workload |
| [Operational Intelligence Engines](#6-operational-intelligence-engines) | Attendance Intelligence, Admissions Ranking |
| [Financial Intelligence Engines](#7-financial-intelligence-engines) | Fee Intelligence, Scholarship Allocation |
| [Student Success Engines](#8-student-success-engines) | Placement Intelligence |
| [Compliance & Accreditation Engines](#9-compliance--accreditation-engines) | Outcome Based Education (OBE) |
| [Future AI Engines](#10-future-ai-engines) | Cross-cutting predictive layer over the above |
| [Potential Aura Core Engines](#11-potential-aura-core-engines) | Scheduler, Workflow, Notification, Document Generation |

> Note: the numbering below (Engine #1–#9) is a flat IP register; the table above is the same
> nine engines grouped by function for navigation.

---

## 5. Academic Optimization Engines

### Engine #1 — Timetable Optimization Engine

| | |
|---|---|
| **Status** | 🚀 **Production Deployed** (Railway, 2026-06-24) · 🟣 Core Candidate |
| **Technology** | Python · FastAPI · Google OR-Tools (constraint solver), deployed as a standalone Docker microservice on Railway (`project-aura-production-6b0d.up.railway.app`), guarded by shared-secret `X-API-Key` auth. See [AURA_SCHEDULER_DEPLOYMENT.md](AURA_SCHEDULER_DEPLOYMENT.md). |
| **Business Value** | High |
| **Aura Core Candidate** | **Yes** — future **Aura Scheduler Engine** |

**Purpose**
Automatically generate conflict-free, optimized academic timetables — a problem that is
NP-hard and that most institutions still solve by hand over days or weeks.

**Inputs**
- Faculty (subjects taught, availability, max load)
- Subjects / curriculum (weekly hour requirements, lab vs lecture)
- Rooms (capacity, type — lab/lecture/seminar)
- Hard constraints (no double-booking, room capacity, prerequisite ordering)

**Outputs**
- A complete, conflict-free timetable per section/department
- Room allocation per session
- A draft preview for human review before publish (`DraftPreviewPanel`) — the solver never
  writes directly to live data

**Future Enhancements**
- Faculty scheduling preferences (soft constraints, not just hard ones)
- Workload balancing across the term, not just per-week
- Multi-campus scheduling (shared faculty across sites)
- AI-ranked recommendations when no fully conflict-free solution exists

**Strategic Value**
No EdTech SaaS in the Indian SMB segment ships a native constraint solver — see
[AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md](AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md) §3.2. This is
AURA's sharpest demo wow-moment and its most defensible piece of IP today.

**Aura Core Path**
The underlying solver is shape-agnostic: rooms/staff/time-slots generalise directly to
technician/site/shift (AURA Field) or crew/equipment/phase (AURA Build) scheduling. Extracting
the OR-Tools service behind a generic "resources × constraints → schedule" API is the highest-
leverage Aura Core extraction on this list.

---

### Engine #4 — Examination Scheduling Engine

| | |
|---|---|
| **Status** | 🟡 Designed |
| **Technology** | Likely reuses the existing OR-Tools microservice (same solver class as Engine #1) |
| **Business Value** | High |
| **Aura Core Candidate** | **Yes** — same Aura Scheduler Engine as above |

**Purpose**
Automatically generate exam timetables, hall allocations, and invigilator assignments —
structurally the same constraint-satisfaction problem as class timetabling, with different
entities (students/halls/invigilators instead of sections/rooms/faculty).

**Inputs:** Subjects, enrolled students per subject, room capacity, invigilator availability.
**Outputs:** Exam timetable, hall/seat allocation, invigilator roster.

**Strategic Value**
Because this reuses Engine #1's solver core, it is comparatively cheap to build and immediately
strengthens the case for extracting a generic Aura Scheduler Engine — two internal consumers of
the same constraint-solving primitive is the point where extraction starts paying for itself.

---

### Engine #6 — Faculty Workload Engine

| | |
|---|---|
| **Status** | 🟡 Designed — schema drafted in [roadmap/07-phase5-admissions-lifecycle.md §5E](roadmap/07-phase5-admissions-lifecycle.md) |
| **Business Value** | Medium-High |
| **Aura Core Candidate** | Partial |

**Purpose**
Balance and optimize faculty teaching load by cross-referencing planned class hours
(`class_schedules`) against actual delivered hours (attendance data), surfacing both
overloaded and underutilized staff.

**Inputs:** Subjects, timetable, attendance records, research/administrative duty load.
**Outputs:** Per-staff workload calculation, overload alerts, underutilization alerts,
NAAC-format workload exports.

**Future AI:** Staffing recommendations — e.g. "Department X will be short two faculty next
semester at current enrolment growth."

**Why Partial on Core:** the *workload calculation* (hours taught vs planned) is education-
specific, but the underlying "actual vs planned utilization + alert thresholds" pattern is
reusable for AURA Field technician utilization or AURA Build crew utilization.

---

## 6. Operational Intelligence Engines

### Engine #2 — Attendance Intelligence Engine

| | |
|---|---|
| **Status** | 🟡 Partial — NFC + manual attendance capture is 🟢 Implemented; the *intelligence* layer (defaulter detection, eligibility prediction, forecasting) is 🟡 Designed |
| **Business Value** | High |
| **Aura Core Candidate** | Partial |

**Purpose**
Transform raw attendance taps into actionable institutional insight, not just a percentage.

**Inputs**
- NFC attendance events (webhook → Supabase, live within seconds)
- Manual attendance overrides (lab/field sessions without readers)
- Timetable (expected sessions per student)
- Student profiles

**Outputs**
- Attendance percentage per student/subject
- Defaulter detection (below statutory minimum threshold)
- Exam eligibility prediction (will this student cross the minimum % by exam day at current trend?)
- Attendance forecasting

**Future AI**
- Dropout-risk indicators (attendance decline as an early-warning signal)
- Student engagement scoring (attendance + portal activity + assignment submission combined)

**Strategic Value**
The real-time NFC capture is already a switching-cost anchor (3,000+ issued cards = sunk
institutional investment — see [AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md](AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md)
§3.3). The intelligence layer on top is what turns that raw data stream into a retention and
compliance product, not just a digitised register.

---

### Engine #7 — Admissions Ranking Engine

| | |
|---|---|
| **Status** | 🟡 Partial — a marks-based merit-list generator is 🟢 Implemented ([roadmap/07-phase5-admissions-lifecycle.md §5A-sub](roadmap/07-phase5-admissions-lifecycle.md)); quota/reservation-aware seat allocation is 🔵 Conceptual |
| **Business Value** | High |
| **Aura Core Candidate** | No |

**Purpose**
Automate admissions selection: rank applicants and allocate seats fairly and auditably.

**Inputs:** Academic scores, reservation/quota categories (SC/ST/OBC/minority/sports — common
in Indian statutory admissions), seat counts, applicant preferences.

**Outputs:** Ranked merit lists (built today, sorted by qualifying marks %, exportable for
statutory noticeboard posting), waiting lists, and — once quota logic is added — full seat
allocation that respects reservation percentages simultaneously with merit order.

**Why this stays Campus-only:** Indian statutory reservation rules are deeply domain- and
jurisdiction-specific. There's no meaningful generalisation of "rank applicants under category
quotas" to AURA Build or AURA Field.

---

## 7. Financial Intelligence Engines

### Engine #3 — Fee Intelligence Engine

| | |
|---|---|
| **Status** | 🟡 Partial — fee structures, Razorpay collection, and reporting are 🟢 Implemented; forecasting and defaulter *prediction* are 🔵 Conceptual |
| **Business Value** | High |
| **Aura Core Candidate** | No |

**Purpose**
Move fee management from "record what was paid" to "predict what will be collected and who is
at risk of defaulting."

**Inputs:** Fee structures, payment history, concessions, scholarships.

**Outputs:** Outstanding dues by student/department, collection forecasts, defaulter
prediction, revenue trend analysis.

**Future AI:** Payment risk prediction (which students are statistically likely to miss the
next instalment, based on prior payment timing patterns); collection-strategy optimization
(which reminder channel/timing converts best, per AURA_CORE's future Aura Connect data).

**Why this stays Campus-only:** the underlying math (cash-flow forecasting from a payment
schedule) is generic, but the entity model (fee structures, concessions, scholarships,
statutory categories) is specific enough to education billing that extraction isn't worth it
ahead of a second product actually needing it.

---

### Engine #8 — Scholarship Allocation Engine

| | |
|---|---|
| **Status** | 🔵 Conceptual — table schema sketched in [roadmap/07-phase5-admissions-lifecycle.md §5G](roadmap/07-phase5-admissions-lifecycle.md); allocation logic not yet designed |
| **Business Value** | Medium |
| **Aura Core Candidate** | No |

**Purpose**
Automate scholarship eligibility evaluation and award allocation across government schemes
(SC/ST/OBC, minority, sports, merit) that Indian colleges must track and reconcile manually
today.

**Inputs:** Family income data, academic performance, scheme-specific eligibility rules.

**Outputs:** Eligibility rankings, award recommendations, fee-ledger integration (auto-applying
the awarded concession to the Fee Intelligence Engine above).

---

## 8. Student Success Engines

### Engine #9 — Placement Intelligence Engine

| | |
|---|---|
| **Status** | 🔵 Conceptual — placement cell roadmap spec exists ([roadmap/07-phase5-admissions-lifecycle.md §5F](roadmap/07-phase5-admissions-lifecycle.md)); intelligence layer not yet designed |
| **Business Value** | Very High |
| **Aura Core Candidate** | Future standalone **Aura Talent** product, not a Core service |

**Purpose**
Improve graduate employability and placement outcomes — the single most reputation-defining
metric for a college (feeds NIRF Criterion 5.2 — Student Progression).

**Inputs:** Academic performance, certifications/skills, attendance history, internship
records, company requirements.

**Outputs:** Employability scores, placement readiness ranking, student-to-company matching.

**Future AI:** Career path recommendations; skill-gap analysis against target-company
requirements; predictive placement-rate modelling per department.

**Why this could become its own product, not a Core service:** the matching logic (student
profile ↔ employer requirement) is structurally similar to a recruiting marketplace — valuable
enough on its own that, at scale, it may be worth spinning out as **Aura Talent** rather than
folding into shared platform infrastructure.

---

## 9. Compliance & Accreditation Engines

### Engine #5 — Outcome Based Education (OBE) Engine

| | |
|---|---|
| **Status** | 🔵 Conceptual |
| **Business Value** | High |
| **Aura Core Candidate** | No |

**Purpose**
Automate Course Outcome / Programme Outcome (CO/PO) attainment calculation — a mandatory,
heavily manual NAAC/NBA accreditation requirement that most Indian colleges currently track in
spreadsheets per department, recreated every accreditation cycle.

**Inputs:** Assessment marks, CO mappings, PO mappings, attainment thresholds per programme.

**Outputs:** Attainment reports per course/programme, gap analysis (which POs are
under-attained and need curriculum action), exportable accreditation evidence packages.

**Strategic Value**
Direct extension of the existing compliance positioning
([AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md](AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md) §3.4) — turning a
3-month manual accreditation-prep exercise into an always-current report is the same value
proposition that already works for NAAC/AISHE exports, applied to the most labour-intensive
compliance artifact colleges produce.

---

## 10. Future AI Engines

This is not a tenth standalone engine — it is the **predictive layer that sits on top of the
engines above**, once enough historical data has accumulated:

| Opportunity | Built on top of | What it adds |
|---|---|---|
| Dropout-risk scoring | Attendance Intelligence + Fee Intelligence | Combines attendance decline + payment delay into a single early-warning signal per student |
| Student engagement scoring | Attendance Intelligence + portal/app usage | A holistic "is this student disengaging" score, not just an attendance % |
| Staffing forecasts | Faculty Workload Engine | Predicts department-level faculty shortfall from enrolment trend |
| Payment-risk prediction | Fee Intelligence Engine | Predicts which students will miss the next instalment |
| Skill-gap / career matching | Placement Intelligence Engine | Matches student profile to target-company requirements at scale |

None of these are buildable until their underlying engine has 1–2 years of real institutional
data — see [§6, Year 4](#6-the-defensible-long-term-position) of the competitive-advantage doc.
**This is the long-term payoff of every engine listed above being built correctly now**: each
one is a future AI feature's training-data pipeline.

---

## 11. Potential Aura Core Engines

Some subsystems are not specific to *academic* operations at all — they are general platform
capabilities that Campus happens to be the first product needing. These are tracked in
[AURA_CORE](../AURA_CORE/) as shared services; Campus is their first consumer.

### Aura Scheduler Engine
**Source:** Engine #1 (Timetable Optimization) + Engine #4 (Examination Scheduling)
**Shared across:** Campus (timetables, exams) · Field (technician dispatch, shift scheduling) ·
Build (crew/equipment/phase scheduling)
**Generalised shape:** `resources × time-slots × hard/soft constraints → optimized assignment`

### Aura Workflow Engine
**Doc:** [AURA_CORE/AURA_FLOW.md](../AURA_CORE/AURA_FLOW.md)
**Shared across:** any product needing multi-step approvals
**Examples:** Campus leave approvals, purchase approvals, admissions approval chains; the same
state-machine pattern applies to Build's purchase-order approvals or Field's work-order sign-off

### Aura Notification Engine
**Doc:** [AURA_CORE/AURA_CONNECT.md](../AURA_CORE/AURA_CONNECT.md)
**Shared across:** every product
**Examples:** Email, SMS, WhatsApp, push — already the basis of Campus's Phase 3 Notification
Engine ([roadmap/05-phase3-notifications.md](roadmap/05-phase3-notifications.md))

### Aura Document Generation Engine
**Doc:** [AURA_CORE/AURA_DOCS.md](../AURA_CORE/AURA_DOCS.md)
**Shared across:** every product
**Examples today:** Hall tickets, certificates, payslips, Form 16, NAAC/AISHE reports
**Future cross-product usage:** Build quotations and work orders, Field site reports

> These four are the clearest "build once, reuse forever" candidates on the entire roadmap.
> Each is currently implemented *inside* Campus's `src/` tree; the AURA_CORE docs describe the
> extraction path once a second product actually needs the same capability — extracting early,
> before a second real consumer exists, risks over-engineering an interface nobody has tested.

---

## 12. Engine Portfolio — At a Glance

| # | Engine | Category | Status | Business Value | Aura Core Candidate |
|---|--------|----------|--------|-----------------|----------------------|
| 1 | Timetable Optimization Engine | Academic Optimization | 🚀 Production Deployed (Railway) | High | 🟣 Yes — Aura Scheduler |
| 2 | Attendance Intelligence Engine | Operational Intelligence | 🟡 Partial | High | Partial |
| 3 | Fee Intelligence Engine | Financial Intelligence | 🟡 Partial | High | No |
| 4 | Examination Scheduling Engine | Academic Optimization | 🟡 Designed | High | 🟣 Yes — Aura Scheduler |
| 5 | Outcome Based Education (OBE) Engine | Compliance & Accreditation | 🔵 Conceptual | High | No |
| 6 | Faculty Workload Engine | Academic Optimization | 🟡 Designed | Medium-High | Partial |
| 7 | Admissions Ranking Engine | Operational Intelligence | 🟡 Partial | High | No |
| 8 | Scholarship Allocation Engine | Financial Intelligence | 🔵 Conceptual | Medium | No |
| 9 | Placement Intelligence Engine | Student Success | 🔵 Conceptual | Very High | Future product (Aura Talent) |
| — | Aura Scheduler Engine | Core Candidate | 🟣 Core Candidate | — | Extracted from #1 + #4 |
| — | Aura Workflow Engine | Core Candidate | 🟣 Core Candidate | — | Shared approvals |
| — | Aura Notification Engine | Core Candidate | 🟣 Core Candidate | — | Shared Connect service |
| — | Aura Document Generation Engine | Core Candidate | 🟣 Core Candidate | — | Shared Docs service |

---

## 13. Why Engines Matter

This is the argument to remember when prioritising roadmap effort against feature requests
that look like "just add a CRUD screen for X":

- **CRUD modules can be copied.** Any competent dev team can rebuild a student directory or a
  fee-payment form from a screenshot in a sprint. There is no moat in a table with a form.
- **Engines create differentiation.** A constraint solver, a statutory tax calculator, an
  attainment-gap analyzer — these require domain expertise and iteration that a competitor
  cannot shortcut by copying the UI.
- **Engines create intellectual property.** The logic inside `src/lib/statutoryPayroll.ts`,
  the OR-Tools constraint model, the merit-ranking algorithm — these are AURA's actual
  proprietary assets, in a way that a `students` table is not.
- **Engines increase customer value disproportionately to their build cost.** A 30-second live
  timetable solve in a sales demo converts better than any feature list — see
  [AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md](AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md) §5.
- **Engines create the future AI opportunity.** Every engine that runs against real
  institutional data for 1–2 years becomes a training-data source for the next tier of
  prediction (§10 above). CRUD modules never reach this stage — there's no signal in a record
  that was only ever stored, never processed.
- **Engines strengthen the long-term moat.** Data accumulated by engines (years of attendance
  patterns, scheduling history, payment behaviour) is what makes migration to a competitor "a
  data archaeology project, not an IT project" — see
  [AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md](AURA_CAMPUS_COMPETITIVE_ADVANTAGE.md) §6.

**Engineering implication:** when scoping new work, ask "does this store data, or does this
turn data into a decision?" If the answer is the latter, treat it with the rigour of an engine
— a dedicated spec, a tracked maturity status in this register, and a default assumption that
it will eventually need an AI layer once enough data exists.

---

*This register should be updated whenever a new engine is designed, an existing engine's status
changes (Conceptual → Designed → Implemented), or an engine is extracted into AURA_CORE. Cross-
reference the relevant [roadmap/](roadmap/) phase file for implementation detail and commit
hashes; this document tracks strategic classification, not build checklists.*

*Last updated: 2026-06-24 — Engine #1 (Timetable Optimization) marked Production Deployed (Railway).*
