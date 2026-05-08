-- ============================================================
-- AURA: Programs & Schedules — Migration
-- Creates: subjects, class_schedules
-- ============================================================

-- ── 1. subjects ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subjects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  color         text NOT NULL DEFAULT '#7c3aed',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all subjects
CREATE POLICY "subjects: authenticated can select"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert/update/delete
CREATE POLICY "subjects: authenticated can insert"
  ON public.subjects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "subjects: authenticated can update"
  ON public.subjects FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "subjects: authenticated can delete"
  ON public.subjects FOR DELETE
  TO authenticated
  USING (true);

-- ── 2. class_schedules ───────────────────────────────────────
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

-- Authenticated users can read all schedules
CREATE POLICY "schedules: authenticated can select"
  ON public.class_schedules FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert/update/delete
CREATE POLICY "schedules: authenticated can insert"
  ON public.class_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "schedules: authenticated can update"
  ON public.class_schedules FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "schedules: authenticated can delete"
  ON public.class_schedules FOR DELETE
  TO authenticated
  USING (true);

-- ── 3. Optional seed: a few example subjects ─────────────────
-- Uncomment and adjust department_id values after checking your
-- departments table, or add subjects via the UI.
--
-- INSERT INTO public.subjects (name, department_id, color) VALUES
--   ('Anatomy',       '<your-dept-id>', '#7c3aed'),
--   ('Physiology',    '<your-dept-id>', '#0891b2'),
--   ('Pharmacology',  '<your-dept-id>', '#059669');
