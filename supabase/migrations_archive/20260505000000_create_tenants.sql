-- Foundational tenants table.
-- Must run before all other migrations that reference public.tenants(id).

CREATE TABLE IF NOT EXISTS public.tenants (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  subdomain     text        UNIQUE,
  college_type  text,
  status        text        NOT NULL DEFAULT 'Active',
  session_types text[],
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Super admins can read all tenants; authenticated users can read tenants they belong to.
CREATE POLICY "tenants: super admin read all"
  ON public.tenants FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO service_role;
