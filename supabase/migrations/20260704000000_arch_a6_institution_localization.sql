-- Arch A6 — Multi-currency & Multi-timezone: per-institution localization.
--
-- AURA was hardcoded to INR + en-IN + Asia/Kolkata. For a multi-tenant SaaS,
-- even one institution outside India breaks finance display and date handling.
-- These columns let each tenant pick its currency, locale, and timezone; the
-- display layer (src/lib/locale.ts) formats money and dates accordingly.
--
-- Storage is unaffected: all TIMESTAMPTZ values remain UTC; only presentation
-- converts to the institution timezone. Defaults preserve existing behavior for
-- every current tenant (India), so this is a backward-compatible change.

alter table public.institutions
  add column if not exists currency text not null default 'INR',
  add column if not exists locale   text not null default 'en-IN',
  add column if not exists timezone text not null default 'Asia/Kolkata';
