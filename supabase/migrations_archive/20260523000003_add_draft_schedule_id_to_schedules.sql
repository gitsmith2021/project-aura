ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS draft_schedule_id uuid
    REFERENCES public.draft_schedules(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.schedules.draft_schedule_id IS 'Links a schedule row to the draft that generated it, enabling clean replacement when a new schedule is published.';

NOTIFY pgrst, 'reload schema';
