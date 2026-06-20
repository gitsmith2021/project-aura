-- ── leave_requests ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_date  date NOT NULL,
  reason      text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leave_requests: authenticated can select"
  ON public.leave_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "leave_requests: authenticated can insert"
  ON public.leave_requests FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "leave_requests: authenticated can update"
  ON public.leave_requests FOR UPDATE TO authenticated USING (true);

CREATE POLICY "leave_requests: authenticated can delete"
  ON public.leave_requests FOR DELETE TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;

-- ── staff_attendance ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date       date NOT NULL DEFAULT CURRENT_DATE,
  status     text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','on_leave')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date)
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_attendance: authenticated can select"
  ON public.staff_attendance FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff_attendance: authenticated can insert"
  ON public.staff_attendance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "staff_attendance: authenticated can update"
  ON public.staff_attendance FOR UPDATE TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_attendance;
