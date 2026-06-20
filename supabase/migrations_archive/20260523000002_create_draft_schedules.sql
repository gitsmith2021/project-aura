DO $$
BEGIN
  -- Create the table fresh if it doesn't exist yet
  CREATE TABLE IF NOT EXISTS public.draft_schedules (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    department_id  uuid        NOT NULL REFERENCES public.departments(id)  ON DELETE CASCADE,
    academic_year  text        NOT NULL,
    schedule_data  jsonb       NOT NULL,
    status         text        NOT NULL DEFAULT 'DRAFT',
    generated_at   timestamptz NOT NULL DEFAULT now(),
    created_at     timestamptz NOT NULL DEFAULT now()
  );

  -- If the table already existed with the old tenant_id column, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'draft_schedules'
      AND column_name  = 'tenant_id'
  ) THEN
    ALTER TABLE public.draft_schedules RENAME COLUMN tenant_id TO institution_id;
  END IF;
END $$;

ALTER TABLE public.draft_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can manage their own draft schedules"      ON public.draft_schedules;
DROP POLICY IF EXISTS "Institution members can manage their own draft schedules" ON public.draft_schedules;

CREATE POLICY "Institution members can manage their own draft schedules"
  ON public.draft_schedules FOR ALL
  USING (
    institution_id = (
      SELECT institution_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

NOTIFY pgrst, 'reload schema';
