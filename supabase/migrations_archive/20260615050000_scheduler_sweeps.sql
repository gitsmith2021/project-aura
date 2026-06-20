-- Scheduler-driven notification sweeps (pg_cron) — clears deferred items
-- 4G-1 (outpass overdue → warden) and 3-4 (low attendance → student).
-- Fee-due (3-3) is NOT included: fee_structures has no due_date / per-student
-- invoice model, so "7 days overdue" is undefined until that schema exists.
--
-- DB-native scheduler: each sweep is a SECURITY DEFINER function that inserts
-- into public.notifications; pg_cron runs them on a fixed cadence. Realtime
-- delivers the inserts to each recipient's notification bell.

create extension if not exists pg_cron;

-- ── Sweep 1: outpass overdue → notify warden + student, then flip to 'overdue' ──
create or replace function private.sweep_overdue_outpasses()
returns integer
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  affected integer := 0;
begin
  -- warden alert (one per overdue outpass that has a hostel warden)
  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select o.institution_id, stw.profile_id, 'outpass_overdue', 'Outpass overdue',
         s.full_name || ' has not returned by the expected time (destination: ' || o.destination || ').',
         jsonb_build_object('outpass_id', o.id, 'student_id', o.student_id)
  from public.student_outpasses o
  join public.students s   on s.id = o.student_id
  join public.hostels h    on h.id = o.hostel_id
  join public.staff   stw  on stw.id = h.warden_id
  where o.status = 'approved' and o.actual_return is null and o.expected_return < now()
    and stw.profile_id is not null;

  -- student reminder
  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select o.institution_id, s.profile_id, 'outpass_overdue', 'You are overdue',
         'Your outpass return time has passed. Please return to campus or contact your warden.',
         jsonb_build_object('outpass_id', o.id)
  from public.student_outpasses o
  join public.students s on s.id = o.student_id
  where o.status = 'approved' and o.actual_return is null and o.expected_return < now()
    and s.profile_id is not null;

  -- flip status — this is the dedup: an overdue row is processed exactly once
  update public.student_outpasses
  set status = 'overdue'
  where status = 'approved' and actual_return is null and expected_return < now();
  get diagnostics affected = row_count;

  return affected;
end;
$fn$;

-- ── Sweep 2: low attendance (< threshold) → notify student, max once / 7 days ───
create or replace function private.sweep_low_attendance(threshold integer default 75, min_sessions integer default 5)
returns integer
language plpgsql
security definer
set search_path = public, private
as $fn$
declare
  affected integer := 0;
begin
  insert into public.notifications (institution_id, recipient_id, type, title, body, data)
  select s.institution_id, s.profile_id, 'attendance_low', 'Low attendance alert',
         'Your attendance is ' || agg.pct || '%, below the ' || threshold ||
         '% requirement. Please attend classes regularly.',
         jsonb_build_object('pct', agg.pct, 'sessions', agg.total)
  from (
    select a.student_id,
           round(100.0 * count(*) filter (where a.status = 'present') / nullif(count(*), 0)) as pct,
           count(*) as total
    from public.attendance a
    where a.student_id is not null
    group by a.student_id
  ) agg
  join public.students s on s.id = agg.student_id
  where agg.total >= min_sessions
    and agg.pct < threshold
    and s.profile_id is not null
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = s.profile_id
        and n.type = 'attendance_low'
        and n.created_at > now() - interval '7 days'
    );
  get diagnostics affected = row_count;

  return affected;
end;
$fn$;

revoke all on function private.sweep_overdue_outpasses() from public, anon, authenticated;
revoke all on function private.sweep_low_attendance(integer, integer) from public, anon, authenticated;

-- ── Schedule (idempotent) ──────────────────────────────────────────────────────
do $$ begin perform cron.unschedule('aura-outpass-overdue'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('aura-low-attendance');  exception when others then null; end $$;

-- every 30 minutes — outpass returns are time-sensitive
select cron.schedule('aura-outpass-overdue', '*/30 * * * *', 'select private.sweep_overdue_outpasses();');
-- daily at 07:17 local — one attendance nudge per morning
select cron.schedule('aura-low-attendance', '17 7 * * *', 'select private.sweep_low_attendance();');
