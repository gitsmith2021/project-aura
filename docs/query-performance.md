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
