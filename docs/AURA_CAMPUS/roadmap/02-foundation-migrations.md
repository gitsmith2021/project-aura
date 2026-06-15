[← Back to Roadmap Index](../AURA_ROADMAP.md)

> **Depends on:** [01 — Phase 1 Portals](01-phase1-portals.md) (uses existing `staff` and `students` tables).
> **Feeds into:** [03 — Phase 2 Academic Operations](03-phase2-academic-operations.md) (every Phase 2 module depends on `subjects`, `teaching_assignments`, and the `academic_years` FK introduced here), [04 — Phase 2.5 Critical Fixes](04-phase2.5-critical-fixes.md) (fee concessions extend the core Finance module).

---

## 🧱 Foundation Migrations (Prerequisites for Phase 2+)

> **Critical — build these before starting Step 2A.**
> These four steps resolve structural gaps — missing master tables, un-migrated FK columns,
> and the absent HOD role — that every Phase 2+ module depends on.
> Skipping them will create unresolvable FK inconsistencies across Academic, CIA,
> Curriculum, Appraisal, and Finance modules.

### Step 2-Pre-A — Subjects Master Table & Teaching Assignments ✅

> Every Phase 2+ module references `subjects(id)` as a FK — CIA marks, curriculum units,
> lesson plans, guest lectures, study materials — yet no such table exists. The timetable
> currently stores subject names as free text. This step formalises subjects as a first-class
> entity and establishes which staff member teaches which subject each semester.

#### Database:
```sql
CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  code            TEXT,                    -- e.g. "CS301", "PH201"
  subject_type    TEXT NOT NULL DEFAULT 'theory'
                  CHECK (subject_type IN ('theory','lab','elective','project')),
  semester        INTEGER NOT NULL,
  credits         INTEGER NOT NULL DEFAULT 3,
  hours_per_week  INTEGER NOT NULL DEFAULT 5,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(institution_id, department_id, code, semester)
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects: institution members can manage"
  ON public.subjects
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));

-- Who teaches which subject this academic year
CREATE TABLE teaching_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  subject_id       UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  semester         INTEGER NOT NULL,
  is_primary       BOOLEAN NOT NULL DEFAULT TRUE,   -- primary vs co-teacher
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(staff_id, subject_id, academic_year_id)
);
ALTER TABLE teaching_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teaching_assignments: institution members can manage"
  ON public.teaching_assignments
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### What to build:
- [x] `supabase/migrations/..._subjects.sql` — subjects + teaching_assignments + RLS policies
- [x] `src/app/institutions/[id]/subjects/page.tsx` — Subject registry per department and semester (add/edit/deactivate)
- [x] `src/actions/subjects.ts` — getSubjects, addSubject, updateSubject, assignTeacher, getTeachingAssignments, getMySubjects (for staff portal)
- [x] `src/components/subjects/SubjectForm.tsx` — Add/edit form: name, code, type, credits, hours/week, semester
- [x] `src/components/subjects/TeachingAssignmentDrawer.tsx` — Assign staff to subject for a given semester
- [ ] Backfill migration: parse existing subject name text from `class_schedules` (timetable) and seed the subjects table
- [x] Update `class_schedules`: `subject_id UUID REFERENCES subjects(id)` column already present; `subject_name TEXT` kept as fallback

#### Why this unblocks:
- CIA marks entry (2E): `subject_id` authorises the correct staff to enter marks — without it, any staff can enter marks for any subject
- Lesson plan diary (2G): auto-pre-fills subject from the teacher's active assignment
- Appraisal workload report (5E): counts hours taught per subject per staff member
- Study materials (6G): Supabase Storage RLS gates files to students enrolled in the relevant department

---

### Step 2-Pre-B — `academic_years` FK Migration for Existing Tables ✅

> Step 2A creates the `academic_years` master table. Once it exists and at least one year is
> seeded, run this migration to convert all existing `academic_year TEXT` columns platform-wide
> to typed FK references. Without this, Phase 2 modules will have two incompatible ways to
> reference the same academic year, breaking join queries and reports.

#### Tables to audit for `academic_year TEXT` columns before running:
- `fee_payments`
- `salary_disbursements`
- `fee_structures`
- `class_schedules`
- `attendance_sessions`

#### Migration pattern (repeat for each affected table):
```sql
-- Step 1: Add FK column alongside the old text column
ALTER TABLE fee_payments
  ADD COLUMN academic_year_id UUID REFERENCES academic_years(id);

-- Step 2: Backfill FK from matching label in academic_years
UPDATE fee_payments fp
  SET academic_year_id = ay.id
  FROM academic_years ay
  WHERE ay.label = fp.academic_year
    AND ay.institution_id = fp.institution_id;

-- Step 3: Drop old text column only after verifying all rows have been backfilled
ALTER TABLE fee_payments DROP COLUMN academic_year;
```

#### What to build:
- [x] `supabase/migrations/..._academic_year_fk_migration.sql` — Migrated `fee_structures`, `budgets`, `draft_schedules`; views recreated; `class_schedules.tenant_id` renamed to `institution_id`
- [x] Update all Server Actions that accept `academic_year: string` to query by `academic_year_id` (UUID) instead
- [x] Update all UI selectors that show a free-text year input to a dropdown bound to the `academic_years` table

---

### Step 2-Pre-C — HOD Role & Department Head Designation ✅

> Multiple workflows name the HOD explicitly — leave approvals, appraisals, disciplinary
> actions, year promotion sign-off — but the auth system only has `ADMIN`, `STAFF`, `STUDENT`.
> This step adds HOD as a first-class role so those workflows can be properly gated.

#### Database:
```sql
-- Designate a staff member as HOD per department
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS hod_id UUID REFERENCES staff(id);

-- Extend role enum to include HOD
ALTER TABLE public.institution_members
  DROP CONSTRAINT IF EXISTS institution_members_role_check;
ALTER TABLE public.institution_members
  ADD CONSTRAINT institution_members_role_check
  CHECK (role IN ('ADMIN', 'HOD', 'STAFF', 'STUDENT'));
```

#### What to build:
- [x] `supabase/migrations/..._hod_role.sql` — Add `hod_id` to departments; extend `institution_members.role` CHECK to include `'HOD'`
- [x] `src/app/institutions/[id]/departments/page.tsx` — "Set as HOD" / "Remove HOD" buttons in StaffDirectory; updates both `departments.hod_id` and `institution_members.role`
- [x] `src/actions/departments.ts` — `setHOD(departmentId, staffId)`, `removeHOD(departmentId)`
- [x] Middleware: HOD role routes to the admin panel (`/`) with department-scoped data, NOT to `/staff-portal` — update route guards
- [x] Sidebar: HOD sees a limited admin panel (HOD Panel label, dept-scoped nav)
- [ ] Leave approval (staffPortal.ts): forward unapproved leave requests to the HOD — deferred to Phase 5
- [ ] Appraisal review (Step 5E): HOD reviews and scores appraisals for their department's staff
- [ ] Disciplinary actions (Step 5H): HOD sign-off required before incident status is `resolved`
- [ ] Year promotion (Step 2D): HOD confirms department eligibility list before admin commits the promotion run

---

### Step 2-Pre-D — Fee Concession & Waiver Management ✅

**Route:** `/institutions/[id]/finance/concessions`

> Separate from formal scholarship schemes (Step 5G). This covers admin-discretion waivers —
> staff ward discounts, management quota reductions, hardship waivers. Without this, finance
> reports are inaccurate: gross fees vs net receivables will not reconcile.

#### Database:
```sql
CREATE TABLE fee_concessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id   UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  concession_type  TEXT NOT NULL CHECK (concession_type IN (
                     'staff_ward','management_quota','merit',
                     'hardship','sports_quota','other')),
  amount           NUMERIC(10,2),          -- Fixed INR amount discount
  percentage       NUMERIC(5,2),           -- OR percentage discount (use one, not both)
  applicable_to    TEXT,                   -- NULL = all fees; or specific fee_structure type
  reason           TEXT NOT NULL,
  approved_by      UUID REFERENCES auth.users(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE fee_concessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_concessions: institution members can manage"
  ON public.fee_concessions
  USING (institution_id IN (
    SELECT institution_id FROM institution_members WHERE profile_id = auth.uid()
  ));
```

#### What to build:
- [x] `supabase/migrations/..._fee_concessions.sql`
- [x] `src/app/institutions/[id]/finance/concessions/page.tsx` — Grant and manage concessions per student; filter by type and status
- [x] `src/actions/concessions.ts` — grantConcession, approveConcession, rejectConcession, getConcessionsByStudent
- [x] `src/components/finance/ConcessionDrawer.tsx` — Apply concession: student search, type, fixed amount or %, reason
- [ ] Fee ledger integration: approved concession auto-reduces student's outstanding balance
- [ ] Student portal: concession appears as a credit entry in fee payment history
- [ ] Finance reports: add "Total Concessions Granted" column

#### Key features:
- Amount-based or percentage-based concession (mutually exclusive — validate at form level)
- Scoped to all fees or a specific fee structure type
- Approval workflow: admin submits → HOD or senior admin approves
- Revenue reconciliation: concessions appear as a deduction line in the Finance Reports page

### Foundation Migrations Checklist
- [x] `subjects` table live with at least one subject per active department
- [x] `teaching_assignments` table live; at least one staff assigned per subject
- [x] `academic_years` table live with at least one year marked `is_current = true`
- [x] `academic_years` FK migration complete for all affected tables (fee_structures, budgets, draft_schedules migrated; fee_payments, salary_disbursements, class_schedules never had the column)
- [x] HOD role added to `institution_members` CHECK constraint
- [ ] At least one HOD designated per department (user data — requires admin action)
- [x] `fee_concessions` table live with RLS enabled
- [x] `npm run build` passes with zero TypeScript errors
- [x] `git commit -m "feat: Foundation Migrations — subjects, academic_years FK, HOD role, fee concessions"`
- [ ] `git push origin main`

---

