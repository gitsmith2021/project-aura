-- class_schedules is the canonical table for live class sessions (it's what
-- attendance.schedule_id references and what the NFC route writes against — see
-- the FK-repointing migration). The session page's "End Session" action needs to
-- mark a slot completed, mirroring "schedules.status" (text, default 'scheduled').
-- Not adding "draft_schedule_id" — that's scheduler-workflow-specific and unused
-- by the session/attendance pathway.

ALTER TABLE public.class_schedules
  ADD COLUMN status text DEFAULT 'scheduled';

NOTIFY pgrst, 'reload schema';
