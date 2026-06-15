-- Fix broken staff RLS on leave_requests (surfaced by mobile, but also broke web).
--
-- The existing policy was:  USING/CHECK (staff_id = auth.uid())
-- But leave_requests.staff_id references staff(id), and a staff member links
-- to their auth user via staff.profile_id — NOT staff.id. For every staff row
-- staff.id <> auth.uid(), so the predicate never matched: staff could neither
-- read nor insert their own leave (web applyForLeave hit the same RLS wall;
-- it had simply never been exercised by a real staff user).
--
-- Replace it with the correct identity resolution. Split into read + insert so
-- staff can apply for leave and see their own, but can't UPDATE/DELETE rows
-- (no self-approval; admins/HODs review via the admins policy + the audited
-- review_leave_request RPC). New requests are forced to status 'pending'.

DROP POLICY IF EXISTS "leave_requests rbac: staff manage own" ON public.leave_requests;

CREATE POLICY "leave_requests: staff read own"
  ON public.leave_requests FOR SELECT TO authenticated
  USING (staff_id IN (SELECT id FROM public.staff WHERE profile_id = auth.uid()));

CREATE POLICY "leave_requests: staff apply own pending"
  ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND staff_id IN (SELECT id FROM public.staff WHERE profile_id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
