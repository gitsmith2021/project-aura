-- Phase 4D — Laboratory Management
-- Scientific laboratories, lab batches, experiment syllabus, sessions, and per-student
-- session attendance + marks. Admins manage everything; the assigned lab assistant
-- (staff) manages sessions + attendance for their own labs; students read their own.

create table if not exists public.laboratories (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  department_id    uuid references public.departments(id) on delete set null,
  name             text not null,
  lab_type         text not null check (lab_type in ('physics','chemistry','botany','zoology','biotech','computer_science','other')),
  capacity         integer,
  lab_assistant_id uuid references public.staff(id) on delete set null,
  description      text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.laboratory_batches (
  id            uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  name          text not null,
  year_semester text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.laboratory_experiments (
  id            uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  title         text not null,
  description   text,
  requirements  jsonb,                 -- array of chemicals / apparatuses / instruments
  created_at    timestamptz not null default now()
);

create table if not exists public.laboratory_sessions (
  id                  uuid primary key default gen_random_uuid(),
  laboratory_batch_id uuid not null references public.laboratory_batches(id) on delete cascade,
  experiment_id       uuid not null references public.laboratory_experiments(id) on delete cascade,
  session_date        date not null default current_date,
  remarks             text,
  created_at          timestamptz not null default now()
);

create table if not exists public.laboratory_attendance (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.laboratory_sessions(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  is_present    boolean not null default true,
  marks_secured numeric(4,2),
  remarks       text,
  unique(session_id, student_id)
);

create index if not exists idx_laboratories_inst        on public.laboratories(institution_id);
create index if not exists idx_laboratories_dept        on public.laboratories(department_id);
create index if not exists idx_lab_batches_lab          on public.laboratory_batches(laboratory_id);
create index if not exists idx_lab_experiments_lab      on public.laboratory_experiments(laboratory_id);
create index if not exists idx_lab_sessions_batch       on public.laboratory_sessions(laboratory_batch_id);
create index if not exists idx_lab_sessions_experiment  on public.laboratory_sessions(experiment_id);
create index if not exists idx_lab_attendance_session   on public.laboratory_attendance(session_id);
create index if not exists idx_lab_attendance_student   on public.laboratory_attendance(student_id);

alter table public.laboratories          enable row level security;
alter table public.laboratory_batches    enable row level security;
alter table public.laboratory_experiments enable row level security;
alter table public.laboratory_sessions   enable row level security;
alter table public.laboratory_attendance enable row level security;

-- ── helper predicates inlined per policy (no functions added) ──────────────────
-- admin_of(institution_id):
--   exists g where role=SUPER_ADMIN OR (tenant_id=institution_id AND role=INST_ADMIN)
-- assistant_of(lab): exists staff st where st.id = lab.lab_assistant_id and st.profile_id = auth.uid()

-- ════ laboratories ════════════════════════════════════════════════════════════
drop policy if exists "labs: members read" on public.laboratories;
create policy "labs: members read" on public.laboratories for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

drop policy if exists "labs: admins manage" on public.laboratories;
create policy "labs: admins manage" on public.laboratories for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- ════ laboratory_batches (scoped via parent lab's institution) ════════════════
drop policy if exists "lab_batches: members read" on public.laboratory_batches;
create policy "lab_batches: members read" on public.laboratory_batches for select to authenticated
  using (
    laboratory_id in (
      select l.id from public.laboratories l where l.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "lab_batches: staff manage" on public.laboratory_batches;
create policy "lab_batches: staff manage" on public.laboratory_batches for all to authenticated
  using (
    exists (select 1 from public.laboratories l where l.id = laboratory_batches.laboratory_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
      or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
    ))
  )
  with check (
    exists (select 1 from public.laboratories l where l.id = laboratory_batches.laboratory_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
      or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
    ))
  );

-- ════ laboratory_experiments (scoped via parent lab's institution) ════════════
drop policy if exists "lab_experiments: members read" on public.laboratory_experiments;
create policy "lab_experiments: members read" on public.laboratory_experiments for select to authenticated
  using (
    laboratory_id in (
      select l.id from public.laboratories l where l.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "lab_experiments: staff manage" on public.laboratory_experiments;
create policy "lab_experiments: staff manage" on public.laboratory_experiments for all to authenticated
  using (
    exists (select 1 from public.laboratories l where l.id = laboratory_experiments.laboratory_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
      or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
    ))
  )
  with check (
    exists (select 1 from public.laboratories l where l.id = laboratory_experiments.laboratory_id and (
      exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
      or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
      or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
    ))
  );

-- ════ laboratory_sessions (scoped via batch → lab → institution) ══════════════
drop policy if exists "lab_sessions: members read" on public.laboratory_sessions;
create policy "lab_sessions: members read" on public.laboratory_sessions for select to authenticated
  using (
    laboratory_batch_id in (
      select b.id from public.laboratory_batches b
      join public.laboratories l on l.id = b.laboratory_id
      where l.institution_id in (
        select institution_id from public.institution_members where profile_id = auth.uid()
        union select institution_id from public.staff where profile_id = auth.uid()
        union select institution_id from public.students where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "lab_sessions: staff manage" on public.laboratory_sessions;
create policy "lab_sessions: staff manage" on public.laboratory_sessions for all to authenticated
  using (
    exists (
      select 1 from public.laboratory_batches b
      join public.laboratories l on l.id = b.laboratory_id
      where b.id = laboratory_sessions.laboratory_batch_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
        or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
      )
    )
  )
  with check (
    exists (
      select 1 from public.laboratory_batches b
      join public.laboratories l on l.id = b.laboratory_id
      where b.id = laboratory_sessions.laboratory_batch_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
        or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
      )
    )
  );

-- ════ laboratory_attendance (student reads own; staff/admin manage via session) ══
drop policy if exists "lab_attendance: student reads own or staff" on public.laboratory_attendance;
create policy "lab_attendance: student reads own or staff" on public.laboratory_attendance for select to authenticated
  using (
    student_id in (select id from public.students where profile_id = auth.uid())
    or exists (
      select 1 from public.laboratory_sessions s
      join public.laboratory_batches b on b.id = s.laboratory_batch_id
      join public.laboratories l on l.id = b.laboratory_id
      where s.id = laboratory_attendance.session_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
        or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
      )
    )
  );

drop policy if exists "lab_attendance: staff manage" on public.laboratory_attendance;
create policy "lab_attendance: staff manage" on public.laboratory_attendance for all to authenticated
  using (
    exists (
      select 1 from public.laboratory_sessions s
      join public.laboratory_batches b on b.id = s.laboratory_batch_id
      join public.laboratories l on l.id = b.laboratory_id
      where s.id = laboratory_attendance.session_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
        or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
      )
    )
  )
  with check (
    exists (
      select 1 from public.laboratory_sessions s
      join public.laboratory_batches b on b.id = s.laboratory_batch_id
      join public.laboratories l on l.id = b.laboratory_id
      where s.id = laboratory_attendance.session_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = l.institution_id and g.role = 'INST_ADMIN')
        or exists (select 1 from public.staff st where st.id = l.lab_assistant_id and st.profile_id = auth.uid())
      )
    )
  );

grant select, insert, update, delete on public.laboratories          to authenticated;
grant select, insert, update, delete on public.laboratory_batches    to authenticated;
grant select, insert, update, delete on public.laboratory_experiments to authenticated;
grant select, insert, update, delete on public.laboratory_sessions   to authenticated;
grant select, insert, update, delete on public.laboratory_attendance to authenticated;
