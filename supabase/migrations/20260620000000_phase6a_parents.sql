-- Phase 6A — Parent Portal
-- One parent account can be linked to many children (siblings) via a junction table.
-- Parents get a read-only view of each child's academics + fees. Child data is
-- fetched server-side (service role) only after the parent↔student link is verified.

create table if not exists public.parents (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  name            text not null,
  email           text not null unique,
  phone           text,
  user_id         uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_parents_inst on public.parents(institution_id);
create index if not exists idx_parents_user on public.parents(user_id);

create table if not exists public.parent_student_links (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid not null references public.parents(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  relationship text not null default 'parent'
               check (relationship in ('father','mother','guardian','other','parent')),
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (parent_id, student_id)
);
create index if not exists idx_psl_parent  on public.parent_student_links(parent_id);
create index if not exists idx_psl_student on public.parent_student_links(student_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.parents enable row level security;
alter table public.parent_student_links enable row level security;

-- Parent reads their own account; admins manage their institution's parents.
drop policy if exists "parents: self read" on public.parents;
create policy "parents: self read" on public.parents for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "parents: admins manage" on public.parents;
create policy "parents: admins manage" on public.parents for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- Parent reads their own links; admins manage all links in their institution.
drop policy if exists "psl: parent read own" on public.parent_student_links;
create policy "psl: parent read own" on public.parent_student_links for select to authenticated
  using (parent_id in (select id from public.parents where user_id = auth.uid()));

drop policy if exists "psl: admins manage" on public.parent_student_links;
create policy "psl: admins manage" on public.parent_student_links for all to authenticated
  using (
    exists (
      select 1 from public.parents p where p.id = parent_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = p.institution_id and g.role = 'INST_ADMIN')
      )
    )
  )
  with check (
    exists (
      select 1 from public.parents p where p.id = parent_id and (
        exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
        or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = p.institution_id and g.role = 'INST_ADMIN')
      )
    )
  );

grant select, insert, update, delete on public.parents to authenticated;
grant select, insert, update, delete on public.parent_student_links to authenticated;
