# 🛠️ Infrastructure Stabilization — R1 · R2 · R5

> **Goal:** return the Supabase project from **Unhealthy → Healthy** before beginning
> major Phase 8 work, by removing the avoidable Disk-I/O load identified in
> [DISK_IO_ANALYSIS.md](DISK_IO_ANALYSIS.md).
> **Scope of this round:** R1 (remove e2e load from prod) · R2 (resolve
> `auth_rls_initplan`) · R5 (evaluate/propose Realtime). **Explicitly excluded:**
> R3 (unused-index removal) and any compute-tier upgrade — both deferred per direction.
>
> **Date:** 2026-06-22 · **Tier:** Nano (unchanged) · **Status of this round:**
> R1 ✅ executed · R2 ✅ executed + validated · R5 🔎 evaluated + proposed (not executed).

---

## Status summary

| Item | What it does | This round | Where |
|---|---|---|---|
| **R1** | Stop the authenticated e2e suite from running against the **production** Supabase project | ✅ **Executed** — CI e2e paused against remote (gated on `RUN_E2E`, default off → skip-green) | `.github/workflows/ci.yml` |
| **R2** | Resolve the 166 `auth_rls_initplan` findings — wrap `auth.uid()`/`auth.email()` so RLS evaluates them **once per query** not per row | ✅ **Executed + validated** — all 166 policies wrapped; A2 e2e (isolation + cross-role + action-auth) green | migration `20260709000000_rls_initplan_fix.sql` (applied to remote) |
| **R5** | Decide whether **Realtime** can be disabled for v1.0 | 🔎 **Evaluated + recommended** (needs a small code fallback + owner toggle — **not executed**) | proposal below |

---

# R1 — Remove e2e load from the production Supabase project

### Background
The authenticated e2e suite (Arch A2) became a **required CI check that ran against the
production Supabase project on every push and every PR** (~10 full runs on 2026-06-22
alone). Each run seeds/churns rows, logs in 8+ users, and crawls 230 routes — a
concentrated burst of write + auth + RLS load against a 25 MB DB on Nano's tiny
burst-credit I/O budget. Its activation **correlated in time** with the Unhealthy onset.

### Implementation (executed this round)
- **Paused the remote e2e in CI.** The `e2e` job's gate now runs the suite **only when
  the repository variable `RUN_E2E` is `true`** *and* the Supabase secrets exist.
  `RUN_E2E` is **unset by default**, so the job exits **green (skipped)** — the required
  status check still passes, but **no load is generated against prod**.
- The suite remains fully runnable **locally** (`npm run seed:e2e && npm run test:e2e`),
  which is how A2 was validated all along and how it's validated in this very document.
- **No branch-protection change** is required: a skipped-green required check passes.

```yaml
# .github/workflows/ci.yml  (e2e job gate)
if [ "${{ vars.RUN_E2E }}" = "true" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && … ; then
  run=true   # full suite
else
  run=false  # skip GREEN — no prod load
fi
```

### R1-Phase-2 (the permanent fix — planned, not executed)
Re-enable continuous e2e **without** touching prod by running it against an **ephemeral
local Supabase stack** inside the job (the `migrations` job already proves the Supabase
CLI works in CI):
1. `supabase start` (db + auth + rest + storage) → migrations auto-applied from `supabase/migrations`.
2. Capture local keys: `eval "$(supabase status -o env)"` → export `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` as `NEXT_PUBLIC_SUPABASE_URL` / `…_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
3. Extend `seed.mjs` to also create the **storage buckets** (the schema-only baseline doesn't include bucket rows) so upload flows (Knowledge Hub) pass on a fresh DB.
4. `npm run build` → `npm run seed:e2e` → `npx playwright test --project=authed`.
5. Set repo variable `RUN_E2E=true`. Prod dependency is then gone permanently.
> Deferred to its own change because it needs CI iteration (storage buckets, fresh-DB
> empty-state behavior) that shouldn't be rushed during a stabilization push.

### Risk assessment
| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Gate provides no PR protection while paused | Certain (by design) | Low–Med | A2 is **complete & accepted** (one-time validation done); suite still runs locally + lives in git; re-enabled via R1-Phase-2 |
| Someone sets `RUN_E2E=true` and re-loads prod | Low | Med | Documented; prefer R1-Phase-2 (local stack) over flipping the var |

### Estimated Disk-I/O impact
**High and immediate.** Eliminates the **acute** spike — the largest *new* I/O source
and the one time-correlated with the Unhealthy onset. Removes all CI-driven seed churn,
login writes, and 230-route auth/RLS bursts against prod going forward.

### Rollback
Revert the one gate hunk in `ci.yml` (restore the secrets-only condition), or simply set
repo variable `RUN_E2E=true`. Zero data/schema impact.

---

# R2 — Resolve `auth_rls_initplan` (166 policies)

### Background
166 public RLS policies called `auth.uid()` (144) / `auth.email()` (22) **bare**, so
Postgres re-evaluated the auth function **for every row scanned**. Wrapping the call as a
scalar sub-select makes the planner evaluate it **once per query** (an InitPlan).

### Implementation (executed + validated this round)
- Migration **`supabase/migrations/20260709000000_rls_initplan_fix.sql`** — a `DO` block
  that loops the affected policies and `ALTER POLICY … USING(…) WITH CHECK(…)` with the
  rewritten expression. **`ALTER POLICY` preserves** the policy name, command, roles, and
  permissive/restrictive flag — **only the expression changes**.
- The rewrite is **value-equivalent**: `auth.uid()` → `(select auth.uid())` returns the
  same value; only evaluation timing changes. **No access-control semantics change.**
- **Idempotent** (normalize-unwrap → wrap), so it's safe to replay from the baseline in CI.
- **Applied to the remote DB** via `execute_sql` (the project's established apply path).
- **Verified:** 144 `auth.uid()` + 22 `auth.email()` wrapped; **0 bare remaining**
  (e.g. `alumni: self update` → `(profile_id = ( SELECT auth.uid() AS uid))`).
- **Validated** by the Arch A2 authenticated suite against the modified DB:
  **institution isolation (cross-tenant reads → 0), 27 cross-role denials, 11
  write-authorization denials, IDOR blocked, own-tenant reads still work** — access
  control unchanged. (One transient `signIn` connection blip on the unhealthy instance
  passed on retry.)

### Surface confirmed before applying
`auth.uid()`: 144 · `auth.email()`: 22 · `auth.role()/auth.jwt()/current_setting()`: **0**
· already-wrapped: **0** · total public policies: 321.

### Risk assessment
| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Rewrite changes access semantics | Very low | **High** (security) | Value-equivalent transform (Supabase's documented fix); **validated by the full A2 RLS suite** post-apply |
| Malformed regenerated expression | Very low | Med | `ALTER POLICY` is atomic in a `DO` block — any error rolls the whole block back; dry-run inspected first |
| Replay/idempotency issue in CI | Low | Low | normalize-then-wrap makes repeated runs stable; replays cleanly after baseline |

### Estimated Disk-I/O impact
**Primarily CPU/latency, modest *direct* Disk-I/O.** On a 25 MB DB with a 99.67% cache
hit ratio, the per-row buffer reads this saved were mostly served from RAM. The win is
**lower CPU per protected query** across essentially the whole app, which **frees headroom**
on a saturated Nano instance (an overloaded CPU backs up I/O and trips health checks). It
also slightly reduces WAL/work for write paths whose RLS `WITH CHECK` ran per row. Net:
meaningful sustained **load** reduction; the bigger *direct* disk-I/O wins are R1 and R5.

### Rollback
Re-run the migration's `DO` block with the wrap/unwrap replacements inverted
(`(select auth.uid())` → `auth.uid()`), or restore the affected policies from the
pre-change baseline. The change is behaviour-preserving, so rollback is only needed if a
downstream tool mis-parses the wrapped form. No data impact.

---

# R5 — Realtime dependency: evaluation & proposal

### Evaluation (code + DB)
- **Publication scope:** only **`notifications`** is in the `supabase_realtime`
  publication. **2 active logical-replication slots** continuously process the WAL; the
  Realtime WAL-decode query is the **single largest time consumer** observed
  (205 calls / 2,923 ms).
- **Call-sites in the app:** 6 `postgres_changes` subscriptions —
  `useNotifications` (table `notifications`), plus `InstitutionContext`, `app/page.tsx`,
  `session/[id]`, `department/[dept_id]`, `UsersManagement`, `PlatformDashboard`
  (tables `institutions` / attendance / users / sessions).
- **Key finding:** only **`useNotifications` is functional** — the other subscriptions
  target tables that are **not in the publication**, so they receive **no events today**
  (they already silently rely on their initial fetch). Disabling Realtime changes nothing
  for them.

### Proposal — **Yes, Realtime can be disabled for v1.0** (recommended)
The only real dependency is the notification **bell**, and an ERP bell tolerates a few
seconds of latency. Replace the live subscription with a lightweight fallback, then turn
Realtime off to remove a **constant background I/O/CPU floor**.

**Implementation (when approved — not done in this round):**
1. **Code:** in `src/hooks/useNotifications.ts`, replace the `postgres_changes`
   subscription with a **poll** (e.g. refetch every 30–60 s and on window focus /
   route change). Leave the other 5 (already-inert) subscriptions to be removed as cleanup.
2. **DB/Project:** remove the table from the publication —
   `ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;` — and/or
   **disable the Realtime service** in the Supabase dashboard (owner action) to drop the
   replication slots entirely.

### Risk assessment
| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Notification bell loses "instant" updates | Certain | Low | 30–60 s poll + refresh-on-focus is ample for an ERP; UX delta negligible |
| Other features rely on Realtime | None found | — | The other 5 subscriptions are already no-ops (tables unpublished) |
| Re-enabling later | n/a | Low | Re-add to publication + restore subscription; fully reversible |

### Estimated Disk-I/O impact
**High (direct).** Removes the **continuous** WAL-decode read load (the top time
consumer) and frees the 2 replication slots — a permanent reduction in steady-state
background I/O, independent of traffic.

### Recommendation
Approve R5 for v1.0. Sequence it **after** confirming R1+R2 returned the instance to
Healthy, so its effect is measurable in isolation. It is the highest-value remaining
*direct* Disk-I/O lever that doesn't require a tier upgrade.

---

## Expected outcome of this round (R1 + R2)

- **R1** removes the acute, CI-driven prod load (the spike's trigger) — effective immediately on merge.
- **R2** lowers sustained CPU per protected query across the app, freeing Nano headroom.
- Combined, the instance should **return to Healthy**; **R5** (when approved) then removes
  the largest remaining background I/O floor.
- **R3** (drop 341 unused indexes) and a **tier upgrade** remain deferred per direction —
  tracked for a later round once R1/R2/R5 effects are measured.

## Verification checklist
- [x] R2 applied to remote; `0` bare `auth.uid()/email()` policies remain (166 wrapped).
- [x] R2 access control intact — A2 isolation + cross-role + action-auth green post-apply.
- [x] R1 CI gate paused against remote (default skip-green); `ci.yml` parses, steps keyed to gate.
- [ ] **(owner)** Observe Supabase dashboard return to **Healthy** over the next monitoring window.
- [ ] **(follow-up)** Approve R5 → add the bell poll + disable Realtime.
- [ ] **(follow-up)** R1-Phase-2 → local-Supabase CI job → set `RUN_E2E=true`.

---

*Cross-reference: [DISK_IO_ANALYSIS.md](DISK_IO_ANALYSIS.md) (the diagnosis) ·
[AURA_V1_EXECUTION_TRACKER.md](../AURA_V1_EXECUTION_TRACKER.md) ·
[../../ci-cd.md](../../ci-cd.md).*
