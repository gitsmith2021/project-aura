-- Phase 6E — Student Feedback & Faculty Ratings
--
-- ANONYMITY MODEL: a response stores NO student_id. Double-submission is
-- prevented by a SEPARATE participation ledger (feedback_submissions) that
-- records (form_id, student_id) but holds none of the answers. The two tables
-- are deliberately unjoinable, so neither admins nor faculty can trace a
-- response back to a student.

create table if not exists public.feedback_forms (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  department_id   uuid references public.departments(id) on delete set null, -- null = institution-wide
  staff_id        uuid references public.staff(id) on delete set null,        -- faculty being evaluated (optional)
  title           text not null,
  description     text,
  subject_name    text,
  questions       jsonb not null default '[]'::jsonb,  -- [{ id, text, type: 'rating'|'text' }]
  is_active       boolean not null default false,
  opens_at        timestamptz,
  closes_at       timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_fform_inst on public.feedback_forms(institution_id);
create index if not exists idx_fform_staff on public.feedback_forms(staff_id);

-- Anonymous response — NO student_id by design.
create table if not exists public.feedback_responses (
  id              uuid primary key default gen_random_uuid(),
  form_id         uuid not null references public.feedback_forms(id) on delete cascade,
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  answers         jsonb not null default '{}'::jsonb,   -- { questionId: number | string }
  overall_rating  numeric,
  created_at      timestamptz not null default now()
);
create index if not exists idx_fresp_form on public.feedback_responses(form_id);

-- Participation ledger — who submitted, holds no answers (anonymity-preserving).
create table if not exists public.feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.feedback_forms(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (form_id, student_id)
);
create index if not exists idx_fsub_form on public.feedback_submissions(form_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.feedback_forms enable row level security;
alter table public.feedback_responses enable row level security;
alter table public.feedback_submissions enable row level security;

-- forms: admins manage; eligible students read active ones; rated staff read theirs.
drop policy if exists "fform: admins manage" on public.feedback_forms;
create policy "fform: admins manage" on public.feedback_forms for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "fform: eligible student reads" on public.feedback_forms;
create policy "fform: eligible student reads" on public.feedback_forms for select to authenticated
  using (
    is_active
    and exists (
      select 1 from public.students s
      where s.email = auth.email()
        and s.institution_id = feedback_forms.institution_id
        and (feedback_forms.department_id is null or s.department_id = feedback_forms.department_id)
    )
  );

drop policy if exists "fform: rated staff reads" on public.feedback_forms;
create policy "fform: rated staff reads" on public.feedback_forms for select to authenticated
  using (exists (select 1 from public.staff st where st.id = staff_id and st.email = auth.email()));

-- responses: admins + the rated staff read aggregates; students insert (anonymous), never read.
drop policy if exists "fresp: admins read" on public.feedback_responses;
create policy "fresp: admins read" on public.feedback_responses for select to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "fresp: rated staff read" on public.feedback_responses;
create policy "fresp: rated staff read" on public.feedback_responses for select to authenticated
  using (
    exists (
      select 1 from public.feedback_forms f
      join public.staff st on st.id = f.staff_id
      where f.id = form_id and st.email = auth.email()
    )
  );

drop policy if exists "fresp: eligible student submits" on public.feedback_responses;
create policy "fresp: eligible student submits" on public.feedback_responses for insert to authenticated
  with check (
    exists (
      select 1 from public.feedback_forms f
      join public.students s on s.email = auth.email()
      where f.id = form_id
        and f.institution_id = feedback_responses.institution_id
        and f.is_active
        and s.institution_id = f.institution_id
        and (f.department_id is null or s.department_id = f.department_id)
    )
  );

-- submissions (ledger): student manages own; admins read for response-rate stats.
drop policy if exists "fsub: student own" on public.feedback_submissions;
create policy "fsub: student own" on public.feedback_submissions for all to authenticated
  using (student_id in (select id from public.students where email = auth.email()))
  with check (student_id in (select id from public.students where email = auth.email()));

drop policy if exists "fsub: admins read" on public.feedback_submissions;
create policy "fsub: admins read" on public.feedback_submissions for select to authenticated
  using (
    exists (
      select 1 from public.feedback_forms f where f.id = form_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = f.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

grant select, insert, update, delete on public.feedback_forms to authenticated;
grant select, insert, update, delete on public.feedback_responses to authenticated;
grant select, insert, update, delete on public.feedback_submissions to authenticated;
