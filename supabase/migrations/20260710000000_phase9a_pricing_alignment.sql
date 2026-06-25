-- Phase 9A — Pricing alignment
--
-- Aligns the subscription_plans catalog (Phase 7E) with the public landing-page
-- pricing, which is the single source of truth (see docs/AURA_CAMPUS/PRICING_STRATEGY.md
-- and src/components/landing/Pricing/PricingSection.tsx):
--
--   Tier          Monthly    Annual (15% off)   Students   Staff
--   Essential     ₹9,999     ₹1,01,990          1,000      100
--   Professional  ₹24,999    ₹2,54,990          5,000      500
--   Enterprise    Custom     —                  unlimited  unlimited
--
-- The 7E seed used Starter/Pro/Enterprise at lower anchors. We rename + reprice
-- the two fixed tiers to match the landing page. institution_subscriptions
-- reference plan_id (uuid), so renaming the `name` is FK-safe.
--
-- Enterprise stays a catalog plan but is sold at custom/negotiated pricing
-- (the public page shows "Custom Pricing → Contact Us"); price_monthly retains
-- a representative "starting from" baseline used only for MRR estimation until a
-- signed contract amount is recorded on the institution_subscription.
--
-- Idempotent: keyed on the (new) plan names so re-running is a no-op.

-- 1) Rename + reprice the entry tier: Starter → Essential
update public.subscription_plans
   set name          = 'Essential',
       price_monthly = 9999,
       price_annual  = 101990,
       max_students  = 1000,
       max_staff     = 100,
       sort_order    = 1
 where name = 'Starter';

-- 2) Rename + reprice the mid tier: Pro → Professional
update public.subscription_plans
   set name          = 'Professional',
       price_monthly = 24999,
       price_annual  = 254990,
       max_students  = 5000,
       max_staff     = 500,
       sort_order    = 2
 where name = 'Pro';

-- 3) Enterprise — custom pricing; keep a representative baseline, clear the
--    fixed annual (negotiated per contract), keep limits unlimited (null).
update public.subscription_plans
   set price_monthly = 49999,
       price_annual  = null,
       max_students  = null,
       max_staff     = null,
       sort_order    = 3
 where name = 'Enterprise';

-- 4) Cold-start safety: if the 7E seed never ran (fresh DB), create the catalog.
insert into public.subscription_plans (name, price_monthly, price_annual, max_students, max_staff, features, sort_order)
values
  ('Essential', 9999, 101990, 1000, 100,
    '["core","parent_portal","certificates","feedback","grievances"]'::jsonb, 1),
  ('Professional', 24999, 254990, 5000, 500,
    '["core","parent_portal","certificates","feedback","grievances","transport","online_exams","lms","industry_connect","knowledge_hub"]'::jsonb, 2),
  ('Enterprise', 49999, null, null, null,
    '["core","parent_portal","certificates","feedback","grievances","transport","online_exams","lms","industry_connect","knowledge_hub","research","alumni","iqac","ssr","api","cctv"]'::jsonb, 3)
on conflict (name) do nothing;
