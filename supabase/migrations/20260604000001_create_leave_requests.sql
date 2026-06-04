-- Leave requests: staff can apply, admins can approve/reject
-- RLS uses a permissive policy for v1; server actions enforce business logic.
-- Tighten once staff.profile_id → auth.users(id) mapping is populated.

CREATE TABLE public.leave_requests (
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

CREATE INDEX idx_leave_requests_staff       ON public.leave_requests(staff_id);
CREATE INDEX idx_leave_requests_institution ON public.leave_requests(institution_id);
CREATE INDEX idx_leave_requests_status      ON public.leave_requests(status);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can manage leaves (server actions enforce data isolation)
CREATE POLICY "authenticated can manage leave_requests"
  ON public.leave_requests FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
