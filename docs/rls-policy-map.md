# RLS Policy Map

> Phase 7D / ISO 27001 evidence. Documents the row-level-security model for every
> category of table in the `public` schema. Generated as a reference, not by tooling —
> keep it in sync when adding tables. The live super-admin **Security** dashboard
> (`/admin/security`) reports the current RLS coverage % straight from `pg_catalog`.

## Authorization primitives

- **`private.get_user_authorizations()`** — `SECURITY DEFINER` function returning the
  caller's `(tenant_id, role)` grants. Used in `using`/`with check` clauses to avoid
  self-referential recursion on `institution_members`. Roles: `SUPER_ADMIN`,
  `INST_ADMIN`, `PRINCIPAL`, `HOD`, plus staff/student resolution by `auth.email()`.
- **`auth.uid()` / `auth.email()`** — used to resolve the caller to a `staff` or
  `students` row (both carry the login email) for portal-scoped policies.
- **Service role** — `createAdminClient()` bypasses RLS; permitted only in server-only
  files behind an explicit role gate (Dev Rule 16). Every such use carries a comment.

## Policy patterns by table category

| Category | Example tables | Read | Write |
|---|---|---|---|
| Tenant master | `institutions`, `departments`, `academic_years` | members of the institution | `SUPER_ADMIN` / `INST_ADMIN` |
| People | `staff`, `students`, `institution_members`, `profiles` | self + institution admins/HOD (dept-scoped) | admins; self for limited profile fields |
| Academics | `subjects`, `curriculum_units`, `cia_results`, `exam_schedules` | institution members; students see own dept/published | admins + teaching staff (`teaching_assignments`) |
| Finance | `fee_structures`, `fee_demands`, `fee_payments`, `expenses`, `salary_disbursements` | admins; student sees own demands/payments | admins; payer inserts own payment |
| Portals (6A–6H) | `parents`, `transport_allocations`, `certificate_requests`, `online_exam_*`, `feedback_*`, `lms_*`, `mou_partners` | owner (parent/student/staff) + admins | admins + role-scoped owners; see per-migration headers |
| Anonymous-by-design | `feedback_responses` (no `student_id`), anonymous `grievances` (`submitted_by` NULL) | admins / rated faculty (aggregate only) | eligible members insert; never re-identifiable |
| Answer-key protected | `online_exam_questions`, `online_exam_answers` | **admins only** (no student SELECT) | admins; student flow via service role that strips keys |
| Immutable logs | `audit_logs` | institution admins (own institution) | INSERT only — **no UPDATE/DELETE policy** (Dev Rule 17) |

## Intentional deny-all tables (RLS enabled, **no policies** — by design)

These are written exclusively through the service role and must never be readable by
any client role. The Supabase advisor flags them as "RLS Enabled No Policy" (INFO);
that is expected, not an oversight.

- `razorpay_webhook_events` — webhook ingestion (HMAC-verified server-side).
- `scheduler_error_logs` — Python scheduler error sink.

If a compliance requirement later mandates explicit policies, add `using (false)` /
`with check (false)` deny-all policies; until then they are intentionally policy-less.

## Storage buckets

Document-URL buckets (`receipts`, `admissions-documents`, `research-docs`,
`scholarship-docs`, `appraisal-docs`, `staff-career-docs`, `study-materials`,
`lms-submissions`, `mou-documents`) are **public** with an `authenticated upload` +
`public read` policy pair. They store unguessable-UUID document paths referenced from
RLS-protected rows; the public bucket is a deliberate convention (object access by URL,
not listing of sensitive PII). Advisor "Public Bucket Allows Listing" WARNs on these are
accepted. Sensitive identity documents are not placed in listable buckets.

## Maintenance

When adding a table: enable RLS, add policies matching the category above (or document a
new category here), confirm `get_advisors` shows no new "RLS Enabled No Policy" unless it
is an intentional deny-all table added to the list above.

---

## Arch A1 — Fine-grained RLS audit (2026-06-20)

A full sweep of every `public` policy. Result: **strong baseline** — every table has RLS
enabled, fine-grained `SUPER_ADMIN` / `INST_ADMIN` / `HOD` (dept-scoped) / staff-own /
student-own scoping is in place, and **one** cross-tenant leak was found and fixed.

### Findings
- **0** tables with RLS disabled.
- **2** zero-policy tables — both the intentional deny-all tables above.
- **1** intentional unconditional read — `subscription_plans` (`using (true)`): the SaaS
  plan price catalog, deliberately readable by any signed-in user; holds no tenant data.
- **1 leak (FIXED, `20260701000000`):** `staff_appraisal_activities: read` granted SELECT
  to every authenticated user — its `USING` only checked the parent appraisal *exists*, with
  no institution/owner predicate. Replaced with an owner-scoped read
  (`appraisal_activities: staff read own`); admins/INST_ADMIN/HOD keep SELECT via the
  existing `admins manage` ALL policy.
- **0** unconditional `INSERT` policies; **0** trivially-true auth checks
  (`auth.uid() is not null`, `auth.role() = 'authenticated'`).

### Detector queries (re-run when auditing)

```sql
-- (1) Tables with RLS off, or RLS-on-but-no-policy (only the deny-all tables should appear):
select c.relname, c.relrowsecurity,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policies
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and (not c.relrowsecurity
   or 0=(select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname));

-- (2) THE sharp one — any read/write policy that never references the current user
--     (every legit policy must reference auth.uid / auth.email / get_user_authorizations):
select tablename, policyname, cmd from pg_policies
where schemaname='public' and cmd in ('SELECT','UPDATE','DELETE','ALL')
  and qual is not null and btrim(qual) not in ('true','(true)')
  and qual !~* 'auth\.uid|auth\.email|get_user_authorizations';   -- expect 0 rows

-- (3) Unconditional inserts + trivially-true auth:
select tablename, policyname from pg_policies
where schemaname='public' and (
  (cmd='INSERT' and btrim(coalesce(with_check,'')) in ('true','(true)'))
  or qual ~* 'auth\.uid\(\)\s+is\s+not\s+null|auth\.role\(\)\s*=\s*''authenticated''');  -- expect 0
```

A clean run is **query (2) and (3) return 0 rows**, and query (1) returns only the
documented deny-all tables.
