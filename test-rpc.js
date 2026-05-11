const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const sql = `
-- ── 1. Create subjects table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subjects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  color         text NOT NULL DEFAULT '#7c3aed',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subjects: authenticated can select" ON public.subjects;
CREATE POLICY "subjects: authenticated can select" ON public.subjects FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects: authenticated can insert" ON public.subjects;
CREATE POLICY "subjects: authenticated can insert" ON public.subjects FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "subjects: authenticated can update" ON public.subjects;
CREATE POLICY "subjects: authenticated can update" ON public.subjects FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "subjects: authenticated can delete" ON public.subjects;
CREATE POLICY "subjects: authenticated can delete" ON public.subjects FOR DELETE TO authenticated USING (true);


-- ── 2. Create class_schedules table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  subject_id    uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  staff_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week   text NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time    time NOT NULL,
  end_time      time NOT NULL CHECK (end_time > start_time),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules: authenticated can select" ON public.class_schedules;
CREATE POLICY "schedules: authenticated can select" ON public.class_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "schedules: authenticated can insert" ON public.class_schedules;
CREATE POLICY "schedules: authenticated can insert" ON public.class_schedules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "schedules: authenticated can update" ON public.class_schedules;
CREATE POLICY "schedules: authenticated can update" ON public.class_schedules FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "schedules: authenticated can delete" ON public.class_schedules;
CREATE POLICY "schedules: authenticated can delete" ON public.class_schedules FOR DELETE TO authenticated USING (true);


-- ── 3. Create attendance table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   uuid NOT NULL REFERENCES public.class_schedules(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, student_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance: authenticated can select" ON public.attendance;
CREATE POLICY "attendance: authenticated can select" ON public.attendance FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "attendance: authenticated can insert" ON public.attendance;
CREATE POLICY "attendance: authenticated can insert" ON public.attendance FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "attendance: authenticated can update" ON public.attendance;
CREATE POLICY "attendance: authenticated can update" ON public.attendance FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "attendance: authenticated can delete" ON public.attendance;
CREATE POLICY "attendance: authenticated can delete" ON public.attendance FOR DELETE TO authenticated USING (true);
  `;

  // Since we can't run raw SQL from the client without an RPC, 
  // I will just provide the exact SQL block for the user to copy.
}
run();