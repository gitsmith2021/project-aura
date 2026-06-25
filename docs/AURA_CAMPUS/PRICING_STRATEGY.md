# 💰 AURA CAMPUS™ — Pricing Strategy (Phase 9A)

> The commercial pricing reference for Aura Campus v1.0. This is the **single
> source of truth** mirrored by both the public pricing page
> ([PricingSection.tsx](../../src/components/landing/Pricing/PricingSection.tsx))
> and the operational billing catalog (`subscription_plans`, Phase 7E — aligned
> by migration [`20260710000000_phase9a_pricing_alignment.sql`](../../supabase/migrations/20260710000000_phase9a_pricing_alignment.sql)).
>
> **Currency:** INR (₹) + GST · **Last updated:** 2026-06-25

---

## 1. Plan Tiers

| Tier | Monthly | Annual (15% off) | Annual / mo | Students | Staff | CTA |
|------|---------|------------------|-------------|----------|-------|-----|
| **Essential** | ₹9,999 | ₹1,01,990 | ₹8,499/mo | up to 1,000 | up to 100 | Start 30-Day Free Trial |
| **Professional** ⭐ | ₹24,999 | ₹2,54,990 | ₹21,249/mo | up to 5,000 | up to 500 | Start 30-Day Free Trial |
| **Enterprise** | Custom | Negotiated | — | Unlimited | Unlimited | Contact Us |

⭐ = "Most Popular" (default highlighted tier on the pricing page).

### What's included

- **Essential** — Admissions · Attendance · Timetable · Fee Management · Student Portal · Staff Portal.
- **Professional** — *Everything in Essential* + Admissions CRM · Library · Hostel · Payroll · Recruitment · Placements · Scholarships · Knowledge Hub · Events & Sports · Inventory & Assets · Accreditation Tools.
- **Enterprise** — *Everything in Professional* + Multi-campus support · Research & Publications · Alumni Network · IQAC / AQAR Suite · SSR Builder · API Access · Dedicated Support · SLA · Custom Integrations.

---

## 2. Commercial Levers

| Lever | Policy | Rationale |
|-------|--------|-----------|
| **Free trial** | 30 days, no credit card | Removes friction; the platform is fully usable in trial. Maps to `institution_subscriptions.status = 'trial'` (7E). |
| **Annual discount** | 15% off vs. month-to-month | Improves cash flow & retention; standard SaaS annual incentive. Annual = `round(monthly × 12 × 0.85)`. |
| **Enterprise** | Custom / negotiated | Multi-campus + SLA + integrations are deal-specific. DB keeps a representative baseline (₹49,999/mo) for MRR estimation only — the signed amount is recorded per `institution_subscription`. |
| **AI add-on** | Optional, not in any tier | Knowledge Hub AI summaries + RAG assistant require Anthropic credit; sold separately so core value stands alone (consistent with the demo/sales framing). |

---

## 3. Source-of-Truth Mapping

The landing page and the DB catalog **must stay in sync**. The landing page is
the source of truth; the DB is aligned to it.

| Field | Landing (`PricingSection.tsx`) | DB (`subscription_plans`) |
|-------|-------------------------------|---------------------------|
| Tier name | `Essential` / `Professional` / `Enterprise` | `name` |
| Monthly price | `monthly` | `price_monthly` |
| Annual price | computed `monthly × 12 × 0.85` | `price_annual` |
| Student cap | `audience` copy | `max_students` (null = unlimited) |
| Staff cap | — | `max_staff` (null = unlimited) |
| Feature gates | `features[]` (display) | `features` jsonb (enforced via `isFeatureEnabled`, 7E) |

> ⚠️ **When prices change:** update `PricingSection.tsx` **and** add a new
> migration that updates `subscription_plans` (do not edit historical
> migrations). Then update this file's tables and the `Last updated` date.

---

## 4. Billing Mechanics (Phase 7E — already shipped)

- Plans, subscriptions and invoices live in `subscription_plans` /
  `institution_subscriptions` / `subscription_invoices` with RLS (SUPER_ADMIN
  manages; an institution admin reads only its own).
- MRR/ARR computed in the billing lib (paying-only; annual amortised to monthly).
- Feature gating via `isFeatureEnabled()` (default-allow today; middleware-level
  hard gating is a tracked deferral).
- **Razorpay recurring auto-charge is deferred** — invoicing is manual for v1.0
  (documented in the deferred register). Trials and tier assignment work today.

---

## 5. Notes & Deferrals

- **GST:** prices are quoted **+ GST**; invoice-time tax handling is manual for v1.0.
- **Currency:** INR only for v1.0. Per-institution currency/locale scaffolding
  exists (Arch A6) but public pricing is single-currency until a global GTM motion
  is funded.
- **Enterprise baseline (₹49,999/mo)** is an internal MRR-estimation placeholder,
  **not** a public number — the page shows "Custom Pricing".

---

*Phase 9A · Pricing Strategy — makes Aura Campus sellable. Mirrors the public
pricing page and the 7E billing catalog.*
