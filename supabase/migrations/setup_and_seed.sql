-- ============================================================
-- AURA: Full Schema Setup & Live Class Injection
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

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

-- Enable realtime for attendance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END
$$;


-- ── 4. Inject Live Class for Medical Surgical Nursing ──────────────────────
-- Note: Since Biotechnology doesn't exist in your screenshot, I'm using "Medical Surgical Nursing"
DO $$
DECLARE
    v_dept_id UUID;
    v_staff_id UUID;
    v_subject_id UUID;
    v_today TEXT;
BEGIN
    -- 1. Identify the Medical Surgical Nursing Department
    SELECT id INTO v_dept_id FROM departments WHERE name = 'Medical Surgical Nursing' LIMIT 1;
    
    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Medical Surgical Nursing department not found. Please ensure it exists.';
    END IF;

    -- 2. Identify a staff member from that department (or any staff if none assigned yet)
    SELECT id INTO v_staff_id FROM profiles WHERE department_id = v_dept_id AND role = 'STAFF' LIMIT 1;
    
    IF v_staff_id IS NULL THEN
        -- Fallback to any staff member if the department has no staff yet
        SELECT id INTO v_staff_id FROM profiles WHERE role = 'STAFF' LIMIT 1;
    END IF;

    -- 3. Create or find the subject
    SELECT id INTO v_subject_id FROM subjects WHERE name = 'Advanced Clinical Practice' AND department_id = v_dept_id LIMIT 1;
    
    IF v_subject_id IS NULL THEN
        INSERT INTO subjects (name, department_id, color) 
        VALUES ('Advanced Clinical Practice', v_dept_id, '#10b981')
        RETURNING id INTO v_subject_id;
    END IF;

    -- 4. Get today's day of week (trim removes trailing spaces from to_char)
    v_today := trim(to_char(current_date, 'Day'));
    
    -- 5. Insert into class_schedules (make it live right now)
    INSERT INTO class_schedules (department_id, subject_id, staff_id, day_of_week, start_time, end_time)
    VALUES (
        v_dept_id, 
        v_subject_id, 
        v_staff_id, 
        v_today, 
        (current_time - interval '1 hour')::time, 
        (current_time + interval '1 hour')::time
    );

    RAISE NOTICE 'Live class injected successfully!';
END $$;