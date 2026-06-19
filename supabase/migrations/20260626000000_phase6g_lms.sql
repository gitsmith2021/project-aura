-- Phase 6G — E-Learning & Study Materials (lightweight LMS)
-- Study materials (organised by curriculum unit) + assignments + submissions +
-- gradebook. Access model: admins manage everything; the teaching staff of a
-- subject (via teaching_assignments) manage that subject's materials/assignments
-- and grade its submissions; students of the subject's department read published
-- materials/assignments and submit/read their own work.

create table if not exists public.study_materials (
  id                 uuid primary key default gen_random_uuid(),
  institution_id     uuid not null references public.institutions(id) on delete cascade,
  subject_id         uuid not null references public.subjects(id) on delete cascade,
  curriculum_unit_id uuid references public.curriculum_units(id) on delete set null,
  title              text not null,
  material_type      text not null check (material_type in (
                       'notes','slides','video_link','scorm_package','question_paper','reference')),
  file_url           text,
  external_url       text,
  uploaded_by        uuid references public.staff(id) on delete set null,
  is_published       boolean not null default true,
  created_at         timestamptz not null default now()
);
create index if not exists idx_smat_inst on public.study_materials(institution_id);
create index if not exists idx_smat_subject on public.study_materials(subject_id);
create index if not exists idx_smat_unit on public.study_materials(curriculum_unit_id);

create table if not exists public.lms_assignments (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  subject_id       uuid not null references public.subjects(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  title            text not null,
  description      text,
  due_date         timestamptz not null,
  max_marks        integer not null default 10 check (max_marks > 0),
  allow_late       boolean not null default false,
  created_by       uuid references public.staff(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_lasn_inst on public.lms_assignments(institution_id);
create index if not exists idx_lasn_subject on public.lms_assignments(subject_id);

create table if not exists public.lms_submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.lms_assignments(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  file_url        text,
  notes           text,
  submitted_at    timestamptz not null default now(),
  is_late         boolean not null default false,
  marks_awarded   numeric(5,2),
  feedback        text,
  graded_by       uuid references public.staff(id) on delete set null,
  graded_at       timestamptz,
  unique (assignment_id, student_id)
);
create index if not exists idx_lsub_assignment on public.lms_submissions(assignment_id);
create index if not exists idx_lsub_student on public.lms_submissions(student_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.study_materials enable row level security;
alter table public.lms_assignments enable row level security;
alter table public.lms_submissions enable row level security;

-- helper predicates inlined per table.

-- study_materials: admins + teaching staff manage; dept students read published.
drop policy if exists "smat: admins manage" on public.study_materials;
create policy "smat: admins manage" on public.study_materials for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "smat: teaching staff manage" on public.study_materials;
create policy "smat: teaching staff manage" on public.study_materials for all to authenticated
  using (
    exists (select 1 from public.teaching_assignments ta join public.staff st on st.id = ta.staff_id
            where ta.subject_id = study_materials.subject_id and st.email = auth.email())
  )
  with check (
    exists (select 1 from public.teaching_assignments ta join public.staff st on st.id = ta.staff_id
            where ta.subject_id = study_materials.subject_id and st.email = auth.email())
  );

drop policy if exists "smat: dept students read" on public.study_materials;
create policy "smat: dept students read" on public.study_materials for select to authenticated
  using (
    is_published
    and exists (select 1 from public.students s join public.subjects sub on sub.id = study_materials.subject_id
                where s.email = auth.email() and s.department_id = sub.department_id)
  );

-- lms_assignments: admins + teaching staff manage; dept students read.
drop policy if exists "lasn: admins manage" on public.lms_assignments;
create policy "lasn: admins manage" on public.lms_assignments for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "lasn: teaching staff manage" on public.lms_assignments;
create policy "lasn: teaching staff manage" on public.lms_assignments for all to authenticated
  using (
    exists (select 1 from public.teaching_assignments ta join public.staff st on st.id = ta.staff_id
            where ta.subject_id = lms_assignments.subject_id and st.email = auth.email())
  )
  with check (
    exists (select 1 from public.teaching_assignments ta join public.staff st on st.id = ta.staff_id
            where ta.subject_id = lms_assignments.subject_id and st.email = auth.email())
  );

drop policy if exists "lasn: dept students read" on public.lms_assignments;
create policy "lasn: dept students read" on public.lms_assignments for select to authenticated
  using (
    exists (select 1 from public.students s join public.subjects sub on sub.id = lms_assignments.subject_id
            where s.email = auth.email() and s.department_id = sub.department_id)
  );

-- lms_submissions: student manages own; admins + teaching staff read/grade.
drop policy if exists "lsub: student own" on public.lms_submissions;
create policy "lsub: student own" on public.lms_submissions for all to authenticated
  using (student_id in (select id from public.students where email = auth.email()))
  with check (student_id in (select id from public.students where email = auth.email()));

drop policy if exists "lsub: admins manage" on public.lms_submissions;
create policy "lsub: admins manage" on public.lms_submissions for all to authenticated
  using (
    exists (select 1 from public.lms_assignments a where a.id = assignment_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')))
  )
  with check (
    exists (select 1 from public.lms_assignments a where a.id = assignment_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = a.institution_id and g.role = 'INST_ADMIN')))
  );

drop policy if exists "lsub: teaching staff grade" on public.lms_submissions;
create policy "lsub: teaching staff grade" on public.lms_submissions for all to authenticated
  using (
    exists (select 1 from public.lms_assignments a
            join public.teaching_assignments ta on ta.subject_id = a.subject_id
            join public.staff st on st.id = ta.staff_id
            where a.id = lms_submissions.assignment_id and st.email = auth.email())
  )
  with check (
    exists (select 1 from public.lms_assignments a
            join public.teaching_assignments ta on ta.subject_id = a.subject_id
            join public.staff st on st.id = ta.staff_id
            where a.id = lms_submissions.assignment_id and st.email = auth.email())
  );

grant select, insert, update, delete on public.study_materials to authenticated;
grant select, insert, update, delete on public.lms_assignments to authenticated;
grant select, insert, update, delete on public.lms_submissions to authenticated;

-- ── Storage buckets (public, matching the existing receipts/research-docs convention) ──
insert into storage.buckets (id, name, public) values ('study-materials', 'study-materials', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('lms-submissions', 'lms-submissions', true) on conflict (id) do nothing;

drop policy if exists "study-materials: authenticated upload" on storage.objects;
create policy "study-materials: authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'study-materials');
drop policy if exists "study-materials: public read" on storage.objects;
create policy "study-materials: public read" on storage.objects for select using (bucket_id = 'study-materials');

drop policy if exists "lms-submissions: authenticated upload" on storage.objects;
create policy "lms-submissions: authenticated upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'lms-submissions');
drop policy if exists "lms-submissions: public read" on storage.objects;
create policy "lms-submissions: public read" on storage.objects for select using (bucket_id = 'lms-submissions');
