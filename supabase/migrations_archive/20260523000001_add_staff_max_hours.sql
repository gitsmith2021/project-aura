ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS max_hours_per_week INTEGER DEFAULT 20
    CHECK (max_hours_per_week > 0 AND max_hours_per_week <= 40);

COMMENT ON COLUMN public.staff.max_hours_per_week IS 'Weekly teaching hour cap used by the auto-scheduler. Defaults to 20.';

NOTIFY pgrst, 'reload schema';
