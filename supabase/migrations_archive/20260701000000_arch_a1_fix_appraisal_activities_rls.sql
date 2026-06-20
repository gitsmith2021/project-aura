-- Arch A1 — Fine-grained RLS audit & hardening.
--
-- Finding: `staff_appraisal_activities: read` (from Phase 5E) granted SELECT to
-- ANY authenticated user — its USING only checked that the parent appraisal
-- EXISTS, with no institution/ownership predicate. Because RLS policies are
-- OR-combined, this leaked every institution's appraisal-activity rows
-- (performance evidence) to any logged-in user, bypassing the correctly-scoped
-- "admins manage" and "staff manage" policies on the same table.
--
-- Fix: replace it with an owner-scoped read so the staff member can read their
-- own appraisal's activities at any status (the parent `staff_appraisals` already
-- lets them read the appraisal itself at any status). Admins / INST_ADMIN / HOD
-- keep SELECT via the existing "appraisal_activities: admins manage" ALL policy.

drop policy if exists "appraisal_activities: read" on public.staff_appraisal_activities;

create policy "appraisal_activities: staff read own" on public.staff_appraisal_activities
  for select to authenticated
  using (
    exists (
      select 1
      from public.staff_appraisals a
      join public.staff s on s.id = a.staff_id
      where a.id = staff_appraisal_activities.appraisal_id
        and s.profile_id = auth.uid()
    )
  );
