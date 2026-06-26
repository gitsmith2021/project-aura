-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 — Batch C entities (IQAC · Research · Alumni)
--
-- Registers entities for the Governance/Compliance + Research + Alumni intents.
-- iqac_action_items has no institution_id (it's via its meeting), so it's exposed
-- through a SECURITY INVOKER view. NAAC needs NO entity — it's a cross-entity
-- "accreditation readiness" intent built from these + existing entities.
-- CF-2 engine untouched — registry data only.
-- ════════════════════════════════════════════════════════════════════════════

create or replace view public.iqac_actions_summary
  with (security_invoker = true) as
select
  a.id               as id,
  m.institution_id   as institution_id,
  a.status           as status,
  a.due_date         as due_date,
  a.resolved_at      as resolved_at,
  m.academic_year_id as academic_year_id
from public.iqac_action_items a
join public.iqac_meetings m on m.id = a.meeting_id;

grant select on public.iqac_actions_summary to authenticated;

insert into public.data_explorer_entities (key, label, category, source, columns, default_date_field, sort_order) values
  ('iqac', 'IQAC Meetings', 'Compliance', 'iqac_meetings',
    '[{"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"academic_year_id","label":"Academic Year","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"meeting_date","label":"Meeting Date","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'meeting_date', 13),
  ('iqac_actions', 'IQAC Action Items', 'Compliance', 'iqac_actions_summary',
    '[{"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"due_date","label":"Due Date","type":"date","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"resolved_at","label":"Resolved On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'due_date', 14),
  ('research', 'Research Projects', 'Academics', 'research_projects',
    '[{"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"funding_agency","label":"Funding Agency","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"funding_amount","label":"Funding","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"funding_spent","label":"Spent","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"start_date","label":"Start Date","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'start_date', 15),
  ('publications', 'Publications', 'Academics', 'publications',
    '[{"key":"pub_type","label":"Type","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"pub_year","label":"Year","type":"number","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"scopus_indexed","label":"Scopus","type":"boolean","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"ugc_listed","label":"UGC-CARE","type":"boolean","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"impact_factor","label":"Impact Factor","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"journal_name","label":"Journal","type":"text","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    null, 16),
  ('alumni', 'Alumni', 'People', 'alumni',
    '[{"key":"graduation_year","label":"Batch Year","type":"number","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"program","label":"Program","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"current_employer","label":"Employer","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"city","label":"City","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"is_active","label":"Active","type":"boolean","filterable":true,"groupable":true,"aggregatable":false}]'::jsonb,
    null, 17)
on conflict (key) do nothing;
