-- Phase 5A — admissions-documents Storage bucket.
-- Public bucket so applicants (anonymous) can attach documents to an application
-- and admins can view them. Uploads come from the public apply form via the
-- anon key, so anon needs INSERT on storage.objects for this bucket.

insert into storage.buckets (id, name, public)
values ('admissions-documents', 'admissions-documents', true)
on conflict (id) do nothing;

drop policy if exists "admissions-documents: public upload" on storage.objects;
create policy "admissions-documents: public upload"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'admissions-documents');

drop policy if exists "admissions-documents: public read" on storage.objects;
create policy "admissions-documents: public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'admissions-documents');
