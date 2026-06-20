-- Fee Demand & Collection — the "due-date model" the finance module was missing.
--
-- fee_structures = price list (no due date, no per-student link).
-- fee_payments   = receipts.
-- fee_demands    = THIS: per-student obligation with a due_date + concession +
--                  status. "Paid" is derived from completed fee_payments matching
--                  the demand's (student_id, fee_structure_id) — so the existing
--                  manual + Razorpay payment flows need no changes.

create table if not exists public.fee_demands (
  id                uuid primary key default gen_random_uuid(),
  institution_id    uuid not null references public.institutions(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  fee_structure_id  uuid not null references public.fee_structures(id) on delete cascade,
  academic_year_id  uuid references public.academic_years(id) on delete set null,
  title             text not null,                 -- denormalised from the structure
  amount_due        numeric(10,2) not null,        -- gross (structure amount)
  concession_amount numeric(10,2) not null default 0,
  net_due           numeric(10,2) generated always as (greatest(amount_due - concession_amount, 0)) stored,
  due_date          date not null,
  status            text not null default 'pending'
                    check (status in ('pending','partial','paid','waived','cancelled')),
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  -- one demand per student per fee structure (structures are academic-year scoped)
  unique(student_id, fee_structure_id)
);

-- forward-compat: lets ad-hoc demands (library fines / hostel fees, future) bind a
-- specific payment to a demand. Unused by structure-based rollup.
alter table public.fee_payments add column if not exists demand_id uuid references public.fee_demands(id) on delete set null;

create index if not exists idx_fee_demands_inst    on public.fee_demands(institution_id, status);
create index if not exists idx_fee_demands_student on public.fee_demands(student_id);
create index if not exists idx_fee_demands_due     on public.fee_demands(due_date);
create index if not exists idx_fee_payments_demand on public.fee_payments(demand_id);

alter table public.fee_demands enable row level security;

drop policy if exists "fee_demands: student reads own or admin" on public.fee_demands;
create policy "fee_demands: student reads own or admin" on public.fee_demands for select to authenticated
  using (
    student_id in (select id from public.students where profile_id = auth.uid())
    or exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

drop policy if exists "fee_demands: admins manage" on public.fee_demands;
create policy "fee_demands: admins manage" on public.fee_demands for all to authenticated
  using (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  )
  with check (
    exists (select 1 from private.get_user_authorizations() g where g.role = 'SUPER_ADMIN')
    or exists (select 1 from private.get_user_authorizations() g where g.tenant_id = institution_id and g.role = 'INST_ADMIN')
  );

grant select, insert, update, delete on public.fee_demands to authenticated;

-- ── Fee-due sweep (clears deferred 3-3) ────────────────────────────────────────
-- Notifies students whose net demand is still unpaid `grace_days` after the due
-- date. Dedup: at most one fee_due notification per student per 7 days.
create or replace function private.sweep_fee_due(grace_days integer default 7)
returns integer
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  affected integer := 0;
begin
  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select d.institution_id, s.profile_id, 'fee_due', 'Fee payment due',
         'You have an outstanding fee of ₹' || round(d.net_due - coalesce(p.paid, 0))::text ||
         ' (' || d.title || '), due ' || to_char(d.due_date, 'DD Mon YYYY') ||
         '. Please pay to avoid late charges.',
         jsonb_build_object('demand_id', d.id, 'balance', round(d.net_due - coalesce(p.paid, 0)))
  from public.fee_demands d
  join public.students s on s.id = d.student_id
  left join (
    select student_id, fee_structure_id, sum(amount_paid) as paid
    from public.fee_payments
    where payment_status = 'completed'
    group by student_id, fee_structure_id
  ) p on p.student_id = d.student_id and p.fee_structure_id = d.fee_structure_id
  where d.status not in ('waived', 'cancelled')
    and d.due_date < (current_date - grace_days)
    and d.net_due > coalesce(p.paid, 0)
    and s.profile_id is not null
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = s.profile_id and n.type = 'fee_due'
        and n.created_at > now() - interval '7 days'
    );
  get diagnostics affected = row_count;
  return affected;
end;
$fn$;

revoke all on function private.sweep_fee_due(integer) from public, anon, authenticated;

do $$ begin perform cron.unschedule('aura-fee-due'); exception when others then null; end $$;
-- daily at 08:13 local
select cron.schedule('aura-fee-due', '13 8 * * *', 'select private.sweep_fee_due();');
