# Query Performance Notes

> Phase 7D / ISO 27001 evidence. Records the performance posture of the hottest
> read paths and the indexing strategy.

## Strategy

- Every tenant-scoped table carries an index on `institution_id` (and a composite
  with the common filter column, e.g. `(institution_id, status)`,
  `(institution_id, expiry_date)`), so the RLS `institution_id` predicate and the
  typical list query are index-served.
- Foreign keys used in joins (`subject_id`, `student_id`, `staff_id`,
  `assignment_id`, `mou_partner_id`, etc.) are individually indexed — see each
  phase migration's `create index` block.
- Cross-institution super-admin aggregates select **narrow columns** and aggregate
  in TypeScript at current scale (thousands of rows). This is cheaper and simpler
  than shipping Postgres RPCs; revisit via Architecture register **A3** (reporting
  RPCs / materialized views) when row counts grow. The platform health dashboard's
  per-table row counts come from `public.platform_table_stats()` reading
  `pg_class.reltuples` (catalog estimate — O(1), no table scan).

## Hot paths (representative)

| Path | Query shape | Served by |
|---|---|---|
| Student portal lists | `where institution_id/department_id/student_id = …` | `idx_*_inst`, FK indexes |
| Attendance head-counts | `attendance → class_schedules → departments` join, date-bounded | FK indexes + `created_at` order |
| Fee collection rollups | `fee_payments where payment_status='completed'` grouped by month | `(institution_id, …)` + status filter |
| Gradebook | `lms_submissions where assignment_id in (…)` | `idx_lsub_assignment` |
| MOU expiry alerts | `mou_partners order by expiry_date` | `idx_mou_expiry (institution_id, expiry_date)` |

## Re-running EXPLAIN ANALYZE

Use the Supabase SQL editor (or MCP `execute_sql`) on a representative dataset:

```sql
explain analyze
select payment_status, sum(amount_paid)
from public.fee_payments
where institution_id = '<uuid>' and payment_status = 'completed'
group by payment_status;
```

Record regressions here when a hot path exceeds ~50ms on production-scale data, and
promote the relevant aggregate to an RPC/materialized view under Architecture item A3.

---

## Arch A3 — Index Strategy (2026-06-20)

### Foreign-key indexes (done — migration `20260702000000`)

Postgres auto-indexes PK/UNIQUE columns but **not** foreign keys. The Supabase
performance advisor flagged **136** FK columns in `public` with no covering index —
hurting joins, cascade deletes (a parent delete seq-scans children), and lock contention.

A single idempotent migration adds an `ix_<table>_<fk_cols>` btree for every FK whose
columns aren't already the **leftmost prefix** of an existing index. It's **re-runnable**:
re-run it whenever the advisor reports new unindexed FKs (e.g. after adding tables).

```sql
-- count remaining unindexed FKs (expect 0)
with fk as (select con.conrelid, con.conkey from pg_constraint con
  join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
  where con.contype='f' and n.nspname='public')
select count(*) from fk where not exists (select 1 from pg_index i
  where i.indrelid=fk.conrelid
    and (string_to_array(i.indkey::text,' ')::int2[])[1:array_length(fk.conkey,1)]=fk.conkey);
```

### Known performance backlog (NOT indexing — deferred)

The advisor also reports two RLS-shaped items that are **out of A3's index scope** and are
tracked as a separate performance pass:

- **`auth_rls_initplan` (~152 policies):** policies call `auth.uid()` / `auth.email()` per
  row instead of once. Fix is mechanical — wrap as `(select auth.uid())` so the planner
  caches it — but it touches every policy and needs careful semantic-preserving review;
  high value only on large sequential scans.
- **`multiple_permissive_policies` (~264):** several tables have multiple permissive
  policies for the same role+action (e.g. `admins manage` + `staff read own`). Each is
  OR-evaluated. Consolidating trades readability/correctness for marginal speed; deferred
  until profiling shows it matters.
- **`unused_index` (~160):** expected on a low-traffic environment (queries haven't
  exercised them yet, plus the new FK indexes). Re-evaluate against production
  `pg_stat_user_indexes` before dropping anything.
