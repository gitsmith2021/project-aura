-- Phase 5L — Department Budget Management (NAAC 6.4)
-- Replaces the legacy `budgets` table (created in 20260512000000_finance_module,
-- 0 rows, never actually wired correctly — its consumers queried a text
-- `academic_year` column that was never created; the table only ever had
-- `academic_year_id`). That feature (BudgetSetupModal + getBudgets/upsertBudget/
-- getBudgetVsActuals/getDepartmentBudgetReport) is retired in this same change
-- in favour of this proper draft -> submit -> approve workflow with line items.

drop table if exists public.budgets cascade;

create table public.department_budgets (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  department_id    uuid not null references public.departments(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  total_allocated  numeric(12,2) not null default 0,
  status           text not null default 'draft'
                   check (status in ('draft','submitted','approved','rejected')),
  submitted_by     uuid references public.staff(id) on delete set null,
  approved_by      uuid references auth.users(id) on delete set null,
  admin_notes      text,
  submitted_at     timestamptz,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (department_id, academic_year_id)
);
create index idx_dept_budgets_inst on public.department_budgets(institution_id, academic_year_id);

create table public.budget_line_items (
  id          uuid primary key default gen_random_uuid(),
  budget_id   uuid not null references public.department_budgets(id) on delete cascade,
  category    text not null check (category in (
                'lab_equipment','stationery','furniture','it_hardware',
                'software','maintenance','travel','training','events','other')),
  description text not null,
  planned_amt numeric(10,2) not null,
  actual_amt  numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);
create index idx_budget_line_items_budget on public.budget_line_items(budget_id);

alter table public.department_budgets enable row level security;
alter table public.budget_line_items  enable row level security;

-- Admins (SUPER_ADMIN / INST_ADMIN, PRINCIPAL normalises to INST_ADMIN) manage all;
-- HODs manage their own department's budget (draft + submit). Approve/reject is
-- gated in the application layer (Server Action checks role before transitioning
-- status to approved/rejected) — RLS only scopes which rows can be touched at all.
drop policy if exists "department_budgets: admins and hod manage" on public.department_budgets;
create policy "department_budgets: admins and hod manage" on public.department_budgets for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = department_budgets.department_id
    )
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
    or exists (
      select 1 from private.get_user_authorizations() g
      where g.tenant_id = institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = department_budgets.department_id
    )
  );

drop policy if exists "budget_line_items: admins and hod manage" on public.budget_line_items;
create policy "budget_line_items: admins and hod manage" on public.budget_line_items for all to authenticated
  using (
    budget_id in (
      select db.id from public.department_budgets db
      where exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
         or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = db.institution_id and g.role = 'INST_ADMIN')
         or exists (
           select 1 from private.get_user_authorizations() g
           where g.tenant_id = db.institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = db.department_id
         )
    )
  )
  with check (
    budget_id in (
      select db.id from public.department_budgets db
      where exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
         or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = db.institution_id and g.role = 'INST_ADMIN')
         or exists (
           select 1 from private.get_user_authorizations() g
           where g.tenant_id = db.institution_id and g.role in ('HOD','DEPARTMENT_HEAD') and g.department_id = db.department_id
         )
    )
  );

grant select, insert, update, delete on public.department_budgets to authenticated;
grant select, insert, update, delete on public.budget_line_items  to authenticated;
