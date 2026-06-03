-- salary_disbursements.processed_by also referenced the dropped profiles table.
-- Same fix as fee_payments.recorded_by (migration 20260603000001):
-- drop the broken FK, re-add it pointing at auth.users(id).

ALTER TABLE public.salary_disbursements
  DROP CONSTRAINT IF EXISTS salary_disbursements_processed_by_fkey;

ALTER TABLE public.salary_disbursements
  ADD CONSTRAINT salary_disbursements_processed_by_fkey
  FOREIGN KEY (processed_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
