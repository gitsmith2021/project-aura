# Branding — Logo Usage

## Purpose

Document the logo lockup as it exists in the product so it is used consistently.

## Current State

There is **no standalone logo asset file** committed (no dedicated SVG/PNG logomark verified in the repo). The logo is currently a **composed lockup in code** plus a `favicon.ico`.

## Implementation

### The lockup (verified in the app)
- **Logomark:** the `Building2` icon (lucide-react) reversed in white, inside a **purple rounded square** (`bg-purple-600`, `rounded-lg`, subtle violet ring/shadow). Verified in the sidebar/navbar logo blocks (`src/components/layout/Sidebar.tsx`, `src/components/landing/Navbar.tsx`).
- **Wordmark:** **"AURA"** in heavy weight, white-on-dark in the sidebar; tracking-tight.
- **Sub-label (contextual):** small uppercase tags like "Staff Portal" / "HOD Panel" appear beneath the wordmark by role.
- **Favicon:** `src/app/favicon.ico`.
- **Open Graph image:** not verified in repo (`twitter.card = summary_large_image` is declared but no OG asset confirmed) — `TODO — Requires Manual Verification`.

### Usage rules (current practice)
- Keep the logomark in the **purple square**; logomark glyph stays white.
- Pair with the "AURA" wordmark in heavy weight; maintain clear space around the lockup.
- On dark surfaces the wordmark is white; on light surfaces use slate-900 (follow the active theme tokens).

## Future Roadmap

- Produce a proper vector logo asset set (logomark, full lockup, monochrome, favicon/OG) and store under a versioned `brand/` or `public/` path.
- Define minimum size, clear-space, and misuse rules once a formal mark exists.
- Centralise in `@aura/ui` so all products share one lockup.

## Related Documents

- [Brand Guidelines](Brand Guidelines.md) · [Colours](Colours.md) · [Typography](Typography.md)

## Last Updated

2026-06-29

## Owner

Design / Brand
