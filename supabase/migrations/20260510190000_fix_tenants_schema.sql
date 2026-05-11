-- Fix the `tenants` table to match the application's expectations

-- 1. Rename `slug` to `subdomain` if `slug` exists and `subdomain` does not.
DO $$ 
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='tenants' AND column_name='slug') AND
     NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='tenants' AND column_name='subdomain') THEN
      ALTER TABLE public.tenants RENAME COLUMN slug TO subdomain;
  END IF;
END $$;

-- 2. Add `college_type` if it doesn't exist.
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='tenants' AND column_name='college_type') THEN
      ALTER TABLE public.tenants ADD COLUMN college_type text;
  END IF;
END $$;

-- 3. Add `status` if it doesn't exist.
DO $$ 
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name='tenants' AND column_name='status') THEN
      ALTER TABLE public.tenants ADD COLUMN status text DEFAULT 'Active';
  END IF;
END $$;
