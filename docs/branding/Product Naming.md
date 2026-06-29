# Branding — Product Naming

## Purpose

The canonical names for products and shared services, and how to write them, so docs/UI/marketing stay consistent.

## Current State

Names are defined across the ecosystem docs ([AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md), [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md), `AURA/AURA_MASTER_GLOSSARY.md`, `AURA/AURA_PRODUCT_PORTFOLIO.md`). The wordmark in the app is "AURA".

## Implementation

### The umbrella
- **Aura** — the company/ecosystem. Stylised in-product as the **"AURA"** wordmark.
- **Aura Platform** (a.k.a. **Aura Core**) — the shared, product-agnostic foundation that every product consumes. *Not* a product itself.

> "Aura Infinity" appears in the documentation-architect brief but is **not** an established name in the repository (`TODO — Requires Manual Verification`). Until ratified, prefer **Aura** / **Aura Platform**.

### Products (verticals)
| Name | What it is | Status |
|---|---|---|
| **Aura Campus** | Education ERP (the current app) | Active |
| **Aura Build** | Construction / project execution | Planned |
| **Aura Field** | Field service management | Planned |
| **Aura Vision** | Operational intelligence (CCTV/GPS/drone/AI) — product *and* a Platform service | Planned |

### Shared services (the Nine Aura Core Services)
**Aura Identity · Aura Connect · Aura Docs · Aura Flow · Aura Insights · Aura Audit · Aura AI · Aura Mobile · Aura Vision.**

### Naming rules
- Always "**Aura <Thing>**" (e.g. "Aura Identity"), never "Campus Auth" or product-prefixed service names — services are named at the Aura level.
- A Core service name must carry **no domain noun** ("student", "hostel", "site"). Domain language stays in the product.
- Product front-door title (verified in `layout.tsx`): **"AURA — Academic ERP for Educational Institutions"**; page title template `"%s | AURA"`.

## Future Roadmap

- Ratify or retire "Aura Infinity" and record the decision here.
- Maintain the authoritative term list in `AURA/AURA_MASTER_GLOSSARY.md` and link it.

## Related Documents

- [AURA_ECOSYSTEM_VISION.md](../AURA/AURA_ECOSYSTEM_VISION.md) · [AURA_CORE_ARCHITECTURE.md](../AURA_CORE/AURA_CORE_ARCHITECTURE.md) · `AURA/AURA_MASTER_GLOSSARY.md` · [Brand Guidelines](Brand Guidelines.md)

## Last Updated

2026-06-29

## Owner

Design / Brand
