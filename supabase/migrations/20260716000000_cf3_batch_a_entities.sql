-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 — Batch A entities (Placements · Scholarships · Results)
--
-- Registers three more explorable entities for Aura Intelligence (and Data
-- Explorer). Placements/Scholarships use SECURITY INVOKER views that join in the
-- company / scheme names while preserving the querying user's RLS (so the
-- run-as-user, no-leak guarantee holds). Results registers the existing
-- `exam_results` table directly. CF-2 engine untouched — registry data only.
--
-- NOTE: `exam_results` exists in prod but its DDL is missing from migrations (a
-- rebaseline gap, like `clubs` was). Registering the entity is just a metadata
-- row; the table is read at runtime where it exists. The baseline gap is a
-- separate Campus housekeeping item.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Placements ────────────────────────────────────────────────────────────────
create or replace view public.placement_summary
  with (security_invoker = true) as
select
  r.id                       as id,
  d.institution_id           as institution_id,
  r.student_id               as student_id,
  r.stage_status             as stage_status,
  r.offer_ctc                as offer_ctc,
  (r.placed_at is not null)  as placed,
  d.job_role                 as job_role,
  c.name                     as company,
  d.drive_date               as drive_date
from public.placement_registrations r
join public.placement_drives d on d.id = r.drive_id
left join public.companies c on c.id = d.company_id;

grant select on public.placement_summary to authenticated;

-- ── Scholarships ──────────────────────────────────────────────────────────────
create or replace view public.scholarship_summary
  with (security_invoker = true) as
select
  a.id                 as id,
  a.institution_id     as institution_id,
  a.student_id         as student_id,
  a.status             as status,
  a.disbursed_amount   as disbursed_amount,
  a.application_date   as application_date,
  s.name               as scheme,
  s.scheme_type        as scheme_type
from public.scholarship_applications a
left join public.scholarship_schemes s on s.id = a.scheme_id;

grant select on public.scholarship_summary to authenticated;

-- ── Register the three entities in the CF-2 registry ──────────────────────────
insert into public.data_explorer_entities (key, label, category, source, columns, default_date_field, sort_order) values
  ('placements', 'Placements', 'Placements', 'placement_summary',
    '[{"key":"company","label":"Company","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"job_role","label":"Role","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"stage_status","label":"Stage","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"placed","label":"Placed","type":"boolean","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"offer_ctc","label":"Offer CTC","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"drive_date","label":"Drive Date","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'drive_date', 7),
  ('scholarships', 'Scholarships', 'Finance', 'scholarship_summary',
    '[{"key":"scheme","label":"Scheme","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"scheme_type","label":"Type","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"status","label":"Status","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"disbursed_amount","label":"Disbursed","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"application_date","label":"Applied On","type":"date","filterable":true,"groupable":false,"aggregatable":false}]'::jsonb,
    'application_date', 8),
  ('results', 'Exam Results', 'Academics', 'exam_results',
    '[{"key":"subject_name","label":"Subject","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"semester","label":"Semester","type":"number","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"grade","label":"Grade","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"is_arrear","label":"Arrear","type":"boolean","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"marks_scored","label":"Marks","type":"number","filterable":true,"groupable":false,"aggregatable":true}]'::jsonb,
    null, 9)
on conflict (key) do nothing;
