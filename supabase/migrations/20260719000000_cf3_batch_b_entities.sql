-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 — Batch B entities (Payroll · Budget · Expenses)
--
-- Registers three more CF-2 explorable entities (engine untouched) so Aura
-- Intelligence can answer Finance Overview, Payroll and Budget questions. All
-- three source tables carry institution_id and their own RLS, so CF-2's
-- run-as-user guarantee holds directly (no view needed).
-- ════════════════════════════════════════════════════════════════════════════

insert into public.data_explorer_entities (key, label, category, source, columns, default_date_field, sort_order) values
  ('payroll', 'Payroll', 'Finance', 'salary_disbursements',
    '[{"key":"month","label":"Month","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"payment_mode","label":"Mode","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"amount_disbursed","label":"Amount","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"disbursed_at","label":"Disbursed On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'disbursed_at', 10),
  ('budgets', 'Department Budgets', 'Finance', 'department_budgets',
    '[{"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"total_allocated","label":"Allocated","type":"number","filterable":true,"groupable":false,"aggregatable":true}]'::jsonb,
    'created_at', 11),
  ('expenses', 'Expenses', 'Finance', 'expenses',
    '[{"key":"category","label":"Category","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"payment_mode","label":"Mode","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"vendor_name","label":"Vendor","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"amount","label":"Amount","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"expense_date","label":"Date","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'expense_date', 12)
on conflict (key) do nothing;
