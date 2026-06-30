# 🧠 CF-3 — Aura Intelligence

> **Aura's Intelligence Layer.** Not a chatbot. Not a dashboard. Not a report screen.
> The single place an executive *asks a question* and Aura composes a board-quality
> dashboard + a plain-English summary + what to ask next — all from real, RLS-safe data.
>
> **Type:** Architecture & roadmap. **Status:** ✅ **v1 COMPLETE (2026-06-26)** — engine + 15 flagship intents + comparison (vs last year) + HOD department-scoping + optional/graceful LLM layer + trend charts; 24 unit tests; build green. Items in §11 are deferred by design. **Last updated:** 2026-06-26
>
> **Built ON TOP of CF-2 — CF-2 is frozen.** Aura Intelligence never touches the
> Data Explorer engine; it *consumes* it. See [CF2_DATA_EXPLORER.md](CF2_DATA_EXPLORER.md).

---

## 1. Two products, one engine

| | Data Explorer (CF-2) | **Aura Intelligence (CF-3)** |
|---|---|---|
| Answers | "How do you want to **query** the data?" | "**What** do you want to know?" |
| User | analysts, power users | **executives** (Chairman, Principal, IQAC, HOD…) |
| Input | builder (entity → filters → group…) | **a sentence** |
| Output | a result grid | a **composed executive dashboard** + summary + follow-ups |
| Surface | `/data-explorer` | `/intelligence` |

Both live under **Analytics**, kept separate. Aura Intelligence is CF-2's **AI layer** —
the reporting engine stays the deterministic core underneath.

---

## 2. The non-negotiable pipeline

```
User Question
   ↓   ① Intent Detection (LLM) — classify + extract slots
Resolved Intent + Slots
   ↓   ② Dashboard Definition (code) — a registered template
Query Model(s)               ← CF-2's Query Model, built deterministically from slots
   ↓   ③ CF-2 Data Explorer Engine (runQuery — UNCHANGED)
PostgREST → Supabase (RLS)
   ↓
Dataset(s)                   ← already RLS-filtered to the user
   ↓   ④ Dashboard Composer (code) — picks widgets, computes KPIs
Composed Dashboard
   ↓   ⑤ Executive Summary (LLM) — grounded ONLY in returned aggregates
   ↓   ⑥ Suggested Follow-ups (intent-defined + LLM)
Executive answer
```

**Hard rules (enforced by structure):**
- ❌ No SQL generation. ❌ No SQL execution. ❌ No bypassing CF-2.
- Every data read goes through **CF-2 `runQuery`** → PostgREST → RLS. *Identical* security to Data Explorer.
- The LLM **never** writes SQL and **never** receives raw PII rows (see §6).

---

## 3. The core decision — Intent Registry, not free-form query generation

> Your spec lists "produce Query Model" as an LLM job **and** "each intent maps to one
> Dashboard Definition" **and** "no hallucinations / code-driven dashboards." The elegant
> reconciliation — and the backbone of CF-3 — is this:

**The LLM does not freely invent Query Models. It classifies the question into a
*registered Intent* and extracts *slots*. Deterministic code turns (Intent + Slots)
into the Query Model(s) and the dashboard layout.**

```
LLM output  =  { intentId, slots: { timeRange, groupBy, threshold, department, … }, confidence }
Code        =  IntentDefinition[intentId].build(slots, userContext)  →  QueryModel[] + DashboardSpec
```

Why this is the right architecture:
- **No hallucinated fields/entities** — Query Models are built by code from a curated template; they only ever reference CF-2's registered entities (and CF-2 `validateQueryModel` is the final gate).
- **Deterministic & testable** — same question → same dashboard. Dashboards are code, not LLM output.
- **Secure** — the LLM influences *which* registered query runs and *with what parameters*, never *what tables/columns* exist or *what SQL* runs.
- **Extensible** — supporting a new question = adding one **Intent Definition** (a TS object). "Extremely easy to add intents," exactly as required.
- **Degrades gracefully** — a deterministic keyword/alias matcher can resolve intents when AI credit is unavailable (Aura still works; the LLM just makes understanding fuzzier-tolerant and writes nicer prose).

> **Long-tail fallback (designed, gated):** for a question matching *no* registered intent,
> a future mode may let the LLM propose a constrained Query Model **validated by CF-2 before
> running** (invalid → rejected, RLS still applies). Phase 1 ships the registry path only.

---

## 4. The building blocks

### 4.1 Intent Definition (the unit of extensibility) — code registry
```typescript
type IntentDefinition = {
  id: string;                        // 'finance.fee_collection'
  title: string;                     // 'Fee Collection'
  domain: Domain;                    // Finance | Admissions | Academics | …
  aliases: string[];                 // deterministic-match keywords/phrases
  roles: Role[];                     // who may run it
  slots: SlotSpec[];                 // timeRange?, groupBy?, threshold?, department?…
  build(slots, ctx): { queries: NamedQueryModel[]; dashboard: DashboardSpec };
  summaryFocus: string[];            // which computed metrics the summary should speak to
  followups: FollowupSpec[];         // suggested next questions (may be parameterised)
};
```
A flat, type-safe **registry** of these (≈15–20 in Phase 1) lives in `src/lib/intelligence/intents/`.
Adding a question is adding a file here — no engine changes.

### 4.2 Dashboard Spec (declarative, composer renders it)
```typescript
type DashboardSpec = {
  kpis: KpiSpec[];                   // {label, fromQuery, metric, format, deltaFrom?}
  widgets: WidgetSpec[];             // {type, fromQuery, encoding}
  tables: TableSpec[];               // detail/"outstanding students" lists
};
type WidgetType = 'kpi' | 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'heatmap'
                | 'table' | 'ranking' | 'alert' | 'progress';
```
Dashboards are **never hardcoded screens** — a spec + the returned datasets drive the
**Dashboard Composer**, which maps each widget to a Recharts/coded component.

### 4.3 Slots (what the LLM extracts)
`timeRange` (this AY / last semester / month…), `groupBy` (department/program…),
`threshold` (e.g. "below 75%"), `department`, `comparison` (vs last year), `metricFocus`.
Slots are validated/normalised by code before they reach a Query Model.

---

## 5. AI usage boundary (LLM only where it adds value)

| Stage | Engine | Notes |
|-------|--------|-------|
| ① Understand question + intent + slots | **LLM** (Claude) | structured JSON out (intentId + slots + confidence); deterministic matcher as fallback |
| ② Build Query Model(s) | **Code** | from IntentDefinition.build(slots) |
| ③ Run query | **CF-2** | unchanged, RLS-scoped |
| ④ Compose dashboard | **Code** | Dashboard Composer |
| ⑤ Executive summary | **LLM** (Claude) | **grounded only in returned aggregates** — never invents numbers |
| ⑥ Follow-ups | **Code + LLM** | intent-defined defaults, LLM may add context-aware ones |

**Graceful degradation:** with no Anthropic credit (current state, deferred-register B2),
CF-3 still runs via the deterministic intent matcher + a templated summary. AI *elevates*
the experience; it isn't a single point of failure.

---

## 6. Security & privacy (the part that must be perfect)

- **RLS is the boundary, via CF-2.** Every dataset is produced by CF-2 `runQuery`, which
  runs as the signed-in user. Aura Intelligence **cannot** read beyond the user's permissions —
  same guarantee Data Explorer already proves.
- **Role personalisation** (§7) decides *which intents* + *default scope*; RLS independently
  enforces the data boundary. Defence in depth.
- **The LLM never sees raw PII.** The summary call receives **only computed aggregates/KPIs**
  (e.g. "collection 87%, top dept Commerce, outstanding ₹X") — not student rows. Raw rows stay
  server-side for the grid/tables; the model summarises numbers, not people.
- **No-hallucination contract:** the summary prompt is given the exact computed metrics and is
  instructed to use *only* those; we render the KPIs from code regardless, so the dashboard's
  numbers are always authoritative even if prose is disabled.
- **Audited:** each question (intent, slots, role, institution) is logged (A8 / CF-4) — never the result data.

---

## 7. Personalisation by role

| Role | Default scope | Intent set |
|------|---------------|-----------|
| Chairman / Management | Institution-wide | all executive intents |
| Principal | Operational | academics/ops/finance |
| IQAC | Compliance | NAAC/IQAC/outcomes |
| HOD | **Department-scoped** (auto-injected slot) | department analytics |
| Faculty | Teaching | own classes |
| Student | Personal only | own data |
| Parent | Child only | child data |

Role sets the **greeting** ("Good morning, Chairman"), the **available intents**, and a
**default scope slot** (e.g. HOD intents auto-add `department = own`). RLS still enforces it.

---

## 8. Screen experience

Calm. Minimal. Executive. No filters, no charts until the first question.

```
            Good morning, Chairman.
        What would you like to know today?

   ┌─────────────────────────────────────────────┐
   │  Ask Aura anything about your institution…   │
   └─────────────────────────────────────────────┘

   Recent questions
   • Fee collection this academic year
   • Departments with low admissions
   • Attendance below 75%      • NAAC readiness
```

After a question: the composed dashboard fades in (KPIs → charts → tables), the **Executive
Summary** sits beneath, and **"You may also want to ask…"** follow-ups invite exploration.
Think *ChatGPT meets Power BI* — premium, confident, low cognitive load, no flashy motion.

---

## 9. Module structure (new — CF-2 untouched)

```
src/lib/intelligence/
  types.ts                 ← Intent, Slot, DashboardSpec, WidgetSpec
  registry.ts              ← the intent registry (imports all intents)
  intents/                 ← ONE FILE PER INTENT (the extensibility surface)
    finance.fee-collection.ts
    admissions.low.ts
    attendance.risk.ts
    … (≈15–20)
  matcher.ts               ← deterministic alias matcher (AI-optional fallback)
  composer.ts              ← Dashboard Composer (spec + datasets → widget data)
src/actions/intelligence.ts ← askAura(question): pipeline orchestrator (calls CF-2 runQuery)
src/components/intelligence/
  AuraIntelligence.tsx     ← the calm ask surface + dashboard render
  widgets/                 ← KpiCard, LineChart, BarChart, Donut, Heatmap, Ranking, …
src/app/intelligence/page.tsx
supabase/migrations/…_cf3_intelligence_queries.sql  ← question history (Recent + memory + audit)
```

**Reused from CF-2 (imported, never modified):** `runQuery`, Query Model types,
the entity registry. **Reused elsewhere:** `@anthropic-ai/sdk` (KH-5), Recharts, the audit log.

### Data model (one new table)
`intelligence_queries` — `{ id, institution_id, user_id, role, question, intent_id, slots jsonb, created_at }`,
RLS owner-scoped. Powers **Recent Questions** now; the seam for **CF-3.2 conversation memory** later.
*No result data is stored.*

---

## 10. Phase 1 scope — ~15–20 flagship intents

Finance/Fee Collection · Admissions · Attendance · Results · Placements · Scholarships ·
Faculty Workload · Timetable · Finance Overview · Payroll · Budget · NAAC · IQAC ·
Student Risk · Research · Alumni.

Each = **one Intent Definition** → one Dashboard Definition. The architecture's whole point
is that #17, #50, #200 are each just another file in `intents/`.

---

## 11. Future extension points — architected-for, NOT built

| | Capability | Hook already in the design |
|---|---|---|
| CF-3.1 | Voice questions | input adapter in front of `askAura()` |
| CF-3.2 | Conversation memory | `intelligence_queries` history + a session context slot |
| CF-3.3 | Scheduled insights ("Mon 9am: fee collection") | a cron firing a stored intent → email (reuse pg_cron + Resend) |
| CF-3.4 | Predictive analytics | a `forecast` widget type + a model-backed query source |
| CF-3.5 | Recommendation engine ("what should I do?") | a recommendation block after the summary |
| CF-3.6 | Cross-dashboard comparison | multi-intent compose (the composer already takes N datasets) |
| CF-3.7 | Institution Health Score | a meta-intent aggregating others |
| CF-3.8 | Chairman's Daily Brief | scheduled multi-intent digest (CF-3.3 + 3.6) |

None built now. Each slots into the existing pipeline without re-architecting.

---

## 12. Implementation phasing (after design sign-off)

1. **Pipeline skeleton** — types, registry, `askAura()` orchestrator, deterministic matcher, the `intelligence_queries` table, the calm ask UI, the Dashboard Composer with a core widget set.
2. **3 flagship intents end-to-end** — Fee Collection, Admissions (low), Attendance Risk — proving question → CF-2 → composed dashboard → summary → follow-ups, with role scoping + RLS.
3. **Fill the registry** to ~15–20 intents (mostly new Intent files, little new engine).
4. **AI polish** — summary quality, fuzzy intent tolerance, follow-up generation (graceful without credit throughout).

> Deliberately **not** "build every possible question." Build the *engine* + a few signature
> intents brilliantly; scale by adding intent files.

---

*CF-3 · Aura Intelligence — the Intelligence Layer. Built on CF-2, secured by RLS, extensible by
one-file-per-intent. The signature experience of Aura Infinity.*

---

## CF-3 v2 — General Executive Intelligence Engine (2026-06-29)

v1 answered by **intent** (15 curated questions). v2 adds a **general engine** that answers
arbitrary business questions by **business meaning**, choosing the right visual automatically.
CF-2 stays frozen; the LLM only classifies/extracts (never writes SQL).

**Pipeline:** Question → Slot Extraction (`slotExtractor.ts` deterministic + `llm.ts:extractQueryLLM`)
→ Semantic Resolution (`semantic.ts`: exact → trigram → pgvector; e.g. "computer science" →
`department_id`) → Query Planner (`queryPlanner.ts` → validated CF-2 Query Models) → shared CF-2
executor (`dataExplorer.ts:executeQueryModel`, RLS) → Response Strategy (`responseStrategy.ts`:
KPI/LIST/TREND/COMPARISON/DISTRIBUTION/EXECUTIVE) → Visualization Composer (`composerV2.ts` → typed
**blocks**: KpiStrip, RecordGrid, Chart, Comparison, Summary, Recommendations) → grounded Summary
(`summary.ts`) → Follow-ups (`followups.ts`). The 15 v1 intents still serve broad/executive
questions, adapted into the same block model.

**Vector search:** pgvector + pg_trgm (migrations `20260721…`–`20260724…`); a `staff_salary` CF-2
view (staff ⋈ active salary structure) backs salary questions; `intelligence_catalog_terms` +
`intelligence_value_index` hold embeddings (gte-small via the `embed` edge function). Embeddings are
optional — exact/trigram resolution works with `$0` credit and no edge function.

**UI:** the answer view renders blocks dynamically (no fixed dashboard); RecordGrid is sortable,
paginated, and exports CSV/Excel/PDF. **Acceptance:** "staff drawing salary < ₹10,000" → KPIs +
record grid (no faculty dashboard); "second-year computer science students" → filtered list.
Tests: `tests/unit/intelligenceV2.test.ts`.

> ⚠️ "Vector Search" becomes literally true once the `embed` function is deployed
> (`SUPABASE_EMBED_URL` set); until then resolution runs on exact/trigram (still effective).

---

## CF-3.1 — Quality, Trust & Measurability (2026-06-30)

The architecture (CF-3 v2) is **stable and frozen** — no major changes. CF-3.1 makes Aura
Intelligence **measurable, accurate and trustworthy**. Engineering principles unchanged: no
AI-generated SQL, no bypassing CF-2/RLS, business logic deterministic, LLM only classifies.

### Workstream 1 — Evaluation Suite ✅ (this increment)
`tests/intelligence-evaluation/` runs in CI (no DB, no LLM — pure functions):
- `catalog.ts` — a fixture mirroring the real CF-2 entity registry (all 17 entities).
- `cases.ts` — a growing library of real executive questions, tiered:
  - **core** — asserted individually (must pass exactly),
  - **extended** — counted toward the accuracy **baseline** (`BASELINE_RATE`, currently 0.95),
  - **gap** — known limitations (missing entity/dimension/routing); reported, never asserted — this is the improvement roadmap.
- `eval.test.ts` — drives extract → plan → response-strategy per case, prints a per-domain
  scoreboard + the gap list, and **fails CI if accuracy regresses**. Target: grow to 300–500.

Building the suite already raised real accuracy to **100%** on 66 core+extended questions by
fixing entity disambiguation in `slotExtractor.ts` (salary vs headcount, attendance vs students,
IQAC actions) and generalising group-by detection to any groupable column ("by grade/scheme/company").

### Roadmap (sequenced follow-ups)
- **WS2 Confidence Engine** — per-stage + overall confidence (internal; dev-mode only).
- **WS3 Clarification Engine** — below threshold or ambiguous resolution → ask, never guess.
- **WS4 Developer Lab** `/admin/dev/ai-lab` — inspect every stage of a question.
- **WS9 Observability** — per-execution trace (stages, timings, confidence) + replay.
- **WS5 Performance Metrics**, **WS6 Intelligence Analytics**, **WS7 Semantic Catalog Manager**,
  **WS8 Response Pattern Library** (heatmap/map/timeline/forecast blocks).

> The suite is the keystone: every later change is gated by "no accuracy regression".
