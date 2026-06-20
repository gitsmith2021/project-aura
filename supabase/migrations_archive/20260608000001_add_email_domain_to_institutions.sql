-- Add email_domain to institutions so emails can be auto-generated for staff/students.
-- Example: "heber.ac.in" → student roll UG-SF-AV-001 gets email ugsfav001@heber.ac.in

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS email_domain TEXT;

NOTIFY pgrst, 'reload schema';
