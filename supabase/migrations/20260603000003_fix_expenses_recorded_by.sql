-- expenses.recorded_by also referenced the dropped profiles table.
-- Same fix: drop broken FK, re-add pointing at auth.users(id).

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_recorded_by_fkey;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_recorded_by_fkey
  FOREIGN KEY (recorded_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
