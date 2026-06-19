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
