-- ════════════════════════════════════════════════════════════════════════════
-- CAMPUS FIX — restore the exam_results table (rebaseline gap, like clubs)
--
-- src/actions/examResults.ts (Phase 2C Marks & Arrears) reads/writes
-- public.exam_results, but the table's DDL was lost in the migration rebaseline
-- and it no longer exists in prod — the marksheet / results / arrears feature is
-- therefore broken. Reconstructed from examResults.ts (columns, upsert key) and
-- src/utils/grading.ts (grade scale). `grade` and `is_arrear` are GENERATED —
-- bulkEnterResults inserts neither, so they were always auto-computed.
--
-- RLS mirrors the cia_marks pattern (institution-scoped admin/HOD/staff manage;
-- any member reads institution rows; a student reads their own).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.exam_results (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  exam_schedule_id uuid,
  subject_id       uuid,
  subject_name     text not null,
  marks_scored     numeric(6,2) not null,
  max_marks        numeric(6,2) not null,
  pass_marks       numeric(6,2) not null,
  academic_year_id uuid references public.academic_years(id),
  semester         integer not null,
  entered_by       uuid,
  created_at       timestamptz not null default now(),
  -- Computed (examResults.ts never sets these): grade from %, arrear from pass mark.
  grade text generated always as (
    case
      when max_marks <= 0 then 'F'
      when (marks_scored / max_marks) * 100 >= 90 then 'O'
      when (marks_scored / max_marks) * 100 >= 80 then 'A+'
      when (marks_scored / max_marks) * 100 >= 70 then 'A'
      when (marks_scored / max_marks) * 100 >= 60 then 'B+'
      when (marks_scored / max_marks) * 100 >= 50 then 'B'
      when (marks_scored / max_marks) * 100 >= 45 then 'C'
      else 'F'
    end
  ) stored,
  is_arrear boolean generated always as (marks_scored < pass_marks) stored
);

-- Upsert target for bulkEnterResults (onConflict student_id,subject_name,semester,exam_schedule_id).
create unique index if not exists exam_results_upsert_uniq
  on public.exam_results (student_id, subject_name, semester, exam_schedule_id) nulls not distinct;
create index if not exists ix_exam_results_inst on public.exam_results (institution_id, semester);
create index if not exists ix_exam_results_student on public.exam_results (student_id);
create index if not exists ix_exam_results_arrear on public.exam_results (institution_id) where is_arrear;

alter table public.exam_results enable row level security;

-- Admins / HODs / staff of the institution manage marks (mirrors cia_marks).
drop policy if exists "exam_results: manage own institution" on public.exam_results;
create policy "exam_results: manage own institution" on public.exam_results
  for all to authenticated
  using (exists (select 1 from private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    where g.role = 'SUPER_ADMIN'::public.user_role
       or ((g.role = any (array['INST_ADMIN','DEPARTMENT_HEAD','HOD','STAFF']::public.user_role[])) and g.tenant_id = exam_results.institution_id)))
  with check (exists (select 1 from private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    where g.role = 'SUPER_ADMIN'::public.user_role
       or ((g.role = any (array['INST_ADMIN','DEPARTMENT_HEAD','HOD','STAFF']::public.user_role[])) and g.tenant_id = exam_results.institution_id)));

-- Any member of the institution may read its results.
drop policy if exists "exam_results: select own institution" on public.exam_results;
create policy "exam_results: select own institution" on public.exam_results
  for select to authenticated
  using (exists (select 1 from private.get_user_authorizations() g(role, tenant_id, department_id, shift_id)
    where g.role = 'SUPER_ADMIN'::public.user_role or g.tenant_id = exam_results.institution_id));

-- A student reads their own results (students.id = auth.uid()).
drop policy if exists "exam_results: student reads own" on public.exam_results;
create policy "exam_results: student reads own" on public.exam_results
  for select to authenticated
  using (student_id = (select auth.uid()));

grant select, insert, update, delete on public.exam_results to authenticated;
