# Branding — Colours

## Purpose

The verified colour system as implemented, so UI and marketing stay consistent. Values are taken directly from [src/app/globals.css](../../src/app/globals.css) and the landing components.

## Current State

A **violet/purple primary** over a **slate neutral** scale, with a semantic token system that flips for dark mode (class-based, `.dark`).

## Implementation

### Primary — Violet / Purple
| Use | Value |
|---|---|
| Primary (brand purple) | `#7C3AED` (violet-600) |
| Primary hover / deep | `#6D28D9` (violet-700) |
| Primary light accent | `#8B5CF6` (violet-500) |
| Scrollbar thumb | `rgba(139,92,246,0.55)` → hover `rgba(124,58,237,0.85)` |
| Purple accent gradient (Tech strip) | `linear-gradient(135deg,#7C3AED 0%,#6D28D9 50%,#5B21B6 100%)` |
| CTA gradient | `linear-gradient(135deg,#6D28D9 0%,#581C87 55%,#4C1D95 100%)` |
| Stat-counter band | `linear-gradient(100deg,#7C3AED,#6D28D9,#7C3AED)` |

### Neutral — Slate (semantic tokens, light mode)
| Token | Value |
|---|---|
| `--color-page-bg` | `#f8fafc` (slate-50) |
| `--color-surface` | `#ffffff` |
| `--color-surface-2` | `#f8fafc` |
| `--color-surface-3` | `#f1f5f9` |
| `--color-border` | `#e2e8f0` (slate-200) |
| `--color-text-1/2/3` | `#0f172a` / `#475569` / `#94a3b8` |

### Neutral — Slate (dark mode tokens)
| Token | Value |
|---|---|
| `--color-page-bg` | `#0a0f1d` |
| `--color-surface` | `#1e293b` (slate-800) |
| `--color-surface-2` | `#0f172a` (slate-900) |
| `--color-border` | `#334155` (slate-700) |
| `--color-text-1/2/3` | `#f1f5f9` / `#94a3b8` / `#64748b` |

### Semantic accents (used in product UI)
- Success: emerald · Info: blue/cyan/sky · Warning: amber · Danger: rose/red · plus per-domain accents (teal, fuchsia, indigo). These appear as Tailwind palette colors across components.

### Rules
- **Derive UI colours from the semantic tokens**, not hard-coded hex, so dark mode flips automatically.
- The global dark override flattens `bg-gradient-to-br` (only); landing gradients use `bg-gradient-to-b` or inline styles to stay intact.
- Brand purple gradients use inline `style` so the dark override can't flatten them.

## Future Roadmap

- Extract tokens into a shared `@aura/ui` theme package (monorepo plan).
- Publish exact hex swatches/contrast ratios for accessibility (WCAG AA) verification.

## Related Documents

- [Brand Guidelines](Brand Guidelines.md) · [Typography](Typography.md) · [globals.css](../../src/app/globals.css) · [Coding Standards](../developer/Coding Standards.md)

## Last Updated

2026-06-29

## Owner

Design / Brand
