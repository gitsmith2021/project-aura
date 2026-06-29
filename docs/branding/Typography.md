# Branding — Typography

## Purpose

Document the typefaces and type conventions as implemented.

## Current State

Two Google fonts loaded via `next/font/google` in [src/app/layout.tsx](../../src/app/layout.tsx) and wired to Tailwind in [globals.css](../../src/app/globals.css).

## Implementation

### Typefaces
| Role | Font | Variable |
|---|---|---|
| Primary / UI | **Geist Sans** | `--font-geist-sans` → `--font-sans` |
| Monospace / code | **Geist Mono** | `--font-geist-mono` → `--font-mono` |

- `body` uses `var(--font-geist-sans)`; `html` carries both font variables + `antialiased`.
- Latin subset; loaded and self-hosted by Next.js font optimisation.

### Type conventions (observed in components)
- **Headings:** very heavy weight (`font-black`), tight tracking (`tracking-tight`), large responsive sizes (e.g. `text-3xl sm:text-4xl md:text-5xl`).
- **Eyebrows/labels:** `text-[11px] font-bold uppercase tracking-widest`, usually in brand violet.
- **Body:** `text-sm`/`text-base`, `text-slate-*` tokens, relaxed leading.
- **Gradient text:** key phrases use `bg-gradient-to-r … bg-clip-text text-transparent` with violet→cyan/pink/fuchsia.

## Future Roadmap

- Define an explicit type scale (sizes, weights, line-heights) in a shared `@aura/ui` theme.
- Document accessibility minimums (body size, contrast).

## Related Documents

- [Brand Guidelines](Brand Guidelines.md) · [Colours](Colours.md) · [layout.tsx](../../src/app/layout.tsx)

## Last Updated

2026-06-29

## Owner

Design / Brand
