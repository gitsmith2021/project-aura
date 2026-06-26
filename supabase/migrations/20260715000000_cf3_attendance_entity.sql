-- ════════════════════════════════════════════════════════════════════════════
-- AURA CORE FOUNDATION · CF-3 — register a Student Attendance entity
--
-- Adds a per-student attendance-% summary as a SECURITY INVOKER view, then
-- registers it in the CF-2 entity registry so both Data Explorer and Aura
-- Intelligence (Attendance Risk) can query it. CF-2's engine is untouched —
-- this only extends the product-registered entity data.
--
-- security_invoker = true is REQUIRED: the view runs under the querying user's
-- RLS on students + attendance, so the "runs as the user, RLS-respecting"
-- guarantee holds — no executive sees a student they couldn't already see.
-- ════════════════════════════════════════════════════════════════════════════

create or replace view public.student_attendance_summary
  with (security_invoker = true) as
select
  s.id                       as student_id,
  s.institution_id           as institution_id,
  s.department_id            as department_id,
  s.full_name                as full_name,
  s.roll_no                  as roll_no,
  s.student_program          as student_program,
  s.student_year             as student_year,
  count(a.id)                as sessions_held,
  count(a.id) filter (where a.status = 'present') as sessions_attended,
  (round(100.0 * count(a.id) filter (where a.status = 'present') / nullif(count(a.id), 0)))::int as attendance_pct
from public.students s
join public.attendance a on a.student_id = s.id
where s.is_active = true
group by s.id, s.institution_id, s.department_id, s.full_name, s.roll_no, s.student_program, s.student_year;

grant select on public.student_attendance_summary to authenticated;

-- Register it as a CF-2 explorable entity (used by Data Explorer + CF-3).
insert into public.data_explorer_entities (key, label, category, source, columns, default_date_field, sort_order) values
  ('student_attendance', 'Student Attendance', 'Academics', 'student_attendance_summary',
    '[{"key":"full_name","label":"Name","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"roll_no","label":"Roll No","type":"text","filterable":true,"groupable":false,"aggregatable":false},
      {"key":"student_program","label":"Program","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"department_id","label":"Department","type":"text","filterable":true,"groupable":true,"aggregatable":false},
      {"key":"attendance_pct","label":"Attendance %","type":"number","filterable":true,"groupable":false,"aggregatable":true},
      {"key":"sessions_held","label":"Sessions Held","type":"number","filterable":false,"groupable":false,"aggregatable":true},
      {"key":"sessions_attended","label":"Attended","type":"number","filterable":false,"groupable":false,"aggregatable":true}]'::jsonb,
    null, 6)
on conflict (key) do nothing;
