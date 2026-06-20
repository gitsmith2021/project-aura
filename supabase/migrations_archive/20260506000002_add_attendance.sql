-- ============================================================
-- AURA: Attendance — Migration
-- Creates: attendance
-- ============================================================

CREATE TABLE IF NOT EXISTS public.attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   uuid NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, student_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all attendance
CREATE POLICY "attendance: authenticated can select"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert/update/delete
CREATE POLICY "attendance: authenticated can insert"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "attendance: authenticated can update"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "attendance: authenticated can delete"
  ON public.attendance FOR DELETE
  TO authenticated
  USING (true);

-- Enable realtime for attendance
alter publication supabase_realtime add table public.attendance;