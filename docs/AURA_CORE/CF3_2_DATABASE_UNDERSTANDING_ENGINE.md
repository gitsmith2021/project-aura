# 🧠 CF-3.2 — Aura Intelligence: Database Understanding Engine

> **Type:** Architecture proposal + locked decisions. **Status:** 🟡 **Proposal — decisions locked, NOT yet implemented** (as of 2026-07-01).
> **Supersedes the conceptual centre of** [CF3_AURA_INTELLIGENCE.md](CF3_AURA_INTELLIGENCE.md) (§3 "Intent Registry is the backbone") — the intent registry is demoted from *architecture* to a *first-tier fast-path preset*.
> **Built ON TOP of CF-2 — CF-2 stays frozen.** No AI-generated SQL. RLS is the only data boundary. pgvector is used to *understand* questions (retrieval), never to *answer* them.

---

## 0. The reframe (read this first)

The goal: Aura Intelligence should become an AI layer that understands the **entire database** rather than only predefined intents. The database itself is the knowledge source. Answers are grounded 100% on stored facts — **no predictions, no fabricated summaries, no hallucinations.** Think *"ChatGPT for my own database."*

The important finding: **the codebase is already further along than the CF-3 vision doc implies.** The intent registry is *already not the centre* of the runtime. In [pipeline.ts](../../src/lib/intelligence/pipeline.ts) the live flow is:

```
Question → extract (LLM or deterministic) → semantic resolution → queryPlanner
         → CF-2 executeQueryModel → responseStrategy → composer → grounded summary
         → [only if all that fails] → intent-template fallback
```

The **general, database-driven path runs first** (`pipeline.ts:174`). Intents are step 3 — a *fallback* for broad/"EXECUTIVE" questions (`pipeline.ts:224`). So CF-3.2 is **evolution, not teardown**: make the general path the whole story, widen what it can see, and let it choose the answer shape from evidence.

The desired pipeline already maps almost 1:1 onto existing files:

| Desired stage | Where it lives today | Status |
|---|---|---|
| Natural Language Understanding | `llm.ts:extractQueryLLM` + `slotExtractor.ts` | ✅ exists |
| Database Understanding | `data_explorer_entities` + `intelligence_catalog_terms` | ⚠️ partial (17 curated entities, not whole DB) |
| Entity Resolution | `semantic.ts` (exact→trigram→pgvector) + `intelligence_value_index` | ✅ exists, needs widening |
| Query Planning | `queryPlanner.ts` | ⚠️ single-entity only |
| CF-2 Query Engine | `dataExplorer.ts:executeQueryModel` | ✅ frozen, keep |
| Result Understanding | *(missing — strategy runs pre-execution)* | ❌ the real gap |
| Response Strategy | `responseStrategy.ts` + `composerV2.ts` | ⚠️ pre-execution, needs to move |
| Answer | `Block[]` union in `types.ts` | ⚠️ no plain-text/record-card mode |

The work is **four evolutions + two new components**, not a rewrite.

---

## 1. The honest accuracy model (the most important section)

"100% factual accuracy" must be defined precisely, because it drives the whole design:

- **Numbers are already 100% exact and RLS-safe.** Every rendered value comes from `executeQueryModel` → PostgREST → Postgres under the user's RLS. The LLM never computes a number, never sees raw PII rows, and `validateQueryModel` rejects any hallucinated column before it reaches the DB. CF-3.2 preserves this unconditionally.
- **The residual risk is *interpretation*, not arithmetic.** The failure mode isn't "wrong number" — it's "answered a subtly different question" (read "salary" as base pay when you meant gross). pgvector cannot fully fix this class.
- **Therefore the accuracy strategy is: ground → and when uncertain, clarify or refuse — never guess.** The engine already does this for ambiguous departments (`resolveOrClarify`, `pipeline.ts:109`). CF-3.2 generalises it into a first-class **Evidence Governor**.

The trustworthy product is not "the AI is always right." It is **"the AI is always grounded, always shows what it understood, and says 'I don't have evidence for that' rather than inventing."** That is achievable and is the correct target.

---

## 2. The real ceilings (what actually blocks "ChatGPT for my DB")

**C1 — Catalog coverage is 17 curated entities, not the database.**
`data_explorer_entities` holds ~17 hand-registered entities/views. "Who is the IQAC Coordinator?", "Which classrooms are unused today?" fail because the *entities aren't in the catalog*, not because of AI. The DB has ~200 tables; Aura sees 17.

**C2 — CF-2 Query Model is single-entity with no joins.**
[dataExplorer.ts:55](../../src/lib/dataExplorer.ts) — a `QueryModel` has one `entity`; grouping/aggregation happen **in-process in JS** over RLS-capped rows. No JOIN. Relational questions ("students in CS **with arrears**", "classrooms **without** a class today") are only expressible if a **pre-joined view** exists as an entity. Biggest structural constraint.

**C3 — No plain-text / record-card answer mode.**
The `Block` union ([types.ts:156](../../src/lib/intelligence/types.ts)) has `recordGrid`, `kpiStrip`, `chart`, `summary`… but no **single-record card** or **plain-text answer**. "Who is the IQAC Coordinator?" renders a 1-row table, not "Dr. X (Associate Professor, Physics)".

**C4 — Response strategy is decided *before* execution.**
`responseStrategy.decideResponse` runs on the *parsed question* ([responseStrategy.ts:25](../../src/lib/intelligence/responseStrategy.ts)), from an LLM `responseHint`. The "1 result → card, N → table, grouped → chart" rule requires deciding **after** seeing the result shape.

**C5 — The planner LLM is grounded on *column names*, not *values*.**
`extractQueryLLM` ([llm.ts:61](../../src/lib/intelligence/llm.ts)) sees `staff: { designation:text, ... }` but not that `designation ∈ {Professor, HOD, Dean…}`. The `intelligence_value_index` exists but is used only *after* planning (for resolution), not fed *into* the planner. This is the retrieval-augmentation opportunity.

---

## 3. Proposed CF-3.2 architecture

### 3.1 The new centre: the Semantic Database Model (SDM)

Replace "Intent Registry as the conceptual centre" with a **Semantic Database Model** — a versioned, mostly auto-generated catalog that is the single source of database knowledge. It absorbs `data_explorer_entities`, `intelligence_catalog_terms`, `intelligence_value_index`, and `intelligence_entity_aliases`.

The SDM knows:

- **Tables & views** (from `information_schema`) — business description + embedding.
- **Columns** — type, business label, synonyms, sensitivity flag (PII/none), and role — *dimension / measure / identifier / date / status-enum / foreign-key*.
- **Relationships** — real FKs (from `pg_catalog`) → the join graph. Unlocks C2.
- **Enumerated values** — distinct low-cardinality values ("Present/Absent/Leave", designations, statuses), auto-harvested (extends the existing value-index builder).
- **Semantic synonyms** — salary≈pay≈compensation, department≈branch≈school — as embeddings, driven by the catalog, not hardcoded.

The SDM is **populated by introspection**, not by hand-writing 200 intent files. A generator reads schema + FKs + distinct values → writes SDM rows → (optionally) embeds them. This is the mechanism that scales Aura from 17 entities to "the whole database" — governed by a **sensitivity/allowlist** so no unsafe table is ever exposed.

### 3.2 The pipeline (the desired flow, realised)

```
Question
  ↓ ① NL Understanding            (llm.ts, evolved: classify answer-need + extract)
  ↓ ② Schema+Value Retrieval      (NEW: pgvector over SDM → the K relevant tables/
  │                                columns/values/relationships for THIS question)
  ↓ ③ Grounded Query Planning     (queryPlanner, evolved: RAG-planned, relationship-
  │                                aware; emits 1..N CF-2 QueryModels + a compose plan)
  ↓ ④ Evidence Governor           (NEW: is every field/value grounded in the SDM?
  │                                is this causal/predictive? → run | clarify | refuse)
  ↓ ⑤ CF-2 Execution              (executeQueryModel — UNCHANGED, RLS)
  ↓ ⑥ Result Understanding        (NEW: inspect actual result shape/cardinality)
  ↓ ⑦ Response Strategy           (responseStrategy, MOVED to post-execution)
  ↓ ⑧ Answer Composition          (composerV2 + 2 new block kinds)
  ↓ ⑨ Grounded narration          (summary.ts — evidence-only, causal-guarded)
Answer
```

The spine (②③④⑥⑦) is **the database, not intents**. Vectors appear **only in ②** — to *understand*, never to answer. The answer still comes 100% from ⑤.

### 3.3 How each ceiling is resolved

- **C1 (coverage)** → SDM introspection generator + sensitivity allowlist. New entities/views become answerable without code.
- **C2 (joins)** → curated RLS-safe views for hot join paths (the `staff_salary` view pattern, see [migration](../../supabase/migrations/20260722000000_cf3v2_staff_salary_entity.sql)) **+** multi-model in-process compose for the long tail (the pipeline already runs N named models and composes them). **Never dynamic SQL joins.**
- **C3 (answer modes)** → add `plainText` and `recordCard` to the `Block` union.
- **C4/C6 (post-execution strategy)** → move `decideResponse` to run after execution using result cardinality: 1 row+lookup → `recordCard`/`plainText`; N rows → `recordGrid`; grouped → chart; single aggregate → `KPI`; time-bucketed → `trend`. The pre-execution hint becomes a *prior*, not the decision.
- **C5 (value grounding)** → stage ② injects retrieved enumerated values into the planner prompt, so the LLM plans against real values ("Professor" is a known `designation`).

---

## 4. Hallucination governance — the Evidence Governor (stage ④ + ⑨)

A deterministic gate, not a prompt:

1. **Grounding check** — every entity, column, and resolved value in the plan must exist in the SDM / pass `validateQueryModel`. Ungrounded → don't run.
2. **Causal/predictive guard** — classify the *question type*. "Explain **why** admissions dropped", "**predict** next year" → the DB stores facts, not causation/forecasts. Answer the factual part, refuse the causal part: *"The database can show admissions fell 18% vs last year but cannot determine **why**."*
3. **Sufficiency check** — empty/near-empty result for a question presupposing data → *"I couldn't find evidence in the database for that,"* never a fabricated narrative. (`composerV2` already computes an `empty` flag; the Governor makes it a first-class refusal.)
4. **Narration contract** — `summary.ts`/`refineSummary` already receives only computed KPIs and is told "never invent numbers" ([llm.ts:116](../../src/lib/intelligence/llm.ts)). CF-3.2 tightens it: the narrator may only restate rendered values; no comparatives, causes, or trends not present in the blocks.
5. **Show-the-interpretation** — every answer carries a one-line "Understood as: *staff where monthly salary < ₹10,000*." Converts silent misinterpretation into a visible, correctable fact.

---

## 5. Keep / Evolve / Demote

| Component | Verdict | Note |
|---|---|---|
| CF-2 `dataExplorer.ts` (Query Model, executeQueryModel, RLS) | **Keep frozen** | The deterministic core. Untouched. |
| `semantic.ts` (exact→trigram→vector resolution) | **Keep + widen** | Generalise beyond department to all SDM dimensions. |
| `intelligence_value_index`, `_catalog_terms`, `_entity_aliases` | **Keep, absorb into SDM** | Right primitives; unify + auto-populate. |
| `pipeline.ts` general path | **Keep, make it the whole engine** | Add stages ②④⑥; move ⑦. |
| `llm.ts` extraction | **Evolve** | Feed it retrieved values; also output answer-need + question-type. |
| `queryPlanner.ts` | **Evolve** | Relationship-aware, multi-model + compose plan. |
| `responseStrategy.ts` | **Evolve + relocate** | Post-execution, cardinality-driven. |
| `composerV2.ts` / `Block` union | **Extend** | Add `plainText`, `recordCard`. |
| Evaluation suite (`tests/intelligence-evaluation/`) | **Keep, central** | The safety net; every CF-3.2 change gated on "no accuracy regression." |
| **Intent registry** (`intents/*.ts`, `registry.ts`, `matcher.ts`) | **Keep as first-tier fast-path** | Deterministic match first → curated dashboard; miss → general engine. Kept coherent with the general engine via the shared eval suite. |
| CF-3 doc "Intent Registry is the backbone" (§3) | **Superseded here** | SDM is the centre; intents are a fast-path preset. |

Nothing is thrown away.

---

## 6. Locked decisions (user, 2026-07-01)

| # | Fork | **Decision** | Implication |
|---|---|---|---|
| 1 | Cross-table joins | **Curated RLS-safe views + in-process compose** | Hot join-paths become DB views registered as SDM entities (the `staff_salary` pattern); long tail = N single-entity models joined in JS. CF-2 untouched. No dynamic SQL. |
| 2 | Coverage aggressiveness | **Allowlist-gated introspection** | Generator introspects everything but exposes only tables a SUPER_ADMIN approves, that are RLS-protected + sensitivity-tagged. Coverage grows by approval, not automatically. |
| 3 | Behaviour when uncertain | **Clarify-first below a confidence threshold** | `confidence.ts` becomes **load-bearing at runtime** (not just the dev lab). The Evidence Governor gains a real pre-answer gate: below threshold it asks a clarifying question *before* answering. The cheap "Understood as: …" caption stays as an *additive* transparency line on answers that do run. |
| 4 | The 15 curated intents | **Keep as a first-tier fast-path** | Two-tier router: deterministic intent match first (cheap, no LLM) → curated dashboard; miss → general DB engine. Two routers kept coherent by the shared evaluation suite. |

---

## 7. Phased rollout (each independently shippable, evaluation-gated)

Mirroring the CF-3.1 workstream discipline:

- **WS-A — Semantic Database Model foundation.** SDM tables (absorb the three existing catalogs) + an introspection generator (schema/FK/enum harvest) + sensitivity allowlist. *No behaviour change yet* — richer knowledge only. Behind a flag.
- **WS-B — Retrieval-augmented planning (stage ②+C5).** Feed retrieved tables/columns/values into the planner. Biggest accuracy win, lowest risk.
- **WS-E — Evidence Governor (§4).** Moved earlier (per decision #3, it owns the runtime confidence gate): lands right after WS-B since it depends on the same confidence signal. Causal/predictive guard + sufficiency refusal + clarify-first gate + "Understood as" line.
- **WS-C — Answer modes (C3) + post-execution strategy (C4).** `plainText`/`recordCard` blocks; move `decideResponse`. Unlocks "Who is…?" and clean single-value answers.
- **WS-D — Relationship-aware planning (C2).** Multi-model compose + the first batch of curated relationship views (classrooms⋈schedules for "unused classrooms", etc.). Heaviest; do after B/C/E prove the frame.
- **WS-F — Coverage scale-out.** Run the generator across the approved table set; grow the eval suite's `core`/`gap` tiers to the new question classes; keep intents as fast-path presets.

Each WS is a commit-sized, migration-backed increment with the eval suite as the gate — the same rhythm as CF-3.1 and the Phase 8 sprints.

---

## 8. Non-goals & risks (explicit)

- **No dynamic SQL, ever.** Joins come from curated views or in-process compose.
- **RLS stays the only data boundary.** The SDM generator must respect it — expose only RLS-protected, allowlisted tables. A naive "introspect everything" would be a data-leak vector; the sensitivity allowlist is mandatory.
- **"Whole database" is asymptotic.** WS-F widens coverage continuously; not a single flip. Honest framing: *"answers a rapidly growing fraction of factual questions, and refuses cleanly outside it."*
- **Cost/latency.** Retrieval + planning add LLM calls; keep the deterministic path fully functional at $0 credit (it already is) and cache SDM retrieval.
- **The hard limit is interpretation**, mitigated by grounding + clarify-first + refusal (§1), not eliminated.

---

## 9. Status & next step

- ✅ Architecture proposal delivered; the four forks above are **locked**.
- ⛔ **Not implemented** — CF-2 and the intelligence engine are untouched.
- ▶️ **Next:** on go-ahead, convert this into a WS-by-WS build plan starting with **WS-A** (SDM schema + introspection generator + sensitivity allowlist), sequenced and evaluation-gated like the CF-3.1 workstreams.

---

*CF-3.2 · Aura Intelligence — the Database Understanding Engine. Built on CF-2, secured by RLS, grounded 100% on stored facts. Vectors understand; the database answers.*
