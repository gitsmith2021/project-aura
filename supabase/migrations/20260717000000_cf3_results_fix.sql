-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 — fix the Results entity
--
-- Batch A (20260716000000) registered the `results` entity against
-- `public.exam_results` — but that table DOES NOT EXIST in prod (it's referenced
-- by src/actions/examResults.ts, which is therefore broken — a separate Campus
-- bug to address). The real published-results data lives in `cia_results`
-- (Phase 2E CIA Assessment Engine). Re-point the entity there with correct columns.
--
-- cia_results is RLS-protected, so the entity remains run-as-user safe via CF-2.
-- ════════════════════════════════════════════════════════════════════════════

update public.data_explorer_entities
set source = 'cia_results',
    label  = 'CIA Results',
    category = 'Academics',
    columns = '[{"key":"final_percentage","label":"Score %","type":"number","filterable":true,"groupable":false,"aggregatable":true},
                {"key":"semester","label":"Semester","type":"number","filterable":true,"groupable":true,"aggregatable":false},
                {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
                {"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false}]'::jsonb,
    default_date_field = 'created_at'
where key = 'results';
