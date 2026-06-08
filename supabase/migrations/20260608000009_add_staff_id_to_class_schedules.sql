-- src/app/api/attendance/nfc/route.ts queries
--   .from("class_schedules").select(...).eq("staff_id", device.profile_id)
-- to find the active class slot for the scanning staff member — but
-- class_schedules has no "staff_id" column (only "schedules", a separate/older
-- table with 0 rows, has one). That query would fail at runtime with a
-- "column class_schedules.staff_id does not exist" PostgREST error, meaning the
-- NFC webhook can never resolve a slot. Add the column the route already expects,
-- nullable since the current 2 seed rows have no staff assigned yet.

ALTER TABLE public.class_schedules
  ADD COLUMN staff_id uuid REFERENCES public.staff(id);

NOTIFY pgrst, 'reload schema';
