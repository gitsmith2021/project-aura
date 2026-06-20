-- Arch A4 — Institution Onboarding Wizard: gate new tenants behind a setup flow.
--
-- A brand-new institution has no departments, academic year, fee structures or
-- staff, so the admin lands on an empty dashboard with no guidance. The
-- onboarding wizard (/onboarding/[institutionId]) walks them through the
-- minimum viable setup; `is_onboarded` is the flag the login redirect and the
-- wizard itself read to decide whether to send the admin there.
--
-- Default FALSE so every NEW institution starts un-onboarded. Existing tenants
-- are already operational — backfilled to TRUE so they're never trapped in the
-- wizard. The flag is flipped to TRUE by markOnboardingComplete() (or when the
-- admin skips to the end), never automatically.

alter table public.institutions
  add column if not exists is_onboarded boolean not null default false;

-- Backfill existing tenants (operational before this column existed).
update public.institutions set is_onboarded = true where is_onboarded = false;
