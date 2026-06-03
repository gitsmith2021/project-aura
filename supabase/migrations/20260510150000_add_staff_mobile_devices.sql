DROP TABLE IF EXISTS public.devices CASCADE;

-- Registered staff mobile NFC readers (tenant-scoped).
CREATE TABLE public.devices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_uid  text NOT NULL UNIQUE,
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX devices_tenant_id_idx ON public.devices (tenant_id);
CREATE INDEX devices_profile_id_idx ON public.devices (profile_id);

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.devices FROM PUBLIC;
GRANT ALL ON TABLE public.devices TO postgres;
GRANT ALL ON TABLE public.devices TO service_role;
