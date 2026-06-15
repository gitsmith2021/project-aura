-- Phase 4A — Library Management
create table if not exists public.library_books (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  department_id    uuid references public.departments(id) on delete set null,
  title            text not null,
  author           text not null,
  isbn             text,
  category         text not null,
  total_copies     integer not null default 1,
  available_copies integer not null default 1,
  published_year   integer,
  publisher        text,
  created_at       timestamptz not null default now()
);

create table if not exists public.library_lendings (
  id              uuid primary key default gen_random_uuid(),
  institution_id  uuid not null references public.institutions(id) on delete cascade,
  book_id         uuid not null references public.library_books(id) on delete cascade,
  borrower_id     uuid not null references auth.users(id) on delete cascade,
  borrower_type   text not null default 'student' check (borrower_type in ('student','staff')),
  issued_date     date not null default current_date,
  due_date        date not null,
  returned_date   date,
  fine_amount     numeric(6,2) not null default 0,
  status          text not null default 'issued' check (status in ('issued','returned','overdue','lost')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_library_books_inst   on public.library_books(institution_id);
create index if not exists idx_library_lendings_book on public.library_lendings(book_id);
create index if not exists idx_library_lendings_borrower on public.library_lendings(borrower_id);
create index if not exists idx_library_lendings_open on public.library_lendings(institution_id, status);

alter table public.library_books enable row level security;
alter table public.library_lendings enable row level security;

-- books: all institution members read; admins manage
drop policy if exists "library_books: members read" on public.library_books;
create policy "library_books: members read"
  on public.library_books for select to authenticated
  using (
    institution_id in (
      select institution_id from public.institution_members where profile_id = auth.uid()
      union select institution_id from public.staff where profile_id = auth.uid()
      union select institution_id from public.students where profile_id = auth.uid()
    )
  );

drop policy if exists "library_books: admins manage" on public.library_books;
create policy "library_books: admins manage"
  on public.library_books for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

-- lendings: a borrower reads their own; admins read + manage all in the institution
drop policy if exists "library_lendings: borrower reads own" on public.library_lendings;
create policy "library_lendings: borrower reads own"
  on public.library_lendings for select to authenticated
  using (
    borrower_id = auth.uid()
    or exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "library_lendings: admins manage" on public.library_lendings;
create policy "library_lendings: admins manage"
  on public.library_lendings for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.library_books to authenticated;
grant select, insert, update, delete on public.library_lendings to authenticated;
