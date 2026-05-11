-- Fix: Add missing `department_id` column back to the `profiles` table.
-- The UI frontend still expects this legacy column to exist on profiles for Staff/Student creation and dashboard analytics.

DO $$ 
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='profiles' AND column_name='department_id') THEN
      ALTER TABLE public.profiles ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;
