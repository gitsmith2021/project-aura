-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 v2 — `staff_salary` CF-2 entity
--
-- The salary question ("staff drawing salary below ₹10,000") needs name +
-- employee id + designation + department + salary together. `staff` has no
-- salary; `salary_disbursements` has no name/designation. This view joins each
-- active staff member to their current active salary structure and exposes the
-- combined shape as a NEW CF-2 entity. CF-2's Query Model / compiler / PostgREST
-- path is unchanged — only one more entity is registered.
--
-- security_invoker = true → the view runs with the querying user's privileges, so
-- the base-table RLS (staff + salary_structures, both institution-scoped) applies.
-- Exposes institution_id because CF-2 runQuery scopes every entity on it.
-- ════════════════════════════════════════════════════════════════════════════

create or replace view public.staff_salary
  with (security_invoker = true) as
select
  s.institution_id,
  s.id            as staff_id,
  s.full_name,
  s.employee_id,
  s.designation,
  s.staff_type,
  s.department_id,
  s.is_active,
  ss.basic_salary,
  ss.net_salary
from public.staff s
join lateral (
  select x.basic_salary, x.net_salary
  from public.salary_structures x
  where x.staff_id = s.id and x.is_active = true
  order by x.effective_from desc
  limit 1
) ss on true
where s.is_active = true;

grant select on public.staff_salary to authenticated;

-- Register as a CF-2 entity (mirrors data_explorer_entities column metadata).
insert into public.data_explorer_entities (key, label, category, source, columns, default_date_field, sort_order) values
  ('staff_salary', 'Staff Salary', 'Finance', 'staff_salary',
    '[{"key":"full_name","label":"Name","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"employee_id","label":"Employee ID","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"designation","label":"Designation","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"staff_type","label":"Staff Type","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"net_salary","label":"Net Salary","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"basic_salary","label":"Basic Salary","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"is_active","label":"Active","type":"boolean","filterable":true,"groupable":true,"aggregatable":false}]'::jsonb,
    null, 20)
on conflict (key) do nothing;
