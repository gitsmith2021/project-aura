# CF-3.2 — Database Understanding Engine

## Technical Design Specification (v1.0 — pre-implementation)

> **Status:** Engineering blueprint. Implements the approved architecture in [CF3_2_DATABASE_UNDERSTANDING_ENGINE.md](CF3_2_DATABASE_UNDERSTANDING_ENGINE.md). **No code, no migrations yet.** **Audience:** implementing senior engineers. **Last updated:** 2026-07-01.

### 0. Conventions & ground rules this spec obeys

- **CF-2 is frozen.** The only execution primitive is `executeQueryModel(supabaseRLSClient, institutionId, QueryModel) → { rows }`. No component here generates SQL.
- **RLS is the sole data boundary.** Every read uses the caller's RLS-scoped client. Service-role is used only for **catalog metadata** (SDM/introspection), never for answering user questions.
- **Determinism boundary.** The LLM may only *classify* and *extract into validated structures*. It never emits numbers, SQL, table names, or column names that aren't validated against the SDM afterward.
- **Notation.** Data structures are given as field tables (`Field | Type | Meaning`). Algorithms are numbered steps. Contracts are written `fnName(inputs) → output`. This is specification, not code.
- **Confidence scale.** All confidence values are `[0,1]`; **overall = min(stages)** (weakest-link), consistent with `overallConfidence` in [confidence.ts](../../src/lib/intelligence/confidence.ts).

### 0.1 Component map & data flow

```
                    ┌──────────────────────── Semantic Database Model (SDM) ───────────────────────┐
                    │  entities · columns · relationships · enum values · synonyms · embeddings     │
                    │  (built by §3 Introspection, read by §1/§4/§5, cached by §10)                 │
                    └───────────────▲───────────────────────────────▲───────────────────▲──────────┘
                                    │ read                           │ read              │ read
   Question ─► §1 Question ─► §4 Semantic ─► §5 Relationship ─► §6 Evidence ─► CF-2 ─► §7 Result ─► §8 Response ─► §9 Narrative ─► Answer
              Analyzer         Resolver       Planner            Governor      exec     Analyzer      Strategy       Generator
                 │                                                  │
                 └── classification, confidence, clarify seed       └── run | clarify | refuse  (the safety gate)
```

Every stage appends to a **Trace** (extends the CF-3.1 `Trace` type) so `/admin/dev/ai-lab` shows the full path. The **Evidence Governor (§6) is the single choke point** between planning and execution: nothing reaches CF-2 without passing it.

---

## 1. Question Analyzer

**Purpose:** turn raw text into a structured *analysis object* that drives everything downstream. It does **not** resolve values or plan queries; it classifies and measures.

**Contract:** `analyze(question, ctx) → QuestionAnalysis`
`ctx = { userId, role, institutionId, departmentId, conversationId? }`

### 1.1 Output — `QuestionAnalysis`

| Field | Type | Meaning |
|---|---|---|
| `normalizedText` | string | lowercased, whitespace/diacritics-normalized (reuse `semantic.normalize`) |
| `questionType` | enum | `FACTUAL_LOOKUP` · `AGGREGATE` · `DISTRIBUTION` · `TREND` · `COMPARISON` · `RANKING` · `EXISTENCE` · `CAUSAL` · `PREDICTIVE` · `UNSUPPORTED` |
| `answerNeed` | enum | coarse expected shape prior: `SINGLE_VALUE` · `SINGLE_RECORD` · `RECORD_SET` · `GROUPED` · `SERIES` · `NARRATIVE` (a *prior*, not the decision — §8 decides after results) |
| `entityHints` | string[] | candidate business nouns ("classrooms", "professors") |
| `filterHints` | FilterHint[] | `{ rawPhrase, operatorGuess, valuePhrase }` (e.g. "below 10000" → `{lt, "10000"}`) |
| `metricHints` | string[] | measures referenced ("salary", "attendance %") |
| `timeHints` | TimeHint? | parsed range/relative ("last 12 months") |
| `groupByHint` | string? | "by department", "per scheme" |
| `comparison` | bool | "vs last year" |
| `confidence` | ConfidenceParts | see §1.3 |
| `language` | string | for future i18n; `en` default |

### 1.2 Classification algorithm (deterministic-first, LLM-assisted)

1. **Deterministic pass** (no LLM, always runs): regex/keyword lexicons per `questionType` and `answerNeed`. Examples: leading "who/which/what is" + singular → `FACTUAL_LOOKUP`/`SINGLE_RECORD`; "how many/total/average/sum" → `AGGREGATE`/`SINGLE_VALUE`; "trend/over time/last N months" → `TREND`/`SERIES`; "compare/vs" → `COMPARISON`; "why/explain/reason" → `CAUSAL`; "predict/forecast/will/next year" → `PREDICTIVE`; "list/show/all/who are" → `RECORD_SET`.
2. **LLM pass** (only if key present, runs in parallel with §4 warm-up): a single cheap Haiku call returns `{ questionType, answerNeed, entityHints, filterHints, groupByHint, comparison }` as strict JSON. It is a **classifier**, not a planner — it never names columns.
3. **Reconcile:** if deterministic and LLM agree → high confidence. If they disagree on `questionType`, prefer the **more conservative** class (CAUSAL/PREDICTIVE/UNSUPPORTED win, because they route to refusal in §6 — failing safe). Record the disagreement in the trace.

### 1.3 Confidence calculation

Reuse the CF-3.1 parts (`entity`, `slots`, `response`, `semantic`) and **add**:

| Signal | How computed |
|---|---|
| `classify` | agreement of deterministic vs LLM classifier (1.0 both agree, 0.75 only one fired, 0.5 disagree) |
| `entity` | routing margin over runner-up (existing `entityConfidence`: tie 0.6 → margin≥3 0.97) |
| `slots` | existing `slotConfidence` (pending value-resolution filters subtract 0.1) |
| `semantic` | min resolution score across resolved values (from §4) |
| `response` | existing `responseConfidence` — but in CF-3.2 this is *post-result* (§8), so at analysis time it's provisional |

**Overall = min of available parts** (weakest-link). This overall is what the Evidence Governor (§6) compares against the clarify threshold.

### 1.4 Ambiguity detection & clarification generation

Ambiguity is detected at **three distinct layers**, each producing a typed clarification seed; §6 decides whether to actually surface it:

| Layer | Trigger | Clarification seed |
|---|---|---|
| **Entity** | two entities within routing margin (both plausible) | "Did you mean *staff salaries* or *staff headcount*?" (options = candidate entity labels) |
| **Value** | ≥2 resolved candidates with `score₁ − score₂ < AMBIGUITY_MARGIN (0.12)` and `score₂ ≥ AMBIGUITY_FLOOR (0.5)` — the existing rule | "Which *Commerce* did you mean?" (options = candidate raw values; picking re-asks with value pinned — existing `resolveOrClarify` behavior) |
| **Metric/Semantic** | a measure word maps to ≥2 columns (e.g. "salary" → `base_salary` vs `gross_salary`) | "By *salary* do you mean base or gross?" (options = column business labels) |

**Clarification object** (`Clarification`, extend existing): `{ layer, prompt, options: [{ label, rewriteQuestion | pinnedResolution }], confidenceIfSkipped }`. Options carry either a **question rewrite** (pin the phrase) or a **pinned resolution** (skip re-parsing). Clarifications are **always generated**; §6 gates whether they're shown.

---

## 2. Semantic Database Model (SDM)

The SDM is the persisted knowledge base. It **absorbs and supersedes** `data_explorer_entities`, `intelligence_catalog_terms`, `intelligence_value_index`, `intelligence_entity_aliases`. It has two tiers: **schema-level (institution-agnostic)** and **instance-level (per-institution values)**.

### 2.1 `sdm_entities` — one row per exposed table/view (schema-level)

| Column | Type | Meaning |
|---|---|---|
| `key` | text PK | stable logical key (`students`, `staff_salary`) |
| `physical_name` | text | real table/view name |
| `object_type` | enum | `table` · `view` · `materialized_view` |
| `category` | text | business grouping (People/Finance/…) |
| `label` | text | business display name |
| `description` | text | NL description (embedded) |
| `grain` | text | what one row represents ("one enrolled student") — critical for §7 |
| `default_date_field` | text? | for trend bucketing |
| `is_exposed` | bool | **allowlist gate** — SUPER_ADMIN approved |
| `rls_verified` | bool | introspection confirmed RLS enabled |
| `sensitivity` | enum | `none` · `pii` · `restricted` |
| `embedding` | vector(384)? | of `label + description + synonyms` |
| `source_hash` | text | schema fingerprint for incremental sync (§3) |
| `version`, `updated_at` | int, ts | drift tracking |

**Invariant:** a question may only reach an entity where `is_exposed AND rls_verified AND sensitivity ≠ restricted`.

### 2.2 `sdm_columns` — one row per column

| Column | Type | Meaning |
|---|---|---|
| `entity_key` | FK | |
| `key` | text | column name |
| `label` | text | business label |
| `data_type` | enum | `text·number·boolean·date·uuid·jsonb` |
| `semantic_role` | enum | `identifier · dimension · measure · date · status_enum · foreign_key · pii · freetext` — drives planning & §7/§8 |
| `unit` | enum? | `currency · percent · count · none` |
| `is_filterable/groupable/aggregatable` | bool | CF-2 capability flags |
| `fk_target_entity` / `fk_target_column` | text? | resolved FK edge |
| `synonyms` | text[] | curated + harvested ("pay","compensation") |
| `enum_cardinality` | int? | distinct-count estimate (drives whether values get indexed) |
| `sensitivity` | enum | column-level PII flag |
| `embedding` | vector(384)? | of `label + synonyms + description` |

### 2.3 `sdm_relationships` — the join graph

| Column | Type | Meaning |
|---|---|---|
| `from_entity` / `from_column` | text | |
| `to_entity` / `to_column` | text | |
| `cardinality` | enum | `one_to_one · one_to_many · many_to_one · many_to_many` |
| `join_kind` | enum | `fk` (real) · `curated_view` (a view already encodes it) · `bridge` (via join table) |
| `curated_view_key` | text? | the pre-joined SDM entity that satisfies this path, if any |
| `traversal_cost` | int | ranking hint for §5 (fewer hops preferred) |
| `confidence` | number | 1.0 for real FKs; lower for inferred edges |

### 2.4 `sdm_value_index` — per-institution enumerated values (instance-level)

Same shape as today's `intelligence_value_index` (`institution_id, entity_key, column_key, raw_value, resolved_value, embedding`) **plus** `frequency` (row count for that value — helps rank ties toward the common value) and `last_seen_at` (staleness for §3 incremental sync). Only populated for columns with `semantic_role ∈ {dimension, status_enum, foreign_key}` and `enum_cardinality ≤ threshold (default 500)`.

### 2.5 `sdm_synonyms` — global concept→term map

| Column | Type | Meaning |
|---|---|---|
| `concept` | text | canonical ("salary") |
| `term` | text | alias ("pay","income","compensation") |
| `scope` | enum | `global · entity · column` |
| `target_entity`/`target_column` | text? | what it points to when scoped |
| `embedding` | vector(384)? | |

### 2.6 `sdm_allowlist_audit` — governance trail

Every `is_exposed` / `sensitivity` change is audited (who, when, before/after) via the existing `logAudit`. Exposure is an admin action, not a code deploy.

**Design note:** the SDM is **versioned** (`version` per entity + a global `sdm_manifest_version`). Caches (§10), embeddings, and the eval fixtures all key off the manifest version so a schema change invalidates them atomically.

---

## 3. Schema Introspection Engine

**Purpose:** keep the SDM synchronized with the live Postgres schema and data, with human approval as the only gate to exposure. Runs **offline** (admin-triggered or scheduled), never in the question path.

**Contract:** `introspect(mode) → IntrospectionReport`, `mode ∈ { full, incremental }`. Uses the **service-role** client (metadata only).

### 3.1 Discovery sources

| Discovers | Source |
|---|---|
| tables/views | `information_schema.tables` |
| columns + types | `information_schema.columns` |
| foreign keys | `information_schema.table_constraints` ⋈ `key_column_usage` (or `pg_catalog`) |
| RLS enabled? | `pg_class.relrowsecurity` |
| enum values | `SELECT DISTINCT col` on low-cardinality columns (bounded, sampled) |
| PII heuristics | column-name patterns (`email/phone/aadhaar/dob/address`) + type |

### 3.2 Full regeneration algorithm

1. Enumerate all tables/views; compute a **`source_hash`** per object (sorted column names+types+FKs).
2. For each object: derive `semantic_role` per column (heuristics: `*_id`+FK→`foreign_key`; numeric+name∈{salary,amount,fee,marks}→`measure`; `*_at`/date→`date`; low-cardinality text→`status_enum` or `dimension`; name/title→`identifier`).
3. Infer relationships from FKs → `sdm_relationships` (real FK edges, `confidence=1.0`).
4. **Stage as `proposed`, not `exposed`.** New/changed entities land with `is_exposed=false`. A SUPER_ADMIN reviews the **diff report** and approves exposure (decision #2 — allowlist-gated).
5. Auto-set `rls_verified` from `relrowsecurity`; auto-flag `sensitivity=pii` on PII heuristics; **refuse to auto-expose** anything `pii/restricted` or `rls_verified=false`.
6. Harvest enum values for eligible columns → `sdm_value_index`.
7. Enqueue embedding jobs (§3.4).

### 3.3 Incremental updates

Cheaper path for routine runs:

1. Recompute `source_hash` per object; compare to stored.
2. **Unchanged hash → skip** (no embed, no value re-harvest).
3. **Changed hash →** re-derive that object's columns/roles/relationships; mark changed entities `needs_review` if a *new* column/table appeared (re-approval only needed for new *exposure*, not for a new column on an already-exposed table — that column inherits exposure but starts `sensitivity=unknown` until classified).
4. **Value drift:** for exposed dimension/enum columns, re-harvest values whose `last_seen_at` is stale or where row counts moved beyond a delta; upsert by `(institution_id, entity_key, column_key, raw_value)`; delete values not seen in N runs (tombstone, not hard-delete, to avoid thrash).
5. Emit an `IntrospectionReport` (added/changed/removed entities, columns, values, embeddings queued).

### 3.4 Embedding synchronization

- Embeddings are **derived, cache-like, and optional** (exact/trigram works at `$0` — the existing guarantee).
- A durable **embedding job queue** (`sdm_embedding_jobs: { target_kind, target_id, text_hash, status }`) decouples generation from introspection.
- Each embeddable row stores a `text_hash` of its embedding source string. A job is enqueued only when `text_hash` changes → **idempotent, no redundant embed calls**.
- A worker drains the queue via the `embed` edge function (gte-small, 384-dim), writes the vector + clears the job. Failure leaves the job `pending` (retry); the system stays fully functional meanwhile on trigram/exact.
- **Manifest bump:** completing a batch increments `sdm_manifest_version`, invalidating dependent caches (§10).

---

## 4. Semantic Resolver

**Purpose:** map free text to concrete SDM handles — the right **entity**, the right **columns/metrics**, and the real **stored values**. Generalizes today's `semantic.ts` from department-only to all SDM dimensions.

### 4.1 Entity resolution — `resolveEntity(entityHints, questionText, sdm, role) → EntityMatch[]`

1. Candidate generation: match `entityHints` and salient nouns against `sdm_entities.label/synonyms` (exact → trigram) and against `sdm_synonyms`.
2. Vector rerank (if embeddings present): cosine of the question embedding vs `sdm_entities.embedding`, blended with the lexical score.
3. **Role/exposure filter:** drop entities not `is_exposed`, not RLS-verified, or outside the role's allowed set.
4. Return ranked `EntityMatch[] = { entityKey, score, via }`. The **margin** between #1 and #2 feeds `entityConfidence` (§1.3) and the entity-ambiguity clarification (§1.4).

### 4.2 Column / metric resolution — `resolveColumn(phrase, entity, sdm) → ColumnMatch[]`

Same tiered match against `sdm_columns.label/synonyms` (+ `sdm_synonyms` scoped to the entity). "salary"→`gross_salary` etc. Multiple hits above floor → metric-ambiguity clarification seed (§1.4). A resolved measure column also carries its `unit` (currency/percent) for §8/§9 formatting.

### 4.3 Value resolution — `resolveValue(entity, column, phrase, ctx) → Resolution | Resolution[]`

The existing 4-tier ladder, now driven entirely by the SDM value index:

1. **exact** (normalized equality) — score 1.0.
2. **substring/ILIKE** — 0.85.
3. **trigram/bigram** (Dice) — pure, no DB — the existing `bigramSimilarity`.
4. **vector** (pgvector cosine via `intelligence_match_values` RPC) — only when a query embedding exists; score `1 − distance`.

`department_id`-style FK columns resolve via the live name→id lookup (as today); everything else via `sdm_value_index`. **Ambiguity** = the `AMBIGUITY_MARGIN (0.12)` / `AMBIGUITY_FLOOR (0.5)` rule → returns candidates for §6 to clarify. **Tie-break** among near-equal scores uses `frequency` (favor the value that actually occurs more).

### 4.4 Synonym matching

Two layers, both catalog-driven (never hardcoded): (a) **lexical** via `synonyms[]` on columns/entities; (b) **semantic** via `sdm_synonyms` embeddings for concepts not literally present. This satisfies "salary≈pay≈compensation" and "department≈branch≈school" from data, per the mandate.

### 4.5 Output — `ResolutionBundle`

`{ entity: EntityMatch, columns: ColumnMatch[], values: [{ column, resolution|candidates }], unresolved: string[], semanticConfidence }`. `unresolved` phrases are carried forward — §6 decides whether an unresolved-but-load-bearing phrase forces a clarify/refuse.

---

## 5. Relationship Planner

**Purpose:** answer cross-table questions **without** dynamic SQL, per locked decision #1 (curated views + in-process compose).

**Contract:** `plan(analysis, resolution, sdm) → QueryPlan`
`QueryPlan = { models: NamedQueryModel[], compose: ComposeStep[], responsePrior, grounding }`

### 5.1 Decision procedure

1. **Single-entity?** If all needed columns/filters/metrics live on one exposed entity → emit **one** `QueryModel` (today's happy path). Done.
2. **Cross-entity needed?** Determine the entity set from resolved columns spanning ≥2 entities, or a relationship word ("with", "without", "per").
3. **Curated view exists?** Query `sdm_relationships` for a path whose `join_kind='curated_view'` (or an `sdm_entities` view whose grain already joins the needed entities — e.g. `staff_salary`, a future `classrooms_today`). If found → treat it as a **single-entity** query against that view. **Preferred** (indexed, deterministic, RLS-composable).
4. **No curated view → in-process compose.** If a real FK path of ≤ **2 hops** exists:
   - Emit **N single-entity `QueryModel`s** (one per entity, each RLS-scoped, each filtered as far as possible).
   - Emit `ComposeStep`s executed in JS after CF-2 returns: `join(leftKey, rightKey, kind)`, `antiJoin` (for "without/unused"), `filter`, `aggregate`, `groupBy`. Composition operates on **already-RLS-filtered, capped** rows.
   - Guardrail: if either side can exceed the **row cap (5000)** *before* the join (making the in-process result unsound), **do not fake it** → hand to §6 as `INSUFFICIENT_CAPACITY` → the answer becomes "this needs a curated view" (and the gap is logged to drive WS-D view creation). Correctness over coverage.
5. **Join impossible** (no FK path, no view, many-to-many without a bridge) → `grounding.joinable=false` → §6 refuses with "the database doesn't relate these directly."

### 5.2 `ComposeStep` catalog (in-process, pure, unit-tested)

`join` · `leftJoin` · `antiJoin` (anti/semi for "without/unused/missing") · `groupBy+aggregate` · `filter` · `sort` · `limit` · `deriveRatio` (e.g. present/total → %). Each step is a pure function `rows[] → rows[]`; the sequence is data, not code, so it's traceable and testable.

### 5.3 Output feeds §6

`QueryPlan.grounding = { allEntitiesExposed, allColumnsValid, allValuesResolved, joinable, withinCapacity }` — the checklist §6 evaluates.

---

## 6. Evidence Governor — the safety layer

**Purpose:** the single gate between planning and answering. Its verdict is one of **`RUN` · `CLARIFY` · `REFUSE`**. It is deterministic; it never calls the LLM.

**Contract:** `govern(analysis, resolution, plan, confidence, ctx) → Verdict`

### 6.1 Validation pipeline (ordered; first failing gate decides)

| # | Gate | Check | Fail → |
|---|---|---|---|
| 1 | **Question-type** | `questionType ∈ {CAUSAL, PREDICTIVE, UNSUPPORTED}` | **REFUSE (typed):** answer any factual sub-part, refuse the causal/predictive part. "…can show *what* changed, not *why*." (PREDICTIVE may offer the labelled linear projection only if the user explicitly asked to project.) |
| 2 | **Grounding** | every entity `is_exposed ∧ rls_verified ∧ sensitivity≠restricted`; every column exists; `validateQueryModel` passes for each model | **REFUSE:** "That data isn't available to answer." (never invent) |
| 3 | **Joinability / capacity** | `plan.grounding.joinable ∧ withinCapacity` | **REFUSE:** "The database doesn't relate these directly" / log gap |
| 4 | **Value resolution** | every load-bearing filter value resolved above floor | ≥2 near-equal candidates → **CLARIFY(value)**; none → drop filter *only if non-load-bearing*, else **CLARIFY** |
| 5 | **Ambiguity** | entity-margin or metric maps to ≥2 columns | **CLARIFY(entity/metric)** |
| 6 | **Confidence threshold** | `overallConfidence ≥ τ_clarify` (default **0.62**, tunable; chosen just above the 0.6 "tie" floor) | below τ → **CLARIFY** (decision #3, clarify-first) |
| 7 | **All pass** | — | **RUN** (attach the "Understood as: …" interpretation caption for §9) |

### 6.2 Post-execution sufficiency (second pass, after §7)

The Governor is re-consulted once results exist:

- **Empty result on a presupposing question** ("show staff earning < ₹10k" → 0 rows): return a **grounded null answer** ("No staff match this criteria") — *not* a refusal (0 is a fact). But for a lookup that presupposes existence ("Who is the IQAC Coordinator?" → 0 rows): **REFUSE-null** ("No IQAC Coordinator is recorded."), never fabricate a name.
- **Result contradicts the question shape** (asked SINGLE_RECORD, got 40 rows): downgrade to RECORD_SET and flag low interpretation confidence in the trace.

### 6.3 Refusal & clarification objects

`Verdict = { kind: RUN|CLARIFY|REFUSE, reason, clarification?, interpretationCaption?, trace }`. Refusals are **typed** (`CAUSAL`, `PREDICTIVE`, `UNGROUNDED`, `NOT_JOINABLE`, `NO_EVIDENCE`, `RESTRICTED`) so the UI and eval suite can assert on them. **The Governor is the only component allowed to emit "I could not find sufficient evidence."**

---

## 7. Result Analyzer

**Purpose:** classify the *actual returned datasets* into a **ResultShape** so §8 can pick a format from evidence, not from the question guess.

**Contract:** `analyzeResult(datasets, plan, sdm) → ResultShape`

### 7.1 Signals extracted per dataset

- `rowCount`, `columnCount`
- per-column role from SDM (`dimension/measure/date/identifier`)
- `distinctByDimension` (is there exactly one grouping column with M groups?)
- `hasDateBucket` (a date column bucketed to periods)
- `isAggregateRow` (single row of pure measures, no identifier)
- `entityGrain` (from `sdm_entities.grain`)

### 7.2 Classification algorithm (first match wins)

1. **`SINGLE_RECORD`** — exactly 1 row **and** the entity grain is a record (has identifier columns) **and** answerNeed ∈ {SINGLE_RECORD, RECORD_SET}. → e.g. "Who is the IQAC Coordinator?"
2. **`AGGREGATE`** — 1 row of only measures (count/sum/avg), no identifier. → "today's attendance %".
3. **`TIME_SERIES`** — a date-bucketed dimension + a measure across ≥3 periods. → "fee collection last 12 months".
4. **`GROUPED`** — exactly one dimension column + a measure/count, 2..K groups. → "students per department".
5. **`COMPARISON`** — two aligned aggregate sets (current vs prior) — set by the comparison plan.
6. **`RECORD_COLLECTION`** — N rows with identifier columns, no single dominant grouping. → "list staff earning < ₹10k".
7. **`MIXED`** — the plan produced multiple qualifying datasets (e.g. stats + list + distribution).
8. **`EMPTY`** — zero rows everywhere → hand back to §6.2.

Output: `ResultShape = { kind, primaryDataset, dimension?, measure?, dateField?, rowCount, cardinalityBand }` where `cardinalityBand ∈ {one, few(≤12), many(≤200), capped(>200)}` drives chart-vs-table choice in §8.

---

## 8. Response Strategy (post-execution)

**Purpose:** choose the **presentation mode(s)** *after* seeing `ResultShape`. The question's `answerNeed` is a tiebreak prior only.

**Contract:** `strategize(resultShape, analysis, sdm) → Block[] blueprint`

### 8.1 Decision table (ResultShape → mode)

| ResultShape | cardinality | Chosen mode(s) |
|---|---|---|
| SINGLE_RECORD | one | **Record Card** (identifier + salient fields); if 1 field asked → **Plain Text** |
| AGGREGATE | one | **KPI** (one number, unit-formatted); + Plain Text restatement |
| TIME_SERIES | ≥3 periods | **Trend** (line); + KPI (latest/total) |
| GROUPED | few (≤12) | **Bar/Donut Chart** + Table |
| GROUPED | many (>12) | **Table** (chart would be unreadable) + top-N Bar |
| COMPARISON | — | **Comparison** (current vs prior KPIs + delta) |
| RECORD_COLLECTION | many/capped | **Table** (sortable, paginated, CSV/Excel/PDF export — existing) + count KPI + Alert(count) |
| MIXED | — | **Mixed**: KPI strip → chart → table, ordered by salience |
| EMPTY | zero | Governor null/refuse message (no visualization) |

### 8.2 New answer modes (extend the `Block` union)

- **`plainText`** — `{ text }`: a single grounded sentence built from exactly one rendered value (no LLM). "The IQAC Coordinator is Dr. X."
- **`recordCard`** — `{ title, subtitle, fields: [{label, value, format}] }`: one record, salient columns picked by SDM `semantic_role` (identifier→title, dimension/measure→fields, PII suppressed by role).

Everything else reuses existing blocks (`kpiStrip`, `chart`, `recordGrid`, `comparison`, `trend`, `alerts`, `timeline`, `summary`). **Dashboards become one possible mode, not the default.**

### 8.3 Formatting

Units come from SDM (`currency`→₹ grouping, `percent`→%, `count`→integer). Never guess a format from the column name alone (today's heuristic) once the SDM `unit` is populated.

---

## 9. Narrative Generator

**Purpose:** the optional 1–2 sentence executive summary — **grounded, or absent.**

### 9.1 Grounding contract (hard rules)

1. **Input is only rendered facts** — the exact KPI/record/series values already in the `Block[]`, plus their labels/units. The model never sees raw rows or PII (existing guarantee, tightened).
2. **The model may only restate, order, and connect provided facts.** Forbidden: new numbers, comparatives not present (no "significantly", "improved" unless a delta block exists), causes, predictions, recommendations.
3. **Determinism fallback:** a template summary is always computed first (existing `buildSummary`). The LLM (`refineSummary`) only rewrites style. **If the LLM output introduces any token that isn't a provided fact/label** (numeric-diff check + entity check), discard it and keep the template. This post-generation validator is the anti-hallucination backstop.
4. **Causal/predictive questions never get a narrative** — §6 already refused/limited them; §9 does not re-open the door.
5. **Empty/refusal answers get no narrative** — only the Governor's typed message.

### 9.2 Interpretation caption (separate from narrative)

The "Understood as: *staff where gross_salary < 10000*" caption is **deterministic**, generated from the executed `QueryModel` (entity label + resolved filters), not the LLM. It renders on every RUN answer as the transparency line (decision #3 complement).

---

## 10. Caching Strategy

Four cache layers, each keyed to invalidate correctly:

| Cache | Key | TTL / invalidation | Store |
|---|---|---|---|
| **SDM catalog** (entities/columns/relationships) | `institutionId + sdm_manifest_version` | until manifest bump (§3); process-memory + request-cache | in-process LRU + React `cache()` per request (mirrors `getInstitutionSettings`) |
| **Embeddings** | `text_hash` | permanent until source text changes (idempotent jobs) | DB column; hot set mirrored in memory |
| **Semantic resolution** (phrase→resolution) | `institutionId + entityKey + columnKey + normalizedPhrase + manifest_version` | short TTL (e.g. 1h) or manifest bump | in-memory LRU (bounded), optional Redis later |
| **Query plan** (analysis→QueryPlan) | `hash(normalizedText + role + deptScope + manifest_version)` | short TTL; skip cache when confidence < τ | in-memory LRU |

**Never cache results** (RLS-scoped, per-user, freshness-sensitive) — only *plans* and *knowledge*. A cached plan still re-executes against live RLS data. Cache keys **must** include `role`/dept-scope so a HOD's plan never serves an admin.

---

## 11. Performance

### 11.1 Budget per question (target p95 < 2.5s warm)

| Stage | LLM calls | Vector lookups | DB queries | Notes |
|---|---|---|---|---|
| §1 Analyze | 0–1 (1 cheap classify; skipped if deterministic is confident) | 0 | 0 | |
| §4 Resolve | 0 | 0–2 (entity + value rerank, only if trigram ambiguous) | 0–1 (value index / dept lookup, often cached) | |
| §5 Plan | 0–1 (only if §1's deterministic parse is weak) | 0 | 0 | |
| §6 Govern | 0 | 0 | 0 | pure |
| §5→CF-2 exec | 0 | 0 | **1–N** (N = models; typically 1–3) | RLS |
| §7 Analyze | 0 | 0 | 0 | pure |
| §8 Strategy | 0 | 0 | 0 | pure |
| §9 Narrate | 0–1 (style refine; skipped at $0 credit) | 0 | 0 | |

**Typical warm path: 1 LLM call, 0–1 vector lookups, 1–3 DB queries.** Cold path adds SDM load (cached after first hit).

### 11.2 Keeping it fast

- **Deterministic-first everywhere** — LLM only when deterministic confidence is low; the whole engine runs at `$0` credit (existing property, preserved).
- **Parallelize** §1's LLM classify with §4's SDM catalog load.
- **Cap N models** at a small number; if the plan needs more, prefer a curated view (§5) — one indexed query beats many.
- **Vector lookups are HNSW-indexed** and only fire when trigram/exact is ambiguous.
- **SDM & plan caches** (§10) make repeated/similar questions near-instant.
- **Streaming UX**: render blocks as they compute (KPI strip first, narrative last) — the narrative LLM call never blocks the numbers.

---

## 12. Evaluation Framework

Extends the existing `tests/intelligence-evaluation/` (pure, CI-gated, no DB/LLM) with a labelled corpus and new metrics. Every CF-3.2 change is gated on **no regression**.

### 12.1 Golden corpus

Each case: `{ question, role, expected: { entity, columns[], values[], responseMode, verdict (RUN|CLARIFY|REFUSE), refusalType?, mustGroundOnFields[] } }`, tiered `core` (asserted exactly) · `extended` (baseline rate) · `gap` (known limits, reported not asserted). Target 300–500 cases across all question types incl. **causal/predictive (must REFUSE)** and **empty (must null/refuse)**.

### 12.2 KPIs (measurable, CI-tracked)

| KPI | Definition | Target |
|---|---|---|
| **Entity-resolution accuracy** | correct entity / total | ≥ 0.97 |
| **Value-resolution accuracy** | correct stored value / cases with values | ≥ 0.95 |
| **Response-mode accuracy** | predicted mode == expected (§8) | ≥ 0.90 |
| **Grounding rate** | answers whose every rendered fact traces to a CF-2 result | **1.00 (hard)** |
| **Hallucination rate** | narratives containing a fact not in blocks (auto-checked by the §9.1 validator over the corpus) | **0.00 (hard)** |
| **Refusal precision** | correct refusals / all refusals (didn't refuse answerable Qs) | ≥ 0.95 |
| **Refusal recall** | caught causal/predictive/ungrounded / all such | ≥ 0.98 |
| **False-clarification rate** | clarified when it should have answered | ≤ 0.10 |
| **Clarification usefulness** | clarified cases resolvable in ≤1 turn | ≥ 0.95 |
| **Precision/Recall (retrieval §2)** | relevant SDM handles retrieved for the question | P ≥ 0.9 / R ≥ 0.9 |
| **p95 latency** | end-to-end warm | < 2.5s |

Grounding & hallucination are **hard gates** (any breach fails CI). The others track a moving baseline (`BASELINE_RATE`) that may not regress — the existing CF-3.1 discipline.

### 12.3 Instrumentation

Every production answer already emits a `Trace`; extend `intelligence_queries` metrics with `verdict`, `refusal_type`, `result_shape`, `response_mode`, `n_models`, `n_vector_lookups`. The `/admin/dev/ai-metrics` dashboard adds mode-accuracy and refusal-precision panels sourced from labelled spot-checks.

---

## 13. Future Extensibility (Aura Build / Field / Vision)

The engine is **product-agnostic by construction** — nothing above names "Campus". Reuse works because the seams are data, not code:

- **The SDM is just a catalog.** Point the Introspection Engine (§3) at a different schema (Aura Build's project/BOM tables, Aura Field's work-order tables) → a new SDM, same engine. No pipeline change.
- **CF-2 is the universal executor.** Any product exposing entities to CF-2 inherits question-answering for free.
- **Blocks are a shared render vocabulary** (§8). A new product may add a block kind (e.g. Aura Vision → a `mapBlock` / `imageEvidenceCard`) without touching §1–§7.
- **Domain packs, not forks.** Product-specific knowledge = SDM rows + synonyms + curated views + a corpus tier. The intent fast-path (decision #4) becomes a per-product preset pack. The engine core (`intelligence/`) stays single-sourced.
- **Aura Vision (non-tabular):** vector search already abstracts "understanding"; Vision plugs a different retriever (image/embedding store) behind the §2 retrieval seam, while §5–§9 still compose typed, grounded blocks. The Evidence Governor's "answer only from evidence" contract is *more* important there, not less — and it already lives at the right layer.

**Architectural guarantee:** to onboard a new Aura product you add **a schema to introspect + a corpus to evaluate + optional curated views/blocks** — never a change to the Question Analyzer, Resolver, Planner, Governor, Result Analyzer, or Response Strategy.

---

## Appendix A — Module layout (where each component lands)

```
src/lib/intelligence/
  analyzer.ts          §1  (evolves slotExtractor + llm.classify)
  sdm/                 §2  types + read API over the SDM tables
  introspect/          §3  (offline; service-role; admin-triggered)
  resolver.ts          §4  (evolves semantic.ts)
  planner.ts           §5  (evolves queryPlanner.ts; adds compose steps)
  governor.ts          §6  (NEW — the safety layer)
  resultAnalyzer.ts    §7  (NEW)
  responseStrategy.ts  §8  (relocated post-execution; + plainText/recordCard)
  narrative.ts         §9  (evolves summary.ts + llm.refineSummary + validator)
  cache.ts             §10
  pipeline.ts          orchestrator (rewires stages ①–⑨ in this order)
src/actions/dataExplorer.ts   CF-2 executor — UNCHANGED
tests/intelligence-evaluation/ §12 corpus + KPIs
```

## Appendix B — Two end-to-end traces

- **"Who is the IQAC Coordinator?"** → §1 FACTUAL_LOOKUP/SINGLE_RECORD → §4 entity `staff`/`iqac_members`, filter `role='coordinator'` → §5 curated view or 1-hop → §6 RUN (grounded) → CF-2 1 row → §7 SINGLE_RECORD → §8 **Record Card** → §9 plain-text restatement. *(0 rows → §6.2 REFUSE-null "No IQAC Coordinator is recorded.")*
- **"Explain why admissions dropped this year."** → §1 CAUSAL → §6 gate 1 **REFUSE (typed CAUSAL)**, but answers the factual sub-part ("Admissions fell 18% vs last year: 1,240 → 1,020") as a Comparison block, and states the DB cannot determine *why*. No narrative invents a cause.

---

*CF-3.2 · Aura Intelligence — Database Understanding Engine · Technical Design Specification. Built on CF-2, secured by RLS, grounded 100% on stored facts. The Evidence Governor is the safety spine; the Result Analyzer + Response Strategy split makes format follow evidence.*
