# 🩺 Supabase Disk I/O Analysis — AURA Campus

> **Status:** Project dashboard reports **Unhealthy** with **high Disk I/O consumption**.
> **Date:** 2026-06-22 · **Compute tier:** Nano · **DB size:** 25 MB
> **This is an analysis report only — no schema, code, or config changes have been made.**
>
> All findings below are backed by live read-only diagnostics (`pg_stat_statements`,
> `pg_stat_user_tables`, `pg_stat_user_indexes`, `pg_replication_slots`,
> the Supabase performance advisor). Counter-based numbers come from the current
> `pg_stat_statements` window (stats appear to have reset recently, e.g. on a restart
> during the unhealthy period), so call counts are a **recent sample**, not all-time.

---

## TL;DR

The database is **25 MB** and serves **99.67% of reads from RAM** — so this is **not**
a data-volume or read-throughput problem. It is an **I/O-operations (IOPS) / write
problem on a very small burst-based I/O budget (Nano)**, driven by four amplifiers:

1. **Always-on Realtime WAL decoding** — the single largest time consumer (one query: 205 calls, **2,923 ms total**). Two active logical-replication slots decode **every** write in the database, even though only `notifications` is published.
2. **Write amplification** — **341 of 562 indexes (61%) are unused**; every INSERT/UPDATE/DELETE still maintains them (extra WAL + page writes).
3. **RLS evaluated per-row** — **166 policies re-evaluate `auth.uid()`/`current_setting()` for every row**, and **273 "multiple permissive policies"** are OR-evaluated per row. Every protected read does more CPU + buffer work than it should.
4. **A brand-new, heavy CI load (today): the authenticated e2e suite now runs against this production DB on every push and PR** — seeding churn + repeated logins + a 230-route crawl. Its activation **correlates in time** with the onset of the unhealthy state.

**Verdict (Q7):** Primarily a **Nano-tier limitation amplified by architectural inefficiencies + a self-inflicted CI load**. A 25 MB DB should never be I/O-stressed; Nano's I/O budget is just tiny and burst-credit-based, and constant background I/O (Realtime) plus bursty churn (CI e2e, auth) exhaust the credits → sustained throttling → *Unhealthy*.

---

## 1. Top database queries by frequency

From `pg_stat_statements` (current window). The top of the list is **auth machinery**, not application queries:

| Query (truncated) | Calls | Total ms | Mean ms | Notes |
|---|---:|---:|---:|---|
| `SELECT … FROM auth.identities …` | 557 | 16 | 0.03 | per-request token validation |
| `SELECT … FROM auth.mfa_factors …` | 557 | 12 | 0.02 | per-request |
| `SELECT … FROM auth.sessions …` | 549 | 23 | 0.04 | per-request |
| `SELECT … FROM auth.mfa_amr_claims …` | 549 | 12 | 0.02 | per-request |
| `SELECT … FROM auth.users …` | 537 | 42 | 0.08 | **`auth.getUser()` on every request** |
| `set_config('search_path'/'role'/'request.jwt'…)` | 452 + 217 | 394 | — | PostgREST per-request RLS context |
| **`SELECT wal->>… (Realtime WAL decode)`** | **205** | **2,923** | **14.26** | **largest time consumer — Realtime** |
| `… FROM public.institutions WHERE slug = …` | 133 | 207 | 1.56 | **middleware slug→uuid, per `/institutions/*` request** |
| login writes: `INSERT refresh_tokens / sessions / mfa_amr_claims`, `UPDATE users.last_sign_in_at` | 20 each | ~160 | 1.8–3.1 | **per login** (e2e logs in 8+ users per run) |

**Reading:** request volume is dominated by **auth** (`getUser` fans out to 5 auth-schema queries per request) and **Realtime WAL decode** dominates *time*. The middleware slug lookup runs once per institution-route hit.

## 2. Tables with the highest read/write activity

From `pg_stat_user_tables` (public schema, current window):

**Hottest reads (the RLS hot path):**
| Table | idx_scan | seq_scan | Why |
|---|---:|---:|---|
| `institution_members` | **1,835** | 107 | Read on **every RLS check** via `private.get_user_authorizations()` |
| `institutions` | 238 | 82 | middleware slug→uuid + membership joins |
| `students` | 100 | 20 | RLS-scoped reads |
| `staff` | 82 | 97 | RLS-scoped reads (note seq_scan ≈ idx_scan) |

**Auth schema (per-request + per-login):** `auth.users` (111 rows), `auth.sessions` (22), `auth.refresh_tokens` (24) — small tables but written on every login and read on every request.

**Writes this window** are low in the public schema (`data_consent_logs` 32, `institution_members` 14) — consistent with a recent stats reset. The **sustained** write pressure is in the **auth schema** (login churn) and whatever the **seed/CI** generates (see §6), all of which flows through the **WAL** that Realtime must decode.

## 3. Potential N+1 / fan-out query patterns

Not classic ORM N+1, but two **per-request fan-out** patterns that multiply under load (and explode during the 230-route crawl):

- **Auth fan-out per request.** Each page does `supabase.auth.getUser()` in **both** the middleware **and** the server-component layout/page, and again inside each server action. `getUser()` itself expands into ~5 `auth.*` queries (users/sessions/identities/mfa_factors/mfa_amr_claims). One page view ≈ **10+ auth-schema queries**. The route-crawl (230 routes × roles) turns this into **thousands** of auth round-trips per CI run.
- **RLS helper per table per query.** `private.get_user_authorizations()` reads `institution_members` (hence **1,835** index scans) and is invoked by RLS on **every** protected table in **every** query — and, because of the init-plan issue (§5), effectively **per row**.
- **Middleware slug→uuid lookup** (`institutions WHERE slug=…`, 133 calls) runs on **every** `/institutions/*` navigation; it's cacheable but currently hits the DB each time.

## 4. Missing indexes

Genuinely missing indexes are **not** the problem here — only **3** unindexed foreign keys (all on the recently-restored clubs tables):

| Table | FK |
|---|---|
| `club_members` | `club_members_student_id_fkey` |
| `club_activities` | (FK without covering index) |
| `club_members` / related | (per advisor) |

Adding these is cheap and correct, but won't move Disk I/O materially. **The real index problem is the opposite — too many indexes (§5 / write amplification).**

## 5. RLS policies causing expensive scans

This is the largest **architectural** contributor. The performance advisor returned **673 findings**:

| Advisor finding | Count | Level | Impact on I/O |
|---|---:|---|---|
| `auth_rls_initplan` | **166** | WARN | Policy re-evaluates `auth.uid()` / `current_setting()` **per row** instead of once per query. Forces extra CPU + buffer reads on every protected SELECT/UPDATE; defeats some index usage. |
| `multiple_permissive_policies` | **273** | WARN | Multiple permissive policies for the same role+action are **OR-evaluated for every row** — each row pays for *all* matching policies. |
| `unused_index` | **231–341** | INFO | 61% of indexes unused → **write amplification** (every write maintains them → more WAL + dirty pages). |
| `unindexed_foreign_keys` | 3 | INFO | clubs tables (§4). |

The init-plan pattern is Supabase's #1 documented RLS performance pitfall: `auth.uid()` should be wrapped as `(select auth.uid())` so the planner evaluates it **once** (InitPlan) rather than per row. With **341 total RLS policies** across the schema and **166** hitting this, nearly every read in the app is paying a per-row tax — which on Nano translates directly into buffer churn and CPU saturation.

## 6. Is the route-crawl / e2e generating excessive DB load? — **Yes, and it's new**

**This is the most time-correlated finding.** As of **today**, the authenticated Playwright suite (Arch A2 Step 6) became a **required CI check that runs against this same production Supabase project** on **every push to `main` AND every pull request**. Each run does, against the 25 MB prod DB:

1. **Seed churn** — `npm run seed:e2e` **deletes + re-inserts** ~8 users + ~25 domain entities + DPDP consents, and pages `auth.admin.listUsers()` (scans all **111** auth users, once per user resolved). Delete+insert churn → **dead tuples → autovacuum I/O** and **WAL**.
2. **Repeated logins** — setup logs in **8 roles**, flows log in several more; each login **writes** `auth.sessions` + `auth.refresh_tokens` + `auth.users.last_sign_in_at` (the login-write rows in §1). 22 sessions / 24 refresh tokens currently linger.
3. **230-route crawl × roles + 5 flows + cross-role + isolation** — thousands of `getUser` + RLS queries (the auth fan-out of §3) compressed into a few minutes.

Today alone this ran for **PRs #9–#13 plus the merges to `main`** — i.e. **~10 full suite executions**, each a concentrated burst of auth + RLS + write churn. On Nano's burst-credit I/O budget, repeated 6-minute CI bursts are more than enough to drain credits and trip the health check. The documented Step 6 tradeoff ("runs against the remote DB; local-stack hardening is future") is exactly the risk that has now materialized.

> **Note:** e2e is bursty CI load, not steady-state user traffic. It inflates the *acute* spike but the *baseline* drains (Realtime + write amplification + per-row RLS) persist regardless.

## 7. Architectural vs. Nano-tier limitation

**Both — but the trigger is Nano, and the amplifiers are architectural + operational.**

- A **25 MB** database with a **99.67%** cache hit ratio is trivially small; on any paid compute tier this workload would be unremarkable.
- **Nano** is the entry/dev compute tier: shared CPU and a **small, burst-credit-based disk I/O allowance**. It has almost no headroom for *sustained* background I/O.
- The **sustained background I/O** here is real and architectural: **always-on Realtime WAL decoding** (2 slots, the 2,923 ms query) + **write amplification** from 341 unused indexes + **per-row RLS auth re-evaluation** across 341 policies.
- The **acute spike** is operational: the **e2e suite now hammering prod on every CI event** (§6).

Net: the inefficiencies were tolerable until (a) Realtime + write-amplification created a constant floor and (b) the new CI e2e load pushed the burst budget over the edge.

---

## ✅ Recommended fixes & expected impact

> Ordered by **impact ÷ effort**. **No changes applied yet** — this is the proposal.

| # | Fix | Addresses | Effort | Risk | Expected impact |
|---|-----|-----------|--------|------|-----------------|
| **R1** | **Stop e2e running against prod.** Point the CI `e2e` job at an **ephemeral local Supabase** (as the `migrations` job already does) or a **dedicated test project**; as an interim, restrict it to **PR-only** (drop the `push: main` trigger) and lower Playwright worker concurrency. | §6 | Low–Med | Low | **Removes the acute spike** — the new load that correlates with onset. Fastest relief. |
| **R2** | **Fix `auth_rls_initplan` (166 policies):** wrap `auth.uid()` → `(select auth.uid())` (and same for `auth.jwt()`/`current_setting`). | §5 | Medium | Low (Supabase-recommended, behavior-preserving) | **Largest sustained win** — cuts per-row CPU + buffer reads on essentially every protected query app-wide. |
| **R3** | **Drop the 341 unused indexes** (after a longer observation window confirms `idx_scan=0` in production, not just the test window). | §5 | Medium | Med (must confirm not used by rare/critical paths) | Less **write amplification** → fewer WAL records + dirty-page writes per mutation → lower write IOPS on Nano. |
| **R4** | **Consolidate `multiple_permissive_policies` (273):** merge overlapping permissive SELECT policies per role into one policy with an OR'd predicate. | §5 | Med–High | Med (re-verify access matrix — A2 e2e covers this) | Fewer policy evaluations per row on hot tables. |
| **R5** | **Re-evaluate Realtime.** Only `notifications` is published, yet the slot decodes all WAL. If the in-app notification bell can tolerate short-poll/refresh, disabling Realtime removes a constant I/O/CPU floor. Otherwise keep it but pursue R3 to shrink WAL volume. | §1, §2 | Low (toggle) | Med (UX: live notifications) | Removes the **single largest time consumer** (2,923 ms) from the background. |
| **R6** | **Cache the middleware slug→uuid lookup** (in-memory/edge map, revalidated) so `/institutions/*` doesn't hit `institutions WHERE slug=` per request. | §1, §3 | Low | Low | Removes 100s of per-request DB hits under real traffic. |
| **R7** | **Add the 3 missing FK indexes** on the clubs tables. | §4 | Trivial | Low | Correctness; negligible I/O effect but closes the advisor finding. |
| **R8** | **Upgrade off Nano** (Micro/Small) **if real user traffic is expected**. | §7 | Trivial ($) | Low | The **definitive headroom fix** — but do R1–R3 first so you're not paying to mask inefficiency. |
| **R9** | **Reduce auth fan-out in tests / hygiene:** prune stale `auth.sessions`/`refresh_tokens`; have the seeder reuse sessions; lower crawl parallelism. | §3, §6 | Low | Low | Smaller CI burst footprint (complements R1). |

### Suggested sequence
1. **Immediate (stops the bleeding):** R1 (e2e off prod) + R5 (assess/limit Realtime) → should clear the *Unhealthy* state quickly.
2. **This week (removes the floor):** R2 (RLS initplan) + R3 (drop unused indexes) → permanent baseline reduction; re-run the A2 e2e suite (now isolated per R1) to confirm no regressions.
3. **Follow-up:** R4, R6, R7, R9 — and R8 only if production traffic justifies it.

### Expected outcome
With **R1 + R2 + R3 + R5**, a 25 MB database on Nano should sit comfortably idle between bursts: reads stay in cache, writes stop amplifying across 341 indexes, RLS stops re-evaluating auth per row, and the constant Realtime WAL drain is removed or shrunk — eliminating the sustained I/O that exhausts Nano's burst credits. R8 (tier upgrade) then becomes a capacity decision for real traffic, not a workaround for inefficiency.

---

*Diagnostics were read-only. No `auth_rls_initplan` rewrite, index drop, Realtime toggle, CI change, or tier change has been performed — awaiting approval to proceed with any of R1–R9.*
