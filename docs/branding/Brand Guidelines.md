# Branding — Brand Guidelines

## Purpose

The umbrella brand reference for Aura, tying together colour, typography, logo, naming, and voice. Documents the **current** brand as implemented; deeper specifics live in the sibling files.

## Current State

The brand is expressed today primarily through the **Aura Campus** web app and its marketing landing page: a violet/purple identity over slate neutrals, Geist typography, glassmorphism surfaces, and a confident, outcome-focused voice. The pre-existing `docs/AURA/AURA_BRAND_GUIDELINES.md` is a placeholder; this set is derived from the actual implementation.

## Implementation

### Identity at a glance
- **Name / wordmark:** "AURA" (heavy weight). Umbrella brand: **Aura**; shared layer: **Aura Platform / Aura Core**. See [Product Naming](Product Naming.md).
- **Primary colour:** violet/purple (`#7C3AED` / `#6D28D9` / `#8B5CF6`) over slate neutrals; semantic token system with class-based dark mode. See [Colours](Colours.md).
- **Typography:** Geist Sans (UI) + Geist Mono (code); heavy `font-black` headings, uppercase tracked eyebrows. See [Typography](Typography.md).
- **Logo:** `Building2` glyph in a purple rounded square + "AURA" wordmark (composed in code; no standalone asset yet). See [Logo Usage](Logo Usage.md).
- **Voice:** confident, plain, outcome-focused; honest numbers; calm trust statements. See [Voice & Tone](Voice & Tone.md).

### Visual language
- **Glassmorphism + gradients:** translucent cards, soft glows, and violet gradient "accent strips" (Stat counter, Tech stack, CTA) punctuating an alternating light/dark section rhythm on the landing page.
- **Surfaces** derive from tokens so light/dark flips automatically; brand gradients use inline styles to survive the dark `bg-gradient-to-br` override.
- **Components:** right-sliding drawers for forms/modals; `w-full` dashboard layouts for institution pages (see [Coding Standards](../developer/Coding Standards.md)).

## Future Roadmap

- Replace the placeholder `AURA/AURA_BRAND_GUIDELINES.md` once a formal brand system (logo assets, type scale, spacing, motion) is produced.
- Consolidate tokens + components into a shared `@aura/ui` design system as products multiply.

## Related Documents

- [Colours](Colours.md) · [Typography](Typography.md) · [Logo Usage](Logo Usage.md) · [Product Naming](Product Naming.md) · [Voice & Tone](Voice & Tone.md) · [UX Philosophy](../company/UX Philosophy.md)

## Last Updated

2026-06-29

## Owner

Design / Brand
