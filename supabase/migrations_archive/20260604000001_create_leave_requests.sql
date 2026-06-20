-- Leave requests: staff can apply, admins can approve/reject
-- RLS uses a permissive policy for v1; server actions enforce business logic.
-- Tighten once staff.profile_id → auth.users(id) mapping is populated.

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leave_type      TEXT NOT NULL CHECK (leave_type IN ('sick','casual','earned','maternity','paternity','other')),
  from_date       DATE NOT NULL,
  to_date         DATE NOT NULL,
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note     TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Ensure new columns exist on pre-existing leave_requests tables
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS leave_type     TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS from_date      DATE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS to_date        DATE;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS review_note    TEXT;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_leave_requests_staff       ON public.leave_requests(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_institution ON public.leave_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status      ON public.leave_requests(status);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can manage leaves (server actions enforce data isolation)
DROP POLICY IF EXISTS "authenticated can manage leave_requests" ON public.leave_requests;
CREATE POLICY "authenticated can manage leave_requests"
  ON public.leave_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
