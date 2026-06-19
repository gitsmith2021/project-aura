-- Phase 6D — Online Examination System
-- Timed, auto-graded MCQ/short-answer assessments with anti-cheating telemetry.
--
-- SECURITY: answer keys (online_exam_questions.correct_keys) must never reach a
-- student's browser. Students therefore have NO RLS read on the questions table;
-- the exam-player flow (fetch questions, submit, grade, log violations) runs in
-- server actions with the service-role client, stripping correct answers on the
-- way out. Admins manage everything; a student reads only their own session and
-- the published exams targeted to them.

create table if not exists public.online_exams (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  department_id    uuid references public.departments(id) on delete set null, -- null = institution-wide
  title            text not null,
  subject_name     text,
  description      text,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  total_marks      integer not null default 0,
  pass_marks       integer not null default 0,
  scheduled_start  timestamptz,
  scheduled_end    timestamptz,
  shuffle_questions boolean not null default true,
  status           text not null default 'draft' check (status in ('draft','published','closed')),
  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_oexam_inst on public.online_exams(institution_id);
create index if not exists idx_oexam_dept on public.online_exams(department_id);

create table if not exists public.online_exam_questions (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references public.online_exams(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'mcq' check (question_type in ('mcq','multi','short')),
  options       jsonb not null default '[]'::jsonb,   -- [{ key, text }] (empty for short)
  correct_keys  jsonb not null default '[]'::jsonb,   -- mcq/multi: ["a"]; short: ["accepted text", ...]
  marks         integer not null default 1 check (marks > 0),
  position      integer not null default 0
);
create index if not exists idx_oquestion_exam on public.online_exam_questions(exam_id);

create table if not exists public.online_exam_sessions (
  id              uuid primary key default gen_random_uuid(),
  exam_id         uuid not null references public.online_exams(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  session_token   uuid not null default gen_random_uuid(),
  status          text not null default 'in_progress' check (status in ('in_progress','submitted','auto_submitted')),
  score           numeric,
  total_marks     integer not null default 0,
  violation_count integer not null default 0,
  flagged         boolean not null default false,
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  unique (exam_id, student_id)
);
create index if not exists idx_osession_exam on public.online_exam_sessions(exam_id);
create index if not exists idx_osession_student on public.online_exam_sessions(student_id);

create table if not exists public.online_exam_answers (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.online_exam_sessions(id) on delete cascade,
  question_id   uuid not null references public.online_exam_questions(id) on delete cascade,
  response      jsonb not null default '[]'::jsonb,    -- selected keys or [text]
  is_correct    boolean not null default false,
  awarded_marks numeric not null default 0,
  unique (session_id, question_id)
);
create index if not exists idx_oanswer_session on public.online_exam_answers(session_id);

create table if not exists public.online_exam_violations (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.online_exam_sessions(id) on delete cascade,
  exam_id     uuid not null references public.online_exams(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  type        text not null check (type in ('tab_switch','fullscreen_exit','copy_paste')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_oviolation_session on public.online_exam_violations(session_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.online_exams enable row level security;
alter table public.online_exam_questions enable row level security;
alter table public.online_exam_sessions enable row level security;
alter table public.online_exam_answers enable row level security;
alter table public.online_exam_violations enable row level security;

-- online_exams: admins manage; students read published exams targeted to them.
drop policy if exists "oexam: admins manage" on public.online_exams;
create policy "oexam: admins manage" on public.online_exams for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "oexam: eligible student reads" on public.online_exams;
create policy "oexam: eligible student reads" on public.online_exams for select to authenticated
  using (
    status in ('published','closed')
    and exists (
      select 1 from public.students s
      where s.email = auth.email()
        and s.institution_id = online_exams.institution_id
        and (online_exams.department_id is null or s.department_id = online_exams.department_id)
    )
  );

-- online_exam_questions: admins only. (No student policy — answer keys never leave the server.)
drop policy if exists "oquestion: admins manage" on public.online_exam_questions;
create policy "oquestion: admins manage" on public.online_exam_questions for all to authenticated
  using (
    exists (
      select 1 from public.online_exams e where e.id = exam_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = e.institution_id and g.role = 'INST_ADMIN')
      )
    )
  )
  with check (
    exists (
      select 1 from public.online_exams e where e.id = exam_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = e.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

-- online_exam_sessions: admins manage their institution's; student reads own.
drop policy if exists "osession: admins manage" on public.online_exam_sessions;
create policy "osession: admins manage" on public.online_exam_sessions for all to authenticated
  using (
    exists (
      select 1 from public.online_exams e where e.id = exam_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = e.institution_id and g.role = 'INST_ADMIN')
      )
    )
  )
  with check (
    exists (
      select 1 from public.online_exams e where e.id = exam_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = e.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

drop policy if exists "osession: student reads own" on public.online_exam_sessions;
create policy "osession: student reads own" on public.online_exam_sessions for select to authenticated
  using (student_id in (select id from public.students where email = auth.email()));

-- online_exam_answers: admins only (student review served via server action).
drop policy if exists "oanswer: admins read" on public.online_exam_answers;
create policy "oanswer: admins read" on public.online_exam_answers for all to authenticated
  using (
    exists (
      select 1 from public.online_exam_sessions ses
      join public.online_exams e on e.id = ses.exam_id
      where ses.id = session_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = e.institution_id and g.role = 'INST_ADMIN')
      )
    )
  )
  with check (
    exists (
      select 1 from public.online_exam_sessions ses
      join public.online_exams e on e.id = ses.exam_id
      where ses.id = session_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = e.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

-- online_exam_violations: admins read (writes happen via service-role server action).
drop policy if exists "oviolation: admins read" on public.online_exam_violations;
create policy "oviolation: admins read" on public.online_exam_violations for select to authenticated
  using (
    exists (
      select 1 from public.online_exams e where e.id = exam_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = e.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

grant select, insert, update, delete on public.online_exams to authenticated;
grant select, insert, update, delete on public.online_exam_questions to authenticated;
grant select, insert, update, delete on public.online_exam_sessions to authenticated;
grant select, insert, update, delete on public.online_exam_answers to authenticated;
grant select, insert, update, delete on public.online_exam_violations to authenticated;
