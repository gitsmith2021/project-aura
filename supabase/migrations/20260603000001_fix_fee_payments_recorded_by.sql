-- The profiles table was dropped during the tenants→institutions / staff+students
-- schema rename. The fee_payments.recorded_by FK pointed at profiles(id) and is
-- now broken. Re-point it at auth.users(id) — the canonical Supabase user identity
-- (user.id returned by supabase.auth.getUser() IS the auth.users UUID).

-- Drop the old broken FK (IF EXISTS so it's safe to run even if already removed)
ALTER TABLE public.fee_payments
  DROP CONSTRAINT IF EXISTS fee_payments_recorded_by_fkey;

-- Re-add pointing at auth.users
ALTER TABLE public.fee_payments
  ADD CONSTRAINT fee_payments_recorded_by_fkey
  FOREIGN KEY (recorded_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
